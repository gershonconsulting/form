# `form.gershonCRM.com` — Deployment Setup

**For:** Charles Ohana
**From:** Olivier
**Est. time:** 3–4 hours end-to-end (2 hours scaffold + deploy, 1–2 hours polish)
**Status:** Ready to ship MVP

---

## 0. What we're shipping

A conversational replacement for the existing Google Form + OnBoarding Form Helper GPT workflow. Client pastes their website URL, Claude does automated research (web_search tool), pre-fills Sections 2/4/5/6.7, then the client confirms each pre-fill in a chat UI and answers the remaining sections (personal info, campaign scope, timing). Ends with required acknowledgments, terms acceptance, and a typed signature. The signed intake is stored in Supabase and becomes the binding record for the project.

You have the full React component already: `gershon_onboarding.jsx`. This doc walks you through wrapping it in a Next.js app, proxying the Anthropic calls server-side, persisting submissions, and deploying behind `form.gershonCRM.com`.

---

## 1. Stack decisions (read these before you start)

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 14 (App Router)** | Same as Gershon.AI — you know it. Gives us API routes for the Anthropic proxy without a separate backend. |
| Hosting | **Vercel** (not Hostinger) | We need server-side API routes and low-latency streaming. Vercel handles this natively with zero Node config. Matches Gershon.AI. |
| Database | **Supabase** | Persist sessions + signed intakes. Same project as Gershon.AI if you want to share, otherwise new project is fine. |
| DNS/SSL | **Cloudflare** (existing) | `gershonCRM.com` is already on Cloudflare. We add a CNAME pointing to Vercel. |
| Auth | **None for MVP** | Clients access via unique signed link emailed after the quote is accepted. Session token in URL, no login required. Add auth later if needed. |
| AI | **Claude Sonnet 4** via Anthropic API | `claude-sonnet-4-20250514` with the `web_search_20250305` tool enabled. |

**Departure from the gershonCRM Hostinger pattern:** this site needs server-side logic. The other gershonCRM subdomains stay on Hostinger; only this one goes to Vercel. Cloudflare still owns DNS.

---

## 2. Prerequisites (30 min — accounts only)

Check these off before touching code. Most should already exist.

