// Edge-compatible SMTP client using Cloudflare's TCP socket API (cloudflare:sockets)
// Works in Cloudflare Pages edge functions. Requires port 465 (SSL) on Hostinger SMTP.

declare module 'cloudflare:sockets' {
  export interface Socket {
    readable: ReadableStream<Uint8Array>;
    writable: WritableStream<Uint8Array>;
    close(): Promise<void>;
  }
  export function connect(
    address: { hostname: string; port: number },
    options?: { secureTransport?: 'on' | 'off' | 'starttls'; allowHalfOpen?: boolean }
  ): Socket;
}

class SmtpStream {
  private buf = '';
  private decoder = new TextDecoder();
  private reader: ReadableStreamDefaultReader<Uint8Array>;

  constructor(stream: ReadableStream<Uint8Array>) {
    this.reader = stream.getReader();
  }

  async readResponse(): Promise<{ code: number; text: string }> {
    while (true) {
      // A complete SMTP response ends with a line: "NNN text\r\n" (NNN = 3-digit code, space, not dash)
      const match = this.buf.match(/(\d{3}) [^\r]*\r\n/);
      if (match) {
        const code = parseInt(match[1], 10);
        const idx = this.buf.indexOf(match[0]) + match[0].length;
        const text = this.buf.slice(0, idx).trim();
        this.buf = this.buf.slice(idx);
        return { code, text };
      }
      const { done, value } = await this.reader.read();
      if (done) throw new Error('SMTP connection closed unexpectedly');
      this.buf += this.decoder.decode(value, { stream: true });
    }
  }
}

function b64(str: string): string {
  return btoa(unescape(encodeURIComponent(str)));
}

function escapeDot(body: string): string {
  // RFC 2821: lines starting with '.' must be doubled
  return body.replace(/^\./gm, '..');
}

function buildMimeMessage(opts: {
  from: string;
  fromName: string;
  to: string;
  cc?: string[];
  subject: string;
  html: string;
  pdfBytes?: Uint8Array;
  pdfFilename?: string;
}): string {
  const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const lines: string[] = [];

  lines.push(`From: ${opts.fromName} <${opts.from}>`);
  lines.push(`To: ${opts.to}`);
  if (opts.cc?.length) lines.push(`Cc: ${opts.cc.join(', ')}`);
  lines.push(`Subject: ${opts.subject}`);
  lines.push(`MIME-Version: 1.0`);

  if (opts.pdfBytes) {
    lines.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
    lines.push('');
    // HTML part
    lines.push(`--${boundary}`);
    lines.push('Content-Type: text/html; charset=UTF-8');
    lines.push('Content-Transfer-Encoding: quoted-printable');
    lines.push('');
    lines.push(opts.html);
    lines.push('');
    // PDF attachment
    lines.push(`--${boundary}`);
    lines.push(`Content-Type: application/pdf; name="${opts.pdfFilename ?? 'onboarding-summary.pdf'}"`);
    lines.push('Content-Transfer-Encoding: base64');
    lines.push(`Content-Disposition: attachment; filename="${opts.pdfFilename ?? 'onboarding-summary.pdf'}"`);
    lines.push('');
    // Base64 encode PDF in 76-char lines
    const b64pdf = btoa(String.fromCharCode(...opts.pdfBytes));
    for (let i = 0; i < b64pdf.length; i += 76) {
      lines.push(b64pdf.slice(i, i + 76));
    }
    lines.push('');
    lines.push(`--${boundary}--`);
  } else {
    lines.push('Content-Type: text/html; charset=UTF-8');
    lines.push('');
    lines.push(opts.html);
  }

  return lines.join('\r\n');
}

export interface SendEmailOptions {
  to: string;
  cc?: string[];
  subject: string;
  html: string;
  pdfBytes?: Uint8Array;
  pdfFilename?: string;
}

