// Direct-fetch shim for the Anthropic Messages API.
//
// Why: the @anthropic-ai/sdk package has Node-only dependencies (cloudflare:sockets,
// node:http, etc.) that crash Cloudflare Workers edge runtime even with a webpack
// `external` workaround. Direct fetch is edge-clean.
//
// Public surface is intentionally compatible with the SDK call site —
// `anthropic.messages.create({ model, max_tokens, ... })` — so the existing
// route handlers in app/api/* don't need to change.

export const MODEL = 'claude-sonnet-4-20250514';

type MessagesCreateParams = {
  model?: string;
  max_tokens: number;
  messages: Array<{ role: 'user' | 'assistant'; content: unknown }>;
  system?: string;
  tools?: Array<Record<string, unknown>>;
  temperature?: number;
};

async function messagesCreate(params: MessagesCreateParams) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set');
  }
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ model: MODEL, ...params }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '<no body>');
    throw new Error(`Anthropic API error ${res.status}: ${errText}`);
  }
  return res.json();
}

export const anthropic = {
  messages: { create: messagesCreate },
};
