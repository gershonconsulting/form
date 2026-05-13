import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let payload: any;
  try { payload = await req.json(); } catch { return NextResponse.json({ error: 'invalid JSON' }, { status: 400 }); }

  const email = (payload?.email || '').toString().trim();
  const firstName = (payload?.firstName || '').toString().trim() || 'there';
  const companyName = (payload?.companyName || '').toString().trim() || 'your project';
  const resumeUrl = (payload?.resumeUrl || '').toString().trim();

  if (!email || !resumeUrl) {
    return NextResponse.json({ error: 'email and resumeUrl required' }, { status: 400 });
  }
  if (!/^https?:\/\/form\.gershoncrm\.com/.test(resumeUrl)) {
    return NextResponse.json({ error: 'invalid resumeUrl host' }, { status: 400 });
  }

  const safeName = firstName.replace(/[<>]/g, '');
  const safeCompany = companyName.replace(/[<>]/g, '');
  const subject = `Resume your Gershon onboarding — ${safeCompany}`;
  const html = `<p>Hello ${safeName},</p>
<p>Your progress has been saved. When you're ready to continue, open the link below and we'll pick up right where you left off:</p>
<p><a href="${resumeUrl}">${resumeUrl}</a></p>
<p>This link is unique to your session. Bookmark it or keep this email handy — the form will not lose your answers as long as you return through this link.</p>
<p>We're here if you need anything.</p>
<p>Best regards,<br/>— Gershon Consulting</p>`;

  try {
    await sendEmail({ to: email, subject, html });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('[save-progress] send failed', e?.message || e);
    return NextResponse.json({ error: 'email send failed' }, { status: 500 });
  }
}
