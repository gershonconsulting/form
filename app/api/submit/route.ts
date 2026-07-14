import { NextRequest, NextResponse } from "next/server";
import {
  createSubmission,
  toAirtableFields,
  uploadAttachment,
} from "@/lib/airtable";
import { sendIntakeNotification } from "@/lib/email";

export const runtime = "edge";

// Signed submission handler.
// Persists the intake as one row in the Airtable "Submissions" table, uploads
// the (optional) quote file as a native attachment on that row, and fires a
// courtesy email to the Gershon team via Resend. Email + attachment failures
// never block the response — the row is what matters for the audit trail.
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

  try {
    const fields = toAirtableFields({
      responses,
      acknowledgments,
      termsAccepted,
      signature,
      sessionId,
      ip,
      userAgent,
      conversationTranscript,
    });

    const created = await createSubmission(fields);

    // Attach file — non-blocking on failure. If the file is huge or Airtable is
    // flaky, still return success so the client sees the intake as saved.
    if (
      quoteFile &&
      typeof quoteFile.base64 === "string" &&
      quoteFile.filename
    ) {
      try {
        await uploadAttachment({
          recordId: created.id,
          filename: String(quoteFile.filename).slice(0, 120),
          contentType: quoteFile.contentType || "application/octet-stream",
          fileBase64: quoteFile.base64,
        });
      } catch (attachErr: any) {
        console.error(
          "Quote attachment failed (non-blocking):",
          attachErr?.message || attachErr,
        );
      }
    }

    // Fire-and-forget notification.
    try {
      await sendIntakeNotification({
        receiptId: created.id,
        responses,
        acknowledgments,
        termsAccepted,
        signature,
      });
    } catch (emailErr: any) {
      console.error(
        "Submission email failed (non-blocking):",
        emailErr?.message || emailErr,
      );
    }

    return NextResponse.json({ receiptId: created.id, success: true });
  } catch (e: any) {
    console.error("Submission error:", e?.message || e);
    return NextResponse.json(
      { error: e?.message || "Submission failed" },
      { status: 500 },
    );
  }
}
