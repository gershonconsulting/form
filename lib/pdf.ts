import { PDFDocument, rgb, StandardFonts, PDFFont, PDFPage } from 'pdf-lib';

// Signed-intake PDF: attached to the client welcome email, the report@ copy and
// the note to Aina. Built server-side (edge runtime, pure JS) at submit time.
// Field list mirrors SECTIONS in components/GershonOnboarding.tsx (v0.4.x).

type Responses = Record<string, any>;

export const SECRET_FIELDS = new Set(['twitterCredentials']);

const SECTIONS: { title: string; fields: [string, string][] }[] = [
  { title: '01 - About You', fields: [
    ['companyName', 'Company name'], ['firstName', 'First name'], ['lastName', 'Last name'],
    ['title', 'Title'], ['email', 'Email'], ['mobilePhone', 'Mobile phone'],
  ]},
  { title: '02 - Your Business', fields: [
    ['businessType', 'Type of business'], ['industry', 'Industry'], ['expectations', 'Expectations for this campaign'],
    ['productLinks', 'Product/service page links'], ['website', 'Website'],
  ]},
  { title: '03 - Campaign Scope', fields: [
    ['campaignDuration', 'Campaign duration'],
  ]},
  { title: '04 - Prospects', fields: [
    ['targetLocations', 'Prospect location'], ['targetDefinition', 'Prospect definition'],
    ['targetIndustries', 'Prospect industries'], ['targetTitles', 'Prospect job titles (ICP)'],
    ['initialTemplate', 'Current pitch to new prospects'], ['idealLinkedInLeads', '5 LinkedIn links of existing clients'],
    ['targetHeadcount', 'Prospect headcount range'], ['targetRevenue', 'Prospect revenue range'],
  ]},
  { title: '05 - Social Networks (PROMOTE)', fields: [
    ['top5Highlights', 'Top 5 things to highlight'], ['otherContent', 'Other content to include'],
    ['dontWantContent', 'Content NOT wanted'], ['twitterHashtags', 'Twitter hashtags'],
    ['competitorTwitterAccounts', 'Competitor Twitter accounts'], ['googleKeywords', 'Google keywords'],
    ['photosLink', 'Photos link'], ['royaltyFreeConsent', 'Royalty-free photos consent'],
    ['linkedInPageAdmin', 'LinkedIn Page admin added'], ['facebookPageAdmin', 'Facebook Page admin added'],
    ['googleBusinessAdmin', 'Google Business admin added'], ['twitterCredentials', 'Twitter login'],
  ]},
  { title: '06 - LinkedIn Profile (NETWORK)', fields: [
    ['companyLinkedIn', 'Company LinkedIn page'], ['personalLinkedIn', 'Personal LinkedIn page'],
    ['salesNavActive', 'Sales Navigator activated'], ['calendlyLink', 'Calendly link'],
    ['competitors', 'Top 5 competitors'],
  ]},
  { title: '07 - Comments', fields: [['additionalComments', 'Additional comments']] },
  { title: '08 - Timing & Quote', fields: [['startDate', 'Campaign start date'], ['quoteReference', 'Validated quote']] },
];

export const ACK_LABELS: [string, string][] = [
  ['ack_3month', 'Minimum 3-month engagement'],
  ['ack_notice', 'After 3 months, stop any time with one-month notice'],
  ['ack_weekly', 'Weekly update call at a fixed time'],
  ['ack_payment', 'Invoices due at start of month; 2%/month late fee'],
];