- [ ] GitHub account with access to the Gershon org (create repo `form-gershoncrm`, private)
- [ ] Vercel account connected to the Gershon GitHub org
- [ ] Supabase account — create project `gershon-onboarding` (or reuse the Gershon.AI project, your call)
- [ ] Anthropic API key with billing enabled ([console.anthropic.com](https://console.anthropic.com)) — **this key must never leave the server**
- [ ] Cloudflare access to the `gershoncrm.com` zone (Olivier has this — get credentials from 1Password)
- [ ] Node 20+ locally (`nvm install 20 && nvm use 20`)

---

## 3. Project scaffold (20 min)

```bash
npx create-next-app@latest form-gershoncrm \
  --typescript \
  --tailwind \
  --app \
  --no-src-dir \
  --import-alias "@/*"

cd form-gershoncrm

# Core dependencies
npm install @anthropic-ai/sdk @supabase/supabase-js lucide-react

# Pin Node
echo "20.11.1" > .nvmrc

# Git init
git init
git add -A
git commit -m "Initial scaffold"
gh repo create gershon-org/form-gershoncrm --private --source=. --push
```

Project layout we're targeting:

```
form-gershoncrm/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                  ← renders <GershonOnboarding />
│   ├── api/
│   │   ├── research/route.ts     ← POST — website research with web_search
│   │   ├── chat/route.ts         ← POST — conversation turn
│   │   └── submit/route.ts       ← POST — final signed submission
│   └── globals.css
├── components/
│   └── GershonOnboarding.tsx     ← the big component (from .jsx, rename .tsx)
├── lib/
│   ├── anthropic.ts              ← server-side Claude client
│   ├── supabase.ts               ← server-side Supabase client
│   └── prompts.ts                ← buildSystemPrompt extracted here
├── .env.local                    ← (gitignored) local dev secrets
├── .env.example                  ← committed, no real values
├── next.config.js
└── package.json
```

---

## 4. Port the component (30 min)

Copy `gershon_onboarding.jsx` to `components/GershonOnboarding.tsx`. Add `'use client'` at the top (it uses hooks + browser APIs).

**Two changes required** — both replace direct calls to `https://api.anthropic.com` with calls to our own API routes:

### 4a. In `researchAndStart` (around line 265)

Replace the `fetch('https://api.anthropic.com/v1/messages', ...)` block with:

```ts
const res = await fetch('/api/research', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url }),
});
const data = await res.json();
// data is already { summary, capture } — no parsing needed
const parsed = data;
```

### 4b. In `callClaudeWithContext` and `callClaude` (around lines 300 and 380)

Replace the direct Anthropic fetch with:

```ts
const res = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    history,
    captured: captured || responses,
    sectionsDone: sectionsDoneArg || sectionsDone,
    researchSource: researchArg || researchSource,
  }),
});
const data = await res.json();
// data is { message, capture, currentSection, sectionComplete, readyForReview }
const parsed = data;
```

Also remove the `buildSystemPrompt` function from the component — move it to `lib/prompts.ts` and import it server-side only.

### 4c. Add session persistence

Inside the component, add a `sessionId` from the URL (`?s=...`) and on every state change debounce a `POST /api/session/:id` to persist progress. Keeps it resumable if the client closes the tab. See Appendix C for the snippet.

### 4d. On submit, POST to `/api/submit`

Update the `sign()` function to POST the full payload to `/api/submit` before setting `phase === 'signed'`. That endpoint writes the binding record, emails you + Naomie, and returns the receipt ID.

---

## 5. API routes (1 hour)

### 5a. `lib/anthropic.ts`

```ts
import Anthropic from '@anthropic-ai/sdk';

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export const MODEL = 'claude-sonnet-4-20250514';
```

### 5b. `app/api/research/route.ts`

```ts
import { NextRequest, NextResponse } from 'next/server';
import { anthropic, MODEL } from '@/lib/anthropic';

export const runtime = 'nodejs';
export const maxDuration = 60; // seconds — research can take 30-50s

export async function POST(req: NextRequest) {
  const { url } = await req.json();
  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'url required' }, { status: 400 });
  }

  const prompt = `A new client is starting the Gershon Consulting onboarding for a US lead-generation campaign. Their website is: ${url}

Use web_search to research this company. Pull their homepage content, any "About" / "Products" / "Pricing" / "Customers" pages, their LinkedIn company page, recent news. Then return a single JSON object with what you learned — ONLY fields you're confident about based on the site. Return ONLY the JSON. No markdown fences.

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

  const textBlocks = response.content
    .filter((b) => b.type === 'text')
    .map((b: any) => b.text);
  const text = textBlocks.join('\n').replace(/```json|```/g, '').trim();

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { summary: '', capture: {} };
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ summary: '', capture: {} });
  }
}
```

### 5c. `app/api/chat/route.ts`

```ts
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
```

### 5d. `app/api/submit/route.ts`

```ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const payload = await req.json();
  const { sessionId, responses, acknowledgments, termsAccepted, signature, conversationTranscript } = payload;

  // Capture IP for audit trail
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

  // Fire notification to Olivier + Naomie (stub — wire to Resend/Postmark later)
  // await sendNotification(data);

  return NextResponse.json({ receiptId: data.id, success: true });
}
```

### 5e. `lib/prompts.ts`

Move the entire `buildSystemPrompt` function from the component into this file and export it. The component no longer imports it (it now only hits `/api/chat`).

---

## 6. Supabase schema (15 min)

Run in the Supabase SQL editor:

```sql
-- Session state (for resumable intake)
create table public.onboarding_sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  url_analyzed text,
  research_source jsonb,
  responses jsonb default '{}'::jsonb,
  sections_done jsonb default '{}'::jsonb,
  messages jsonb default '[]'::jsonb,
  completed boolean default false
);

-- Final binding submissions
create table public.onboarding_submissions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.onboarding_sessions(id),
  submitted_at timestamptz default now(),
  responses jsonb not null,
  acknowledgments jsonb not null,
  terms_accepted boolean not null,
  signature_name text not null,
  signature_date date not null,
  conversation_transcript jsonb,
  submitted_ip text,
  submitted_user_agent text,
  -- Audit fields
  exported_to_crm_at timestamptz,
  notified_team_at timestamptz
);

