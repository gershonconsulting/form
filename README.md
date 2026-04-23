# form.gershonCRM.com

Conversational client onboarding for Gershon Consulting.

## Stack
- **Framework**: Next.js 14 (App Router)
- **Hosting**: Vercel  
- **Database**: Supabase
- **DNS**: Cloudflare (gray cloud CNAME to Vercel)
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
| SUPABASE_URL | Supabase project URL |
| SUPABASE_SERVICE_ROLE_KEY | Server-side only — do NOT prefix with NEXT_PUBLIC_ |
| NEXT_PUBLIC_SITE_URL | Public site URL |

## Supabase Schema

See form_gershoncrm_setup_for_charles.md Section 6 for the full SQL schema.

## Deployment

See form_gershoncrm_setup_for_charles.md for the full step-by-step deployment guide.
