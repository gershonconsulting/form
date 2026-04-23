import { NextRequest, NextResponse } from 'next/server';
import { anthropic, MODEL } from '@/lib/anthropic';
import { buildSystemPrompt } from '@/lib/prompts';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const { history, captured, sectionsDone, researchSource } = await req.json();

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
    .filter((b) => b.type === 'text')
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
}
