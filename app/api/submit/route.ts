import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { sendIntakeNotification } from "@/lib/email";

export const runtime = "edge";

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
  } = payload || {};

  // Minimal validation — the UI does the heavy lifting, but reject obviously broken payloads.
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
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("onboarding_submissions")
      .insert({
        responses,
        acknowledgments,
        terms_accepted: termsAccepted,
        signature_name: signature.name,
        signature_date: signature.date,
        conversation_transcript: conversationTranscript || null,
        submitted_ip: ip || null,
        submitted_user_agent: userAgent || null,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Submission insert error:", error.message);
      return NextResponse.json({ error: "Submission failed" }, { status: 500 });
    }

    // Fire-and-forget email notification — failures here MUST NOT block the response.
    // The Supabase row is already saved; the email is just a courtesy copy.
    try {
      await sendIntakeNotification({
        receiptId: data.id,
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

    return NextResponse.json({ receiptId: data.id, success: true });
  } catch (e: any) {
    console.error("Submission error:", e?.message || e);
    return NextResponse.json({ error: "Submission failed" }, { status: 500 });
  }
}
