// Airtable data + attachment client (edge-runtime compatible, plain fetch, no SDK).
//
// Replaces the old Supabase Postgres + Storage stack. Every signed intake becomes
// a row in the "Submissions" table of the "Gershon Onboarding" base (app7zEt3FmwP8jMJj),
// and uploaded quote files land as native Airtable attachments on that same row.
//
// Required env (set in Cloudflare Pages → Settings → Environment Variables → production):
//   AIRTABLE_PAT      — Personal Access Token with data.records:read/write and data.recordComments (fine)
//   AIRTABLE_BASE_ID  — defaults to app7zEt3FmwP8jMJj
//   AIRTABLE_TABLE    — defaults to "Submissions"

const DEFAULT_BASE_ID = "app7zEt3FmwP8jMJj";
const DEFAULT_TABLE = "Submissions";

function env(name: string): string | undefined {
  return typeof process !== "undefined" ? process.env[name] : undefined;
}

export type SubmissionRow = {
  Company?: string;
  "Submitted at"?: string;
  Status?: string;
  "Signed by"?: string;
  "Signed on"?: string;
  "Terms accepted"?: boolean;
  "First name"?: string;
  "Last name"?: string;
  Title?: string;
  Email?: string;
  "Mobile phone"?: string;
  "Business type"?: string;
  Industry?: string;
  Expectations?: string;
  "Product links"?: string;
  Website?: string;
  "Campaign duration"?: string;
  Services?: string;
  "Meetings per month"?: string;
  "Target definition"?: string;
  "Target geography"?: string;
  "Target industries"?: string;
  "Target titles"?: string;
  "Target headcount"?: string;
  "Target revenue"?: string;
  "Top 5 highlights"?: string;
  "Other content"?: string;
  "Don't want content"?: string;
  "Twitter hashtags"?: string;
  "Competitor Twitter accounts"?: string;
  "Google keywords"?: string;
  "Photos link"?: string;
  "Royalty-free consent"?: string;
  "LinkedIn admin added"?: string;
  "Facebook admin added"?: string;
  "Google Business admin added"?: string;
  "Twitter credentials"?: string;
  "Company LinkedIn"?: string;
  "Personal LinkedIn"?: string;
  "Sales Navigator active"?: string;
  "Linalysis active"?: string;
  "Calendly link"?: string;
  "SSI scores"?: string;
  Competitors?: string;
  "Additional comments"?: string;
  "Start date"?: string;
  "Quote reference"?: string;
  "Ack: 3-month min"?: boolean;
  "Ack: notice period"?: boolean;
  "Ack: weekly call"?: boolean;
  "Ack: payment terms"?: boolean;
  "Session ID"?: string;
  IP?: string;
  "User agent"?: string;
  "Conversation transcript"?: string;
  [key: string]: any;
};

export type CreatedRecord = { id: string };

function requirePat(): string {
  const pat = env("AIRTABLE_PAT");
  if (!pat) {
    throw new Error(
      "AIRTABLE_PAT not set. Add it in Cloudflare Pages env vars.",
    );
  }
  return pat;
}

function baseId(): string {
  return env("AIRTABLE_BASE_ID") || DEFAULT_BASE_ID;
}

function tableName(): string {
  return env("AIRTABLE_TABLE") || DEFAULT_TABLE;
}