function pretty(v: any): string {
  const m = String(v ?? '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return String(v ?? '').trim() || '-';
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

export function displayValue(id: string, v: any): string {
  if (v === undefined || v === null || String(v).trim() === '') return '';
  if (SECRET_FIELDS.has(id)) return 'Provided (kept private, not reproduced here)';
  if (Array.isArray(v)) return v.join(', ');
  return String(v);
}

// Helvetica (WinAnsi) cannot encode every character; swap the common ones and
// replace anything else so one odd character never breaks the whole PDF.
function clean(s: string, font: PDFFont): string {
  const mapped = s
    .replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-').replace(/…/g, '...')
    .replace(/[→➜➡]/g, '->').replace(/\t/g, ' ');
  let out = '';
  for (const ch of mapped) {
    try { font.encodeText(ch); out += ch; } catch { out += '?'; }
  }
  return out;
}

export async function generateOnboardingPDF(
  responses: Responses,
  meta: {
    signature?: { name: string; date: string };
    acknowledgments?: Record<string, boolean>;
    termsAccepted?: boolean;
    receiptId?: string;
    receivedOn?: string;
  } = {},
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Gershon Consulting - Onboarding - ${responses.companyName || 'Client'}`);
  doc.setAuthor('Gershon Consulting');
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const reg = await doc.embedFont(StandardFonts.Helvetica);

  const W = 595, H = 842, M = 50, CW = W - M * 2;
  const red = rgb(0.996, 0.106, 0.016);
  const ink = rgb(0.114, 0.114, 0.122);
  const gray = rgb(0.43, 0.43, 0.45);
  const rule = rgb(0.9, 0.91, 0.92);
  const white = rgb(1, 1, 1);

  let page: PDFPage = doc.addPage([W, H]);
  let y = H - M;

  const ensure = (need: number) => {
    if (y - need < M + 30) { page = doc.addPage([W, H]); y = H - M; }
  };

  const wrap = (text: string, font: PDFFont, size: number, maxW: number): string[] => {
    const lines: string[] = [];
    for (const raw of text.split(/\r?\n/)) {
      const words = clean(raw, font).split(' ');
      let line = '';
      for (const w of words) {
        const t = line ? `${line} ${w}` : w;
        if (font.widthOfTextAtSize(t, size) > maxW && line) { lines.push(line); line = w; }
        else line = t;
      }
      lines.push(line);
    }
    return lines;
  };

  const para = (text: string, opts: { font?: PDFFont; size?: number; color?: any; x?: number; maxW?: number } = {}) => {
    const font = opts.font || reg, size = opts.size || 9.5, x = opts.x ?? M, maxW = opts.maxW ?? CW;
    for (const l of wrap(text, font, size, maxW)) {
      ensure(size + 4);
      page.drawText(l, { x, y, size, font, color: opts.color || ink });
      y -= size + 3.5;
    }
  };

  // Header band
  page.drawRectangle({ x: 0, y: H - 96, width: W, height: 96, color: red });
  page.drawText('GERSHON CONSULTING', { x: M, y: H - 44, size: 18, font: bold, color: white });
  page.drawText('Client Onboarding - Signed Intake', { x: M, y: H - 66, size: 11, font: reg, color: white });
  const company = clean(String(responses.companyName || 'Client'), reg);
  page.drawText(company, { x: M, y: H - 84, size: 9, font: reg, color: white });
  y = H - 120;

  const receivedOn = meta.receivedOn || new Date().toISOString().slice(0, 10);
  para(`Form received: ${pretty(receivedOn)}    Campaign start date: ${pretty(responses.startDate)}`, { font: bold, size: 10 });
  if (meta.receiptId) para(`Receipt: ${meta.receiptId}`, { size: 8.5, color: gray });
  y -= 10;

  const section = (title: string) => {
    ensure(40);
    page.drawRectangle({ x: M, y: y - 6, width: CW, height: 20, color: red });
    page.drawText(clean(title, bold), { x: M + 8, y: y, size: 10, font: bold, color: white });
    y -= 26;
  };

  for (const s of SECTIONS) {
    const rows = s.fields
      .map(([id, label]) => [label, displayValue(id, responses[id])] as const)
      .filter(([, v]) => v);
    if (!rows.length) continue;
    section(s.title);
    for (const [label, value] of rows) {
      ensure(28);
      page.drawText(clean(label, bold), { x: M, y, size: 8, font: bold, color: red });
      y -= 12;
      para(value, { x: M + 6, maxW: CW - 6 });
      y -= 3;
      page.drawLine({ start: { x: M, y: y + 2 }, end: { x: M + CW, y: y + 2 }, thickness: 0.4, color: rule });
      y -= 7;
    }
    y -= 6;
  }

  section('Acknowledgments & Signature');
  for (const [id, label] of ACK_LABELS) {
    para(`[${meta.acknowledgments?.[id] ? 'X' : ' '}] ${label}`);
  }
  para(`[${meta.termsAccepted ? 'X' : ' '}] Agreed to Gershon Consulting Terms of Service`);
  y -= 8;
  if (meta.signature) {
    para(`Signed by: ${meta.signature.name}`, { font: bold, size: 11 });
    para(`Signature date: ${meta.signature.date}`);
  }

  const pages = doc.getPages();
  pages.forEach((pg, i) => {
    pg.drawText(`Page ${i + 1} of ${pages.length}  |  Confidential - Gershon Consulting LLC`, {
      x: M, y: 22, size: 7, font: reg, color: gray,
    });
  });

  return doc.save();
}

export function toBase64(bytes: Uint8Array): string {
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}
