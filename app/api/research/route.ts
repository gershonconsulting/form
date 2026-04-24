import { NextRequest, NextResponse } from 'next/server';
import { anthropic, MODEL } from '@/lib/anthropic';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { url } = await req.json();
  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'url required' }, { status: 400 });
  }

  const prompt = `A new client is starting the Gershon Consulting onboarding for a US lead-generation campaign. Their website is: ${url}

Use web_search to research this company. Return a single JSON object — ONLY fields you are confident about. Return ONLY the JSON. No markdown fences.

{
  "summary": "2-3 sentence description",
  "capture": {
    "companyName": "…",
    "website": "…",
    "businessType": "B2B | B2C | B2B2C | marketplace | agency",
    "industry": "specific sub-industry",
    "productLinks": "URLs comma-separated",
    "targetDefinition": "best-guess ICP",
    "targetIndustries": "likely target industries",
    "targetTitles": "likely buyer personas",
    "top5Highlights": "5 differentiators newline-separated",
    "googleKeywords": "likely keywords comma-separated",
    "competitors": "3-5 competitors with website + one line each",
    "competitorTwitterAccounts": "comma-separated handles"
  }
}`;

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 3000,
    tools: [{ type: 'web_search_20250305', name: 'web_search' } as any],
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content
    .filter((b) => b.type === 'text')
    .map((b: any) => b.text)
    .join('\n')
    .replace(/```json|```/g, '')
    .trim();

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { summary: '', capture: {} };
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ summary: '', capture: {} });
  }
    }
