import { NextResponse } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

// Session autosave used to write to Supabase (onboarding_sessions). Supabase was
// removed in f83284e (Airtable is the store now) but this route still imported
// '@/lib/supabase', so `next build` failed on main. The client never calls this
// route, so it is now an explicit "gone" stub until a real Airtable autosave exists.
export async function PUT() {
  return NextResponse.json(
    { ok: false, error: 'session autosave is not available (Supabase removed)' },
    { status: 410 }
  );
}
