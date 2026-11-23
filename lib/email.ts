// Emails sent when a client signs the onboarding (Resend, plain fetch, edge-safe).
//
//  1. Client welcome  -> the client's email, PDF of the signed intake attached:
//     form received, official received date, campaign start date (Section 08).
//  2. Report copy     -> report@gershonconsulting.com (PDF attached, all answers).
//  3. Onboarding task -> Aina (ainarama@gershonconsulting.com): create the
//     onboarding process for this client (PDF attached).
//
// Sender: gershon.ai is the only domain verified in Resend, so the sender is
// always @gershon.ai. GERSHON_NOTIFY_FROM is honoured only if it is @gershon.ai
// (the old default onboarding@form.gershoncrm.com is not verified and fails).
//
// Env: RESEND_API_KEY (Cloudflare Pages -> gershon-form -> Settings -> Variables).

import { ACK_LABELS, displayValue } from "./pdf";

export const INTAKE_REPORT_TO = "report@gershonconsulting.com";
export const ONBOARDING_OWNER_TO = "ainarama@gershonconsulting.com";
export const REPLY_TO = "olivier@gershonconsulting.com";
const DEFAULT_FROM = "Gershon Consulting <welcome@gershon.ai>";

type Signature = { name: string; date: string };
export type Attachment = { filename: string; content: string }; // base64

type IntakeArgs = {
  receiptId: string;
  responses: Record<string, any>;
  acknowledgments: Record<string, boolean>;
  termsAccepted: boolean;
  signature: Signature;
  receivedOn: string; // YYYY-MM-DD
  pdf?: Attachment;
  savedToAirtable?: boolean;
  airtableError?: string;
};

const esc = (s: any) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function envVar(name: string): string | undefined {
  return typeof process !== "undefined" ? process.env[name] : undefined;
}

function sender(): string {
  const f = envVar("GERSHON_NOTIFY_FROM");
  return f && /@gershon\.ai>?\s*$/i.test(f.trim()) ? f : DEFAULT_FROM;
}

export function hasEmailKey(): boolean {
  return !!envVar("RESEND_API_KEY");
}

// "2026-12-01" -> "December 1, 2026"; anything else is returned unchanged.
export function prettyDate(v: any): string {
  const s = String(v ?? "").trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return s || "to be confirmed";
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}

export async function sendEmail(args: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: Attachment[];
  replyTo?: string;
}): Promise<void> {
  const apiKey = envVar("RESEND_API_KEY");
  if (!apiKey) throw new Error("RESEND_API_KEY not set");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: sender(),
      to: Array.isArray(args.to) ? args.to : [args.to],
      reply_to: args.replyTo || REPLY_TO,
      subject: args.subject,
      html: args.html,
      text: args.text,
      attachments: args.attachments?.length ? args.attachments : undefined,
    }),
  });
  if (!res.ok) throw new Error(`Resend API ${res.status}: ${await res.text()}`);
}

const shell = (inner: string) => `<!doctype html><html><body style="margin:0;background:#F9FAFB">
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1D1D1F;max-width:620px;margin:0 auto;padding:28px 24px">
  <div style="border-bottom:3px solid #FE1B04;padding-bottom:12px;margin-bottom:22px">
    <div style="font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#6E6E73;font-weight:600">Gershon Consulting</div>
  </div>
  ${inner}
  <div style="margin-top:28px;padding-top:14px;border-top:1px solid #E5E7EB;font-size:11px;color:#6E6E73">Gershon Consulting LLC · welcome.gershon.ai</div>
</div></body></html>`;

