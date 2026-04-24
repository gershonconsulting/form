import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { responses, sectionsDone, messages, researchSource } = await req.json();
  const { id } = params;

  const { error } = await supabaseAdmin
    .from('onboarding_sessions')
    .upsert(
      {
        id,
        responses,
        sections_done: sectionsDone,
        messages,
        research_source: researchSource,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
