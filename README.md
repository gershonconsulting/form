# Gershon Welcome (welcome.gershon.ai, formerly form.gershoncrm.com)

Conversational client onboarding for Gershon Consulting.

## Stack
- **Framework**: Next.js 14 (App Router)
- **Hosting**: Cloudflare Pages project `gershon-form` (@cloudflare/next-on-pages, edge runtime; push to `main` = deploy)
- **Storage**: Airtable (submissions + quote attachment), Resend for the notification email
- **DNS**: Cloudflare (welcome.gershon.ai)
- **AI**: Claude Sonnet 4 via Anthropic API with web_search tool

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Environment Variables

| Variable | Description |
|---|---|
| ANTHROPIC_API_KEY | Server-side only — do NOT prefix with NEXT_PUBLIC_ |
| AIRTABLE_* | See .env.example (set in Cloudflare, never in the repo) |
| RESEND_API_KEY | Server-side only |
| NEXT_PUBLIC_SITE_URL | Public site URL |

## Deployment

See HANDOFF.txt and STATUS.md (current version v0.4.7). form_gershoncrm_setup_for_charles.md is the old Vercel + Supabase guide and is outdated.