-- Indexes
create index on public.onboarding_sessions (created_at desc);
create index on public.onboarding_submissions (submitted_at desc);

-- Row-level security: lock down client access, server-only writes via service key
alter table public.onboarding_sessions enable row level security;
alter table public.onboarding_submissions enable row level security;

-- Only the server (service_role key) can read/write; no anon access
-- (no policies created = deny all for anon role)
```

Add `lib/supabase.ts`:

```ts
import { createClient } from '@supabase/supabase-js';

export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);
```

---

## 7. Environment variables

### `.env.local` (local dev only — gitignored)

```bash
ANTHROPIC_API_KEY=sk-ant-...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### `.env.example` (committed)

```bash
ANTHROPIC_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=
```

### On Vercel

Vercel dashboard → `form-gershoncrm` project → Settings → Environment Variables. Add the same four keys for the **Production** environment. Set `NEXT_PUBLIC_SITE_URL` to `https://form.gershoncrm.com`.

**Critical:** `ANTHROPIC_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` must NOT be prefixed with `NEXT_PUBLIC_`. If they are, they'll ship to the browser and leak.

---

## 8. Deploy to Vercel (20 min)

```bash
npm install -g vercel
vercel login
vercel link       # links this folder to a Vercel project; create new one named 'form-gershoncrm'
vercel --prod     # deploys to production
```

After first deploy you'll get a URL like `form-gershoncrm-abc123.vercel.app` — test it works end-to-end there before moving to custom domain.

**Automatic deploys:** once linked, every push to `main` auto-deploys. PR branches get preview URLs. No GitHub Actions config needed.

---

## 9. Custom domain — `form.gershoncrm.com` (15 min)

### 9a. In Vercel

Project → Settings → Domains → Add `form.gershoncrm.com`. Vercel will show you the CNAME target — it'll be `cname.vercel-dns.com`.

### 9b. In Cloudflare

`gershoncrm.com` zone → DNS → Add record:

| Type | Name | Target | Proxy status |
|---|---|---|---|
| CNAME | `form` | `cname.vercel-dns.com` | **DNS only (gray cloud)** |

**Why DNS only, not Proxied:** Vercel's edge network handles CDN + SSL itself. Running it through Cloudflare's proxy causes cert-chain issues and double-caching. Use gray cloud. This is different from the normal gershonCRM pattern (which is orange cloud on Hostinger) — it's correct here.

### 9c. Wait for verification

Vercel polls DNS and auto-issues a Let's Encrypt cert. Usually 1–3 min. Dashboard goes from "Invalid Configuration" to "Valid Configuration" with a green checkmark.

### 9d. Test

- [ ] `https://form.gershoncrm.com` loads with green padlock
- [ ] `http://form.gershoncrm.com` redirects to HTTPS (Vercel does this by default)
- [ ] Open DevTools → Network tab → confirm `/api/chat` and `/api/research` are called, NOT `api.anthropic.com`
- [ ] Confirm `ANTHROPIC_API_KEY` does not appear anywhere in bundled JS (`curl https://form.gershoncrm.com/_next/static/... | grep sk-ant` should be empty)

---

## 10. Sign-off checklist

Before I (Olivier) hand the URL to a client, I need all of these green:

- [ ] Clean URL (`https://form.gershoncrm.com`) loads
- [ ] URL intake screen renders — no console errors
- [ ] Paste `https://linalysis.com` as test URL → research completes in under 60s → pre-fills appear
- [ ] Conversation flows through all sections — type answers, watch sidebar update
- [ ] Review screen shows all captured fields, pencil-edit works
- [ ] Cannot click "Sign & submit" until all 4 acknowledgments + terms + name + date are complete
- [ ] On submit, a row appears in `onboarding_submissions` table with full payload
- [ ] JSON export download works from the thank-you screen
- [ ] API key not visible in any client-side bundle
- [ ] Site scores 90+ on Lighthouse (performance + accessibility)
- [ ] Mobile renders correctly (Chrome DevTools device mode)
- [ ] Olivier + Naomie receive email notification on new submission *(stub for now, wire in followup)*

