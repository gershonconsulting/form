import { NextRequest, NextResponse } from "next/server";
import {
  createSubmission,
  toAirtableFields,
  uploadAttachment,
} from "@/lib/airtable";
import {
  hasEmailKey,
  sendClientWelcome,
  sendIntakeNotification,
  sendOnboardingTask,
} from "@/lib/email";
import { generateOnboardingPDF, toBase64 } from "@/lib/pdf";

export const runtime = "edge";

// Signed submission handler.
//  1. Save the row in Airtable (Gershon Onboarding › Submissions) + quote file.
//  2. Build the signed-intake PDF.
//  3. Email: client welcome (PDF), report@ copy (PDF), Aina's onboarding task (PDF).
// A submission is never lost: if Airtable fails, the report@ email carries the
// full answers and is flagged "NOT SAVED IN AIRTABLE". The request only fails
// when neither Airtable nor the report@ email worked.
export async function POST(req: NextRequest) {
  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const {
    responses,
    acknowledgments,
    termsAccepted,
    signature,
    conversationTranscript,
    sessionId,
    quoteFile, // optional: { base64, filename, contentType }
  } = payload || {};

  if (
    !responses ||
    typeof responses !== "object" ||
    !acknowledgments ||
    typeof acknowledgments !== "object" ||
    typeof termsAccepted !== "boolean" ||
    !signature?.name ||
    !signature?.date
  ) {
    return NextResponse.json(
      { error: "incomplete submission payload" },
      { status: 400 },
    );
  }

  const ip =
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "";
  const userAgent = req.headers.get("user-agent") || "";
  const receivedOn = new Date().toISOString().slice(0, 10);

  // ---- 1. Airtable
  let receiptId = `GW-${Date.now().toString(36).toUpperCase()}`;
  let savedToAirtable = false;
  let airtableError: string | undefined;
  try {
    const created = await createSubmission(
      toAirtableFields({
        responses,
        acknowledgments,
        termsAccepted,
        signature,
        sessionId,
        ip,
        userAgent,
        conversationTranscript,
      }),
    );
    receiptId = created.id;
    savedToAirtable = true;

    if (quoteFile && typeof quoteFile.base64 === "string" && quoteFile.filename) {
      try {
        await uploadAttachment({
          recordId: created.id,
          filename: String(quoteFile.filename).slice(0, 120),
          contentType: quoteFile.contentType || "application/octet-stream",
          fileBase64: quoteFile.base64,
        });
      } catch (e: any) {
        console.error("Quote attachment failed (non-blocking):", e?.message || e);
      }
    }
  } catch (e: any) {
    airtableError = e?.message || String(e);
    console.error("Airtable save failed:", airtableError);
  }

  // ---- 2. PDF
  let pdf: { filename: string; content: string } | undefined;
  try {
    const bytes = await generateOnboardingPDF(responses, {
      signature,
      acknowledgments,
      termsAccepted,
      receiptId,
      receivedOn,
    });
    const slug = String(responses.companyName || "client")
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "client";
    pdf = { filename: `Gershon-Onboarding-${slug}.pdf`, content: toBase64(bytes) };
  } catch (e: any) {
    console.error("PDF generation failed (non-blocking):", e?.message || e);
  }

  // ---- 3. Emails
  const args = {
    receiptId,
    responses,
    acknowledgments,
    termsAccepted,
    signature,
    receivedOn,
    pdf,
    savedToAirtable,
    airtableError,
  };
  const emailed = { report: false, client: false, onboarding: false };
  const emailErrors: string[] = [];
  if (hasEmailKey()) {
    const [rep, cli, onb] = await Promise.allSettled([
      sendIntakeNotification(args),
      sendClientWelcome(args),
      sendOnboardingTask(args),
    ]);
    emailed.report = rep.status === "fulfilled";
    emailed.client = cli.status === "fulfilled" && cli.value === true;
    emailed.onboarding = onb.status === "fulfilled";
    for (const r of [rep, cli, onb]) {
      if (r.status === "rejected") emailErrors.push(String(r.reason?.message || r.reason));
    }
    if (emailErrors.length) console.error("Email errors:", emailErrors);
  } else {
    emailErrors.push("RESEND_API_KEY not set");
    console.error("RESEND_API_KEY not set — no emails sent.");
  }

  if (!savedToAirtable && !emailed.report) {
    return NextResponse.json(
      {
        error:
          "We could not record your submission. Please try again in a minute, or email olivier@gershonconsulting.com.",
        detail: { airtableError, emailErrors },
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    receiptId,
    receivedOn,
    saved: savedToAirtable,
    emailed,
    pdf: !!pdf,
  });
}
