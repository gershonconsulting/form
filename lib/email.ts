// Email notifications for Gershon Consulting onboarding submissions.
//
// Uses Resend (https://resend.com) via direct fetch — edge-runtime compatible, no SDK.
// All sends are env-gated; if RESEND_API_KEY isn't set, the helper logs and no-ops so
// existing deploys keep working until Olivier adds the key in Cloudflare Pages.
//
// Required env vars (set in Cloudflare Pages → Settings → Environment variables):
//   RESEND_API_KEY      — e.g. re_xxx...
//   GERSHON_NOTIFY_TO   — comma-separated recipients (defaults to "olivier@gershon.ai")
//   GERSHON_NOTIFY_FROM — sender, e.g. "GC Onboarding <onboarding@form.gershoncrm.com>"
//                        (the from-domain must be verified in Resend)

type Signature = { name: string; date: string };

type IntakeArgs = {
  receiptId: string;
  responses: Record<string, any>;
  acknowledgments: Record<string, boolean>;
  termsAccepted: boolean;
  signature: Signature;
};

const escapeHtml = (s: any) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function renderBody(args: IntakeArgs): { html: string; text: string } {
  const { responses, acknowledgments, termsAccepted, signature, receiptId } =
    args;
  const company = responses.companyName || "Unknown company";
  const ackList = Object.entries(acknowledgments)
    .map(([k, v]) => `  - ${k}: ${v ? "yes" : "no"}`)
    .join("\n");
  const rows = Object.entries(responses)
    .map(
      ([k, v]) =>
        `<tr><td style="font-family:Menlo,monospace;font-size:11px;color:#888;padding:6px 12px 6px 0;vertical-align:top;width:32%">${escapeHtml(k)}</td><td style="padding:6px 0;font-size:13px;vertical-align:top">${escapeHtml(Array.isArray(v) ? v.join(", ") : v)}</td></tr>`,
    )
    .join("");

  const text = [
    `New Gershon onboarding submission`,
    ``,
    `Company: ${company}`,
    `Signed by: ${signature.name} on ${signature.date}`,
    `Terms accepted: ${termsAccepted ? "yes" : "no"}`,
    `Receipt: ${receiptId}`,
    ``,
    `Acknowledgments:`,
    ackList,
    ``,
    `Responses:`,
    ...Object.entries(responses).map(
      ([k, v]) => `- ${k}: ${Array.isArray(v) ? v.join(", ") : v}`,
    ),
  ].join("\n");

  const html = `<!doctype html><html><body style="font-family:-apple-system,Inter,sans-serif;color:#1a1a1a;max-width:680px;margin:0 auto;padding:24px">
    <div style="border-bottom:3px solid #CC3333;padding-bottom:14px;margin-bottom:20px">
      <div style="font-family:Menlo,monospace;font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:#888">Gershon Consulting · Onboarding</div>
      <h2 style="margin:6px 0 0;font-weight:500;font-family:Georgia,serif">New intake from <em style="color:#CC3333">${escapeHtml(company)}</em></h2>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:18px">
      <tr><td style="color:#888;width:30%">Signed by</td><td><strong>${escapeHtml(signature.name)}</strong> on ${escapeHtml(signature.date)}</td></tr>
      <tr><td style="color:#888">Terms accepted</td><td>${termsAccepted ? "Yes" : "No"}</td></tr>
      <tr><td style="color:#888">Receipt ID</td><td style="font-family:Menlo,monospace;font-size:11px">${escapeHtml(receiptId)}</td></tr>
    </table>
    <div style="font-family:Menlo,monospace;font-size:10px;letter-spacing:.15em;text-transform:uppercase;color:#CC3333;margin:18px 0 8px">Captured responses</div>
    <table style="width:100%;border-collapse:collapse">${rows}</table>
    <div style="margin-top:24px;padding-top:14px;border-top:1px solid #eee;font-family:Menlo,monospace;font-size:10px;color:#888;letter-spacing:.1em;text-transform:uppercase">form.gershoncrm.com · stored in Supabase</div>
  </body></html>`;

  return { html, text };
}

export async function sendIntakeNotification(args: IntakeArgs): Promise<void> {
  // Read env. process.env works in the Cloudflare Pages edge runtime.
  const apiKey =
    typeof process !== "undefined" ? process.env.RESEND_API_KEY : undefined;
  if (!apiKey) {
    console.warn(
      "RESEND_API_KEY not set — skipping intake email notification.",
    );
    return;
  }
  const to = (
    (typeof process !== "undefined" && process.env.GERSHON_NOTIFY_TO) ||
    "olivier@gershon.ai"
  )
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const from =
    (typeof process !== "undefined" && process.env.GERSHON_NOTIFY_FROM) ||
    "GC Onboarding <onboarding@form.gershoncrm.com>";

  const { html, text } = renderBody(args);
  const subject = `Onboarding signed · ${args.responses.companyName || "Unknown"}`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html, text }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Resend API ${res.status}: ${errText}`);
  }
}

// Generic Resend send, used by app/api/save-progress (added 2026-10-22: the route
// imported `sendEmail` but it was never exported, so the build warned and the
// route threw at runtime). Same env vars as sendIntakeNotification.
export async function sendEmail(args: { to: string | string[]; subject: string; html: string; text?: string }): Promise<void> {
  const apiKey =
    typeof process !== "undefined" ? process.env.RESEND_API_KEY : undefined;
  if (!apiKey) throw new Error("RESEND_API_KEY not set");
  const from =
    (typeof process !== "undefined" && process.env.GERSHON_NOTIFY_FROM) ||
    "Onboarding <onboarding@form.gershoncrm.com>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: Array.isArray(args.to) ? args.to : [args.to], subject: args.subject, html: args.html, text: args.text }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Resend API ${res.status}: ${errText}`);
  }
}
