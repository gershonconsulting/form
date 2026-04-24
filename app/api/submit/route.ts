import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

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

  // TODO: Fire notification to Olivier + Naomie via Resend/Postmark
  // await sendNotification(data);

  return NextResponse.json({ receiptId: data.id, success: true });
      }
