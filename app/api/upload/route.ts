import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "edge";

// One-time setup (in Supabase SQL editor):
//   create bucket if not exists 'quote-uploads'  (Storage → Create bucket; set to Private)
//
// This route accepts multipart/form-data with a single "file" field, uploads to the
// quote-uploads bucket, and returns a signed URL valid for 30 days that Gershon can
// use to download the quote later. The signed URL is what we store in the
// responses.quoteReference field, so the audit trail stays inside Supabase.

const MAX_BYTES = 15 * 1024 * 1024; // 15 MB
const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/heic",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
]);

export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "invalid form-data body" },
      { status: 400 },
    );
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "missing 'file' field" },
      { status: 400 },
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `file too large (max ${Math.floor(MAX_BYTES / 1024 / 1024)} MB)` },
      { status: 413 },
    );
  }

  if (file.type && !ALLOWED_MIME.has(file.type)) {
    return NextResponse.json(
      {
        error: `unsupported file type "${file.type}". Allowed: PDF, PNG, JPG, DOCX, XLSX, TXT.`,
      },
      { status: 415 },
    );
  }

  const sessionId = (form.get("sessionId") as string) || "anon";
  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_").slice(-80);
  const path = `${sessionId}/${Date.now()}-${safeName}`;

  try {
    const supabase = getSupabaseAdmin();
    const buffer = await file.arrayBuffer();

    const { error: upErr } = await supabase.storage
      .from("quote-uploads")
      .upload(path, buffer, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (upErr) {
      console.error("Storage upload failed:", upErr.message);
      const hint = upErr.message?.includes("Bucket not found")
        ? " · Create the 'quote-uploads' bucket in Supabase first."
        : "";
      return NextResponse.json(
        { error: `Upload failed: ${upErr.message}${hint}` },
        { status: 500 },
      );
    }

    // 30-day signed URL — long enough for the Gershon team to pull the quote
    // multiple times during onboarding without re-issuing.
    const { data: signed, error: signErr } = await supabase.storage
      .from("quote-uploads")
      .createSignedUrl(path, 60 * 60 * 24 * 30);

    if (signErr || !signed?.signedUrl) {
      console.error("Signed URL failed:", signErr?.message);
      return NextResponse.json(
        { error: "Upload saved but couldn't generate access URL" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      path,
      url: signed.signedUrl,
      filename: file.name,
      size: file.size,
      contentType: file.type,
    });
  } catch (e: any) {
    console.error("Upload error:", e?.message || e);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
