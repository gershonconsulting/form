// Temporary diagnostic endpoint. Confirms whether the Anthropic call is
// hitting the API and surfaces the real error text + status code so we can
// see WHY chat/research are failing on the live deploy.
// Remove this route after the issue is resolved.
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ok: false, error: 'ANTHROPIC_API_KEY not set' });
  }

  const url = new URL(req.url);
  const model = url.searchParams.get('model') || 'claude-sonnet-4-6';
  const withTools = url.searchParams.get('tools') === '1';

  const body: any = {
    model,
    max_tokens: 50,
    messages: [{ role: 'user', content: 'Say "ok" and nothing else.' }],
  };
  if (withTools) {
    body.tools = [{ type: 'web_search_20250305', name: 'web_search' }];
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    return NextResponse.json({
      ok: res.ok,
      status: res.status,
      model,
      withTools,
      keyPrefix: apiKey.slice(0, 12),
      keyLen: apiKey.length,
      body: text.slice(0, 2000),
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, threw: true, message: e?.message });
  }
}