// Airtable rejects URL fields with malformed input (e.g. "yourcompany.com" with no
// scheme, or "linkedin.com/in/x"). Auto-prefix https:// when we can, drop the value
// if it's still nonsense — a missing URL is better than a rejected record.
function coerceUrl(v: any): string | undefined {
  if (v == null || v === "") return undefined;
  let s = String(v).trim();
  if (!s) return undefined;
  if (!/^https?:\/\//i.test(s)) s = "https://" + s;
  try {
    const u = new URL(s);
    if (!u.hostname.includes(".")) return undefined;
    return u.toString();
  } catch {
    return undefined;
  }
}

// Airtable email/phone fields don't strictly validate but they must be strings.
function coerceString(v: any): string | undefined {
  if (v == null || v === "") return undefined;
  return String(v).trim() || undefined;
}

// Map the raw responses object (field IDs are camelCase per SECTIONS) to Airtable
// column names. Also translates acknowledgment / signature / meta into columns.
export function toAirtableFields(payload: {
  responses: Record<string, any>;
  acknowledgments: Record<string, boolean>;
  termsAccepted: boolean;
  signature: { name: string; date: string };
  sessionId?: string;
  ip?: string;
  userAgent?: string;
  conversationTranscript?: any;
}): SubmissionRow {
  const r = payload.responses || {};
  const a = payload.acknowledgments || {};

  const s: SubmissionRow = {
    Company: coerceString(r.companyName),
    "Submitted at": new Date().toISOString(),
    Status: "New",
    "Signed by": coerceString(payload.signature?.name),
    "Signed on": coerceString(payload.signature?.date),
    "Terms accepted": !!payload.termsAccepted,
    "First name": coerceString(r.firstName),
    "Last name": coerceString(r.lastName),
    Title: coerceString(r.title),
    Email: coerceString(r.email),
    "Mobile phone": coerceString(r.mobilePhone),
    "Business type": coerceString(r.businessType),
    Industry: coerceString(r.industry),
    Expectations: coerceString(r.expectations),
    "Product links": coerceString(r.productLinks),
    Website: coerceUrl(r.website),
    "Campaign duration": coerceString(r.campaignDuration),
    Services: coerceString(r.campaignServices || r.services),
    "Meetings per month": coerceString(r.meetingsPerMonth),
    "Target definition": coerceString(r.targetDefinition),
    "Target geography": coerceString(r.targetGeography || r.targetLocations),
    "Target industries": coerceString(r.targetIndustries),
    "Target titles": coerceString(r.targetTitles),
    "Target headcount": coerceString(r.targetHeadcount),
    "Target revenue": coerceString(r.targetRevenue),
    "Top 5 highlights": coerceString(r.top5Highlights),
    "Other content": coerceString(r.otherContent),
    "Don't want content": coerceString(r.dontWantContent),
    "Twitter hashtags": coerceString(r.twitterHashtags),
    "Competitor Twitter accounts": coerceString(r.competitorTwitterAccounts),
    "Google keywords": coerceString(r.googleKeywords),
    "Photos link": coerceUrl(r.photosLink),
    "Royalty-free consent": coerceString(r.royaltyFreeConsent),
    "LinkedIn admin added": coerceString(r.linkedInPageAdmin),
    "Facebook admin added": coerceString(r.facebookPageAdmin),
    "Google Business admin added": coerceString(r.googleBusinessAdmin),
    "Twitter credentials": coerceString(r.twitterCredentials),
    "Company LinkedIn": coerceUrl(r.companyLinkedIn),
    "Personal LinkedIn": coerceUrl(r.personalLinkedIn),
    "Sales Navigator active": coerceString(r.salesNavActive),
    "Linalysis active": coerceString(r.linalysisActive),
    "Calendly link": coerceUrl(r.calendlyLink),
    "SSI scores": coerceString(r.ssiScores),
    Competitors: coerceString(r.competitors),
    "Additional comments": coerceString(r.additionalComments),
    "Start date": coerceString(r.startDate),
    "Quote reference": coerceString(r.quoteReference),
    "Ack: 3-month min": !!a.ack_3month,
    "Ack: notice period": !!a.ack_notice,
    "Ack: weekly call": !!a.ack_weekly,
    "Ack: payment terms": !!a.ack_payment,
    "Session ID": coerceString(payload.sessionId),
    IP: coerceString(payload.ip),
    "User agent": coerceString(payload.userAgent),
    "Conversation transcript": payload.conversationTranscript
      ? JSON.stringify(payload.conversationTranscript).slice(0, 100000)
      : undefined,
  };

  // Strip undefineds — Airtable doesn't like `"field": null` for typed fields.
  const clean: SubmissionRow = {};
  for (const [k, v] of Object.entries(s)) {
    if (v !== undefined) clean[k] = v as any;
  }
  return clean;
}

// Create the row. Returns the new record id.
export async function createSubmission(fields: SubmissionRow): Promise<CreatedRecord> {
  const url = `https://api.airtable.com/v0/${baseId()}/${encodeURIComponent(tableName())}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requirePat()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields, typecast: true }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Airtable create failed ${res.status}: ${err}`);
  }
  const data = (await res.json()) as { id: string };
  return { id: data.id };
}

// Upload a file as an attachment on an existing record. Uses Airtable's content
// endpoint. `fileBase64` must be raw base64 (no data: prefix).
export async function uploadAttachment(args: {
  recordId: string;
  fieldName?: string;
  filename: string;
  contentType: string;
  fileBase64: string;
}): Promise<void> {
  const field = args.fieldName || "Quote file";
  const url = `https://content.airtable.com/v0/${baseId()}/${args.recordId}/${encodeURIComponent(field)}/uploadAttachment`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requirePat()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contentType: args.contentType || "application/octet-stream",
      file: args.fileBase64,
      filename: args.filename,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Airtable attachment upload failed ${res.status}: ${err}`);
  }
}