// ---------------------------------------------------------------- 1. client
export async function sendClientWelcome(args: IntakeArgs): Promise<boolean> {
  const to = String(args.responses.email || "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return false;
  const first = args.responses.firstName || args.signature.name.split(" ")[0] || "";
  const company = args.responses.companyName || "your company";
  const received = prettyDate(args.receivedOn);
  const start = prettyDate(args.responses.startDate);

  const html = shell(`
  <h2 style="margin:0 0 16px;font-size:24px;font-weight:800;letter-spacing:-.02em">Welcome to Gershon Consulting${first ? `, ${esc(first)}` : ""}.</h2>
  <p style="font-size:15px;line-height:1.6;margin:0 0 14px">Thank you for completing your onboarding. We have received your signed intake form for <strong>${esc(company)}</strong>.</p>
  <table style="border-collapse:collapse;margin:18px 0;font-size:14px;background:#FFFFFF;border:1px solid #E5E7EB;border-radius:12px">
    <tr><td style="padding:12px 18px;color:#6E6E73">Form received (official date)</td><td style="padding:12px 18px;font-weight:700">${esc(received)}</td></tr>
    <tr><td style="padding:12px 18px;color:#6E6E73;border-top:1px solid #E5E7EB">Campaign start date</td><td style="padding:12px 18px;font-weight:700;border-top:1px solid #E5E7EB;color:#FE1B04">${esc(start)}</td></tr>
  </table>
  <p style="font-size:15px;line-height:1.6;margin:0 0 14px">A copy of your signed onboarding form is attached as a PDF for your records.</p>
  <p style="font-size:15px;line-height:1.6;margin:0 0 14px">Our team is now setting up your campaign and will contact you shortly to confirm kickoff and schedule your weekly update call.</p>
  <p style="font-size:15px;line-height:1.6;margin:22px 0 0">Welcome aboard,<br><strong>Olivier Attia</strong><br><span style="color:#6E6E73">Managing Director, Gershon Consulting</span></p>`);

  const text = [
    `Welcome to Gershon Consulting${first ? `, ${first}` : ""}.`,
    ``,
    `Thank you for completing your onboarding. We have received your signed intake form for ${company}.`,
    ``,
    `Form received (official date): ${received}`,
    `Campaign start date: ${start}`,
    ``,
    `A copy of your signed onboarding form is attached as a PDF for your records.`,
    `Our team is now setting up your campaign and will contact you shortly to confirm kickoff and schedule your weekly update call.`,
    ``,
    `Welcome aboard,`,
    `Olivier Attia`,
    `Managing Director, Gershon Consulting`,
  ].join("\n");

  await sendEmail({
    to,
    subject: `Welcome to Gershon Consulting — onboarding received (${company})`,
    html,
    text,
    attachments: args.pdf ? [args.pdf] : undefined,
  });
  return true;
}

// ------------------------------------------------------- 2. report@ copy
function answersTable(responses: Record<string, any>): { html: string; text: string } {
  const entries = Object.entries(responses)
    .map(([k, v]) => [k, displayValue(k, v)] as const)
    .filter(([, v]) => v);
  return {
    html: entries
      .map(([k, v]) => `<tr><td style="font-family:Menlo,monospace;font-size:11px;color:#6E6E73;padding:6px 12px 6px 0;vertical-align:top;width:34%">${esc(k)}</td><td style="padding:6px 0;font-size:13px;vertical-align:top;white-space:pre-wrap">${esc(v)}</td></tr>`)
      .join(""),
    text: entries.map(([k, v]) => `- ${k}: ${v}`).join("\n"),
  };
}

export async function sendIntakeNotification(args: IntakeArgs): Promise<void> {
  const r = args.responses;
  const company = r.companyName || "Unknown company";
  const answers = answersTable(r);
  const acks = ACK_LABELS.map(([id, l]) => `${args.acknowledgments?.[id] ? "Yes" : "NO"} — ${l}`);
  const warn = args.savedToAirtable
    ? ""
    : `<div style="background:#fff5f5;border:1px solid #FE1B04;border-radius:10px;padding:12px 14px;margin-bottom:16px;font-size:13px"><strong style="color:#FE1B04">Not saved in Airtable.</strong> This email is the only copy. Error: ${esc(args.airtableError || "unknown")}</div>`;

  const html = shell(`
  ${warn}
  <h2 style="margin:0 0 14px;font-size:22px;font-weight:800">New signed intake — <span style="color:#FE1B04">${esc(company)}</span></h2>
  <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:16px">
    <tr><td style="color:#6E6E73;width:34%">Client</td><td>${esc([r.firstName, r.lastName].filter(Boolean).join(" "))} · ${esc(r.email)}</td></tr>
    <tr><td style="color:#6E6E73">Signed by</td><td><strong>${esc(args.signature.name)}</strong> on ${esc(args.signature.date)}</td></tr>
    <tr><td style="color:#6E6E73">Form received</td><td>${esc(prettyDate(args.receivedOn))}</td></tr>
    <tr><td style="color:#6E6E73">Campaign start</td><td><strong>${esc(prettyDate(r.startDate))}</strong></td></tr>
    <tr><td style="color:#6E6E73">Terms accepted</td><td>${args.termsAccepted ? "Yes" : "No"}</td></tr>
    <tr><td style="color:#6E6E73">Receipt</td><td style="font-family:Menlo,monospace;font-size:11px">${esc(args.receiptId)}</td></tr>
  </table>
  <div style="font-size:12px;margin-bottom:14px">${acks.map(esc).join("<br>")}</div>
  <div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#FE1B04;font-weight:700;margin:18px 0 8px">All answers</div>
  <table style="width:100%;border-collapse:collapse">${answers.html}</table>`);

  const text = [
    args.savedToAirtable ? "" : `!! NOT saved in Airtable — this email is the only copy. Error: ${args.airtableError}\n`,
    `New signed intake — ${company}`,
    `Signed by ${args.signature.name} on ${args.signature.date}`,
    `Form received: ${prettyDate(args.receivedOn)} · Campaign start: ${prettyDate(r.startDate)}`,
    `Receipt: ${args.receiptId}`,
    ``,
    ...acks,
    ``,
    answers.text,
  ].join("\n");

  await sendEmail({
    to: INTAKE_REPORT_TO,
    subject: `Onboarding signed · ${company}${args.savedToAirtable ? "" : " · NOT SAVED IN AIRTABLE"}`,
    html,
    text,
    attachments: args.pdf ? [args.pdf] : undefined,
  });
}

// ------------------------------------------------------------ 3. Aina
export async function sendOnboardingTask(args: IntakeArgs): Promise<void> {
  const r = args.responses;
  const company = r.companyName || "New client";
  const contact = [r.firstName, r.lastName].filter(Boolean).join(" ") || args.signature.name;
  const start = prettyDate(r.startDate);

  const html = shell(`
  <p style="font-size:15px;line-height:1.6;margin:0 0 14px">Hi Aina,</p>
  <p style="font-size:15px;line-height:1.6;margin:0 0 14px"><strong>${esc(company)}</strong> just signed their onboarding form. Please create the onboarding process for this new client.</p>
  <table style="border-collapse:collapse;margin:14px 0;font-size:14px">
    <tr><td style="padding:4px 16px 4px 0;color:#6E6E73">Contact</td><td>${esc(contact)}${r.title ? `, ${esc(r.title)}` : ""}</td></tr>
    <tr><td style="padding:4px 16px 4px 0;color:#6E6E73">Email</td><td>${esc(r.email)}</td></tr>
    <tr><td style="padding:4px 16px 4px 0;color:#6E6E73">Phone</td><td>${esc(r.mobilePhone)}</td></tr>
    <tr><td style="padding:4px 16px 4px 0;color:#6E6E73">Website</td><td>${esc(r.website)}</td></tr>
    <tr><td style="padding:4px 16px 4px 0;color:#6E6E73">Form received</td><td>${esc(prettyDate(args.receivedOn))}</td></tr>
    <tr><td style="padding:4px 16px 4px 0;color:#6E6E73">Campaign start</td><td><strong style="color:#FE1B04">${esc(start)}</strong></td></tr>
    <tr><td style="padding:4px 16px 4px 0;color:#6E6E73">Quote</td><td>${esc(r.quoteReference)}</td></tr>
  </table>
  <p style="font-size:15px;line-height:1.6;margin:0 0 14px">The full signed form is attached as a PDF${args.savedToAirtable ? " and saved in Airtable (Gershon Onboarding › Submissions)" : ""}.</p>
  <p style="font-size:15px;line-height:1.6;margin:0">Thank you,<br>Olivier</p>`);

  const text = [
    `Hi Aina,`,
    ``,
    `${company} just signed their onboarding form. Please create the onboarding process for this new client.`,
    ``,
    `Contact: ${contact}${r.title ? `, ${r.title}` : ""}`,
    `Email: ${r.email || ""}`,
    `Phone: ${r.mobilePhone || ""}`,
    `Website: ${r.website || ""}`,
    `Form received: ${prettyDate(args.receivedOn)}`,
    `Campaign start: ${start}`,
    `Quote: ${r.quoteReference || ""}`,
    ``,
    `The full signed form is attached as a PDF.`,
    ``,
    `Thank you,`,
    `Olivier`,
  ].join("\n");

  await sendEmail({
    to: ONBOARDING_OWNER_TO,
    subject: `New client to onboard: ${company} — starts ${start}`,
    html,
    text,
    attachments: args.pdf ? [args.pdf] : undefined,
  });
}
