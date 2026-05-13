import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendEmail } from '@/lib/email';
import { generateOnboardingPDF } from '@/lib/pdf';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }
  if (!payload || typeof payload !== 'object') {
    return NextResponse.json({ error: 'payload required' }, { status: 400 });
  }
  const {
    sessionId,
    responses = {},
    acknowledgments = {},
    termsAccepted = false,
    signature = { name: '', date: '' },
    conversationTranscript = '',
  } = payload;

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

  // ── Send signed-form email with PDF attachment ──────────────────────
  // Subject:  Filled out form - Lead Generation Campaign for COMPANYNAME by Gershon Consulting
  // To:      the client's email
  // Cc:      form@gershonconsulting.com (Gershon team archive)
  // Body:    Hello FIRSTNAME, [boilerplate], — Gershon Consulting
  // Attach:  generated PDF of the responses
  const clientEmail = responses?.email;
  const firstName = (responses?.firstName ?? '').toString().trim() || 'there';
  const lastName = (responses?.lastName ?? '').toString().trim();
  const fullName = `${firstName} ${lastName}`.trim() || 'Client';
  const companyName = (responses?.companyName ?? '').toString().trim() || 'your company';
  const teamArchive = (process.env.SUBMIT_ARCHIVE_TO || 'form@gershonconsulting.com').trim();

  try {
    const pdfBytes = await generateOnboardingPDF(responses);
    const subject = `Filled out form - Lead Generation Campaign for ${companyName} by Gershon Consulting`;
    const pdfFilename = `gershon-form-${companyName.toLowerCase().replace(/\s+/g, '-')}.pdf`;
    const greetingHtml = `<p>Hello ${firstName.replace(/</g, '&lt;')},</p>
<p>Thank you for taking the time to complete the form for the launch of your Lead Generation campaign. Please find attached a copy of the completed questionnaire.</p>
<p>We remain at your disposal if you need any assistance.</p>
<p>Best regards,<br/>— Gershon Consulting</p>`;

    // Email to the client (if they provided one). Cc the team archive so they have a copy.
    if (clientEmail) {
      try {
        await sendEmail({
          to: clientEmail,
          cc: [teamArchive],
          subject,
          html: greetingHtml,
          pdfBytes,
          pdfFilename,
        });
        console.log(`[submit] Email sent to ${clientEmail} + cc ${teamArchive}`);
      } catch (emailErr) {
        console.error('[submit] Client email failed, will still attempt team-only:', emailErr);
        // Fallback: try to deliver to the team archive at least so the submission isn't lost.
        try {
          await sendEmail({
            to: teamArchive,
            subject: `[client email failed] ${subject}`,
            html: greetingHtml + `<hr/><p><strong>Note:</strong> the email to ${clientEmail.replace(/</g, '&lt;')} bounced or failed. Original submission attached.</p>`,
            pdfBytes,
            pdfFilename,
          });
        } catch (teamErr) {
          console.error('[submit] Team archive fallback also failed:', teamErr);
        }
      }
    } else {
      // No client email captured — still archive to the team
      console.warn('[submit] No client email — sending team archive only');
      try {
        await sendEmail({
          to: teamArchive,
          subject: `[no client email] ${subject}`,
          html: greetingHtml + `<hr/><p><strong>Note:</strong> the client did not provide an email address.</p>`,
          pdfBytes,
          pdfFilename,
        });
      } catch (teamErr) {
        console.error('[submit] Team-only email failed:', teamErr);
      }
    }
  } catch (pdfErr) {
    console.error('[submit] PDF generation failed (continuing without email):', pdfErr);
  }

  return NextResponse.json({ receiptId: data.id, success: true });
}