export async function sendEmail(opts: SendEmailOptions): Promise<void> {
  const smtpHost = process.env.SMTP_HOST ?? 'smtp.hostinger.com';
  const smtpPort = parseInt(process.env.SMTP_PORT ?? '465', 10);
  const smtpUser = process.env.SMTP_USER!;
  const smtpPass = process.env.SMTP_PASS!;
  const fromEmail = process.env.SMTP_FROM ?? 'sales@gershonconsulting.com';
  const fromName = 'Gershon Consulting';

  if (!smtpUser || !smtpPass) {
    console.warn('[email] SMTP_USER/SMTP_PASS not set — skipping email send');
    return;
  }

  // @ts-ignore — cloudflare:sockets is available at runtime in CF Workers/Pages
  const { connect } = await import('cloudflare:sockets');

  const socket = connect(
    { hostname: smtpHost, port: smtpPort },
    { secureTransport: 'on' } // Port 465 = implicit TLS
  );

  const stream = new SmtpStream(socket.readable);
  const writer = socket.writable.getWriter();
  const enc = new TextEncoder();
  const send = async (cmd: string) => writer.write(enc.encode(cmd + '\r\n'));

  try {
    // 220 greeting
    const greeting = await stream.readResponse();
    if (greeting.code !== 220) throw new Error(`Unexpected greeting: ${greeting.text}`);

    // EHLO
    await send('EHLO gershoncrm.com');
    let r = await stream.readResponse();
    if (r.code !== 250) throw new Error(`EHLO failed: ${r.text}`);

    // AUTH LOGIN
    await send('AUTH LOGIN');
    r = await stream.readResponse();
    if (r.code !== 334) throw new Error(`AUTH LOGIN failed: ${r.text}`);

    await send(b64(smtpUser));
    r = await stream.readResponse();
    if (r.code !== 334) throw new Error(`Username rejected: ${r.text}`);

    await send(b64(smtpPass));
    r = await stream.readResponse();
    if (r.code !== 235) throw new Error(`Auth failed: ${r.text}`);

    // MAIL FROM
    await send(`MAIL FROM:<${fromEmail}>`);
    r = await stream.readResponse();
    if (r.code !== 250) throw new Error(`MAIL FROM failed: ${r.text}`);

    // RCPT TO
    const recipients = [opts.to, ...(opts.cc ?? [])];
    for (const addr of recipients) {
      await send(`RCPT TO:<${addr}>`);
      r = await stream.readResponse();
      if (r.code !== 250) throw new Error(`RCPT TO <${addr}> failed: ${r.text}`);
    }

    // DATA
    await send('DATA');
    r = await stream.readResponse();
    if (r.code !== 354) throw new Error(`DATA failed: ${r.text}`);

    const message = buildMimeMessage({
      from: fromEmail,
      fromName,
      to: opts.to,
      cc: opts.cc,
      subject: opts.subject,
      html: opts.html,
      pdfBytes: opts.pdfBytes,
      pdfFilename: opts.pdfFilename,
    });

    await send(escapeDot(message));
    await send('.');
    r = await stream.readResponse();
    if (r.code !== 250) throw new Error(`Message rejected: ${r.text}`);

    await send('QUIT');
    await stream.readResponse();
  } finally {
    try { await socket.close(); } catch {}
  }
}

export function buildEmailHtml(responses: Record<string, any>, receiptId: string): string {
  const name = `${responses.firstName ?? ''} ${responses.lastName ?? ''}`.trim() || 'Client';
  const company = responses.companyName ?? '';
  const services = Array.isArray(responses.campaignServices)
    ? responses.campaignServices.join(', ')
    : responses.campaignServices ?? '—';

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Onboarding Summary</title></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:30px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
        <!-- Header -->
        <tr><td style="background:#0D1A40;padding:30px 40px;">
          <p style="margin:0;color:#ffffff;font-size:22px;font-weight:bold;letter-spacing:1px;">GERSHON CONSULTING</p>
          <p style="margin:6px 0 0;color:#C9A84C;font-size:13px;">Onboarding Confirmation</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:35px 40px;">
          <p style="color:#333;font-size:16px;margin:0 0 20px;">Hi <strong>${name}</strong>,</p>
          <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 25px;">
            Thank you for completing the onboarding form! Your summary PDF is attached. 
            Our team will review your information and be in touch shortly.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eee;border-radius:6px;margin-bottom:25px;">
            ${row('Receipt ID', `#${receiptId.slice(0, 8).toUpperCase()}`)}
            ${row('Company', company)}
            ${row('Services', services)}
            ${row('Start Date', responses.startDate ?? '—')}
            ${row('Campaign Duration', responses.campaignDuration ?? '—')}
          </table>
          <p style="color:#555;font-size:13px;line-height:1.6;margin:0 0 10px;">
            If you have any questions, reply to this email or contact us at 
            <a href="mailto:sales@gershonconsulting.com" style="color:#0D1A40;">sales@gershonconsulting.com</a>.
          </p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#f9f9f9;padding:20px 40px;border-top:1px solid #eee;">
          <p style="margin:0;color:#999;font-size:11px;">
            © ${new Date().getFullYear()} Gershon Consulting · 
            <a href="https://gershoncrm.com" style="color:#999;">gershoncrm.com</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function row(label: string, value: string): string {
  return `<tr>
    <td style="padding:10px 15px;font-size:12px;color:#777;border-bottom:1px solid #f0f0f0;width:40%;background:#fafafa;">${label}</td>
    <td style="padding:10px 15px;font-size:13px;color:#333;border-bottom:1px solid #f0f0f0;">${value}</td>
  </tr>`;
}
