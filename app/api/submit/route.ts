import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendEmail, buildEmailHtml } from '@/lib/email';
import { generateOnboardingPDF } from '@/lib/pdf';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const payload = await req.json();
  const { sessionId, responses, acknowledgments, termsAccepted, signature, conversationTranscript } = payload;

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('x-real-ip') || '';
  const userAgent = req.headers.get('user-agent') || '';

  const { data, error } = await supabaseAdmin
    .from('onboarding_submissions')
    .insert({
      session_id: sessionId,
      responses,
      acknowledgments,
      terms_accepted: termsAccepted,
      signature_name: signature.name,
      signature_date: signature.date,
      conversation_transcript: conversationTranscript,
      submitted_ip: ip,
      submitted_user_agent: userAgent,
    })
    .select()
    .single();

  if (error) {
    console.error('Submission error:', error);
    return NextResponse.json({ error: 'Submission failed' }, { status: 500 });
  }

  // ── Send confirmation email with PDF ──────────────────────────────
  const clientEmail = responses?.email;
  if (clientEmail) {
    try {
      const pdfBytes = await generateOnboardingPDF(responses);
      const html = buildEmailHtml(responses, data.id);
      const clientName = `${responses.firstName ?? ''} ${responses.lastName ?? ''}`.trim() || 'Client';
      const company = responses.companyName ? ` — ${responses.companyName}` : '';

      await sendEmail({
        to: clientEmail,
        cc: ['sales@gershonconsulting.com'],
        subject: `Your Onboarding Summary${company} · Gershon Consulting`,
        html,
        pdfBytes,
        pdfFilename: `gershon-onboarding-${clientName.toLowerCase().replace(/\s+/g, '-')}.pdf`,
      });

      console.log(`[submit] Email sent to ${clientEmail}`);
    } catch (emailErr) {
      // Don't fail the submission if email fails — log and continue
      console.error('[submit] Email error:', emailErr);
    }
  } else {
    console.warn('[submit] No email address in responses — skipping email');
  }

  return NextResponse.json({ receiptId: data.id, success: true });
}