---

## Appendix A — Known gotchas

| Problem | Cause | Fix |
|---|---|---|
| `/api/research` times out | Hobby tier has 10s timeout | Upgrade to Vercel Pro ($20/mo) — required for the 60s research call. Hobby is fine for `/api/chat` at 30s. |
| Research returns empty `capture` | Model couldn't parse website or sites block scraping | Add client-facing fallback: "We couldn't automatically analyze your site — let's walk through together." Existing code already does this. |
| "Can't find module '@/lib/prompts'" | TypeScript path alias not set | Check `tsconfig.json` has `"paths": { "@/*": ["./*"] }` — create-next-app sets this by default. |
| CORS error on `/api/chat` | Missing runtime export | All API routes must have `export const runtime = 'nodejs';` at the top. Already in the templates above. |
| Cloudflare "Invalid SSL" error after DNS change | Proxy status set to orange cloud | Set to gray cloud (DNS only) — Vercel handles SSL. |
| Submission doesn't save | Using anon Supabase key instead of service role | In server-side code, use `SUPABASE_SERVICE_ROLE_KEY`, never `SUPABASE_ANON_KEY`. |

---

## Appendix B — Session resumability snippet

For Step 4c, add to the component (keeps the session token in URL so clients can close the tab and come back):

```ts
// Inside GershonOnboarding component
const [sessionId] = useState(() => {
  const url = new URL(window.location.href);
  const existing = url.searchParams.get('s');
  if (existing) return existing;
  const newId = crypto.randomUUID();
  url.searchParams.set('s', newId);
  window.history.replaceState({}, '', url.toString());
  return newId;
});

// Debounced autosave to /api/session/:id
useEffect(() => {
  const id = setTimeout(() => {
    fetch(`/api/session/${sessionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ responses, sectionsDone, messages, researchSource }),
    });
  }, 1500);
  return () => clearTimeout(id);
}, [responses, sectionsDone, messages, researchSource, sessionId]);
```

And create `app/api/session/[id]/route.ts` that `UPSERTs` into `onboarding_sessions`.

---

## Appendix C — What I'm NOT asking you to build in this pass

These are explicit followups, not gaps to fix now:

1. **Email notifications** — wire Resend/Postmark in `/api/submit` to email Olivier + Naomie on every submission with the summary. Stub in the code, will give you the template separately.
2. **Webhook to Naomie Jordan** — once the intake is signed, POST to Naomie's endpoint on the OpenClaw VPS so she schedules the kickoff call automatically. Waiting on Olivier to confirm Naomie's webhook URL.
3. **Quote upload** — the original Google Form had a PDF quote upload. I dropped it in the chat version (PDFs don't fit chat). Decide whether we want it back as a file uploader on the review screen or skip entirely.
4. **Google Docs export** — Olivier prefers Google Docs over PDF for deliverables. Post-submit, push the signed intake to a templated Google Doc and drop the link into the confirmation email.
5. **CRM sync** — the `onboarding_submissions` table has an `exported_to_crm_at` field. Add a cron or webhook to push new submissions into Streak.
6. **Admin dashboard at `form.gershoncrm.com/admin`** — gated by LinkedIn OAuth (same pattern as Gershon.AI), shows all submissions, lets us review transcripts.

---

## Questions back to me (Olivier)

Before you start, I need answers to these:

1. **Supabase:** new project or share the Gershon.AI one? (If sharing, I'll create the tables in the Gershon.AI project — let me know.)
2. **Vercel team:** deploy under the Gershon.AI Vercel team, or stand up a separate org?
3. **Anthropic key:** use the Gershon.AI key or provision a new one for this site? (Separate is cleaner for cost attribution.)
4. **Notification email address:** send to `oattia@gmail.com`, or a dedicated intake address like `onboarding@gershonconsulting.com`?
5. **Launch target date:** best-case shipping window?

Ping me on any of these and I'll unblock. Otherwise assume my defaults: new Supabase project, Gershon.AI Vercel team, new Anthropic key, notify `oattia@gmail.com`, ship by end of next week.

— Olivier
