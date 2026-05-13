import { NextRequest, NextResponse } from 'next/server';
import { anthropic, MODEL } from '@/lib/anthropic';
import { buildSystemPrompt } from '@/lib/prompts';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  const { history = [], captured = {}, sectionsDone = {}, researchSource = null } = payload || {};

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system: buildSystemPrompt(captured, sectionsDone, researchSource),
      tools: [{ type: 'web_search_20250305', name: 'web_search' } as any],
      messages: history.length === 0
        ? [{ role: 'user', content: 'Please begin the onboarding.' }]
        : history,
    });

    const text = response.content
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('\n')
      .replace(/```json|```/g, '')
      .trim();

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch
        ? JSON.parse(jsonMatch[0])
        : { message: text, capture: {}, sectionComplete: false, readyForReview: false };
      return NextResponse.json(parsed);
    } catch {
      return NextResponse.json({
        message: text,
        capture: {},
        sectionComplete: false,
        readyForReview: false,
      });
    }
  } catch (e: any) {
    console.error('[chat] Anthropic call failed:', {
      message: e?.message,
      status: e?.status,
      body: e?.body,
    });
    return NextResponse.json(
      {
        message:
          "I'm having trouble reaching our AI service right now. Please try again in a moment, or use the Save Progress button so you don't lose your place.",
        capture: {},
        sectionComplete: false,
        readyForReview: false,
        _error: 'upstream_ai_error',
      },
      { status: 200 },
    );
  }
}
