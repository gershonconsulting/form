# gershon-form — STATUS

Last updated: 2026-11-23 · App v0.5.0

## What it is
Conversational client onboarding for Gershon Consulting — live at https://welcome.gershon.ai
(Cloudflare Pages project `gershon-form`, Git-connected to this repo: push to `main` = deploy).

## State
- ⏳ v0.5.0 (PR, awaiting Olivier's OK because it emails clients) — Submit now does the full flow: button shows "Submitting…", errors are shown on screen (they were silently swallowed: the "nothing happens" bug), row saved in Airtable, signed-intake PDF built server-side (pdf-lib), 3 emails via Resend from welcome@gershon.ai (only verified domain): client welcome (PDF, official received date, campaign start date), report@ copy (PDF, flagged NOT SAVED IN AIRTABLE if Airtable failed), Aina onboarding task (ainarama@). Twitter password never reproduced in PDF/emails. Submission only fails if Airtable AND report@ email both fail.
- ✅ v0.4.8 — naming: page titles and header/print wordmark read "Welcome by Gershon.AI" (was "Gershon Welcome"). Emails (resume-link subject etc.) unchanged. `npm run build` passes.
- ✅ v0.4.6 — "still missing" box is interactive: each missing answer, acknowledgment, ToS, signature name and date can be filled right in the box, and the item disappears as soon as it is provided.
- ✅ v0.4.5 — completed-form email now always goes to report@gershonconsulting.com (was welcome@ via the GERSHON_NOTIFY_TO Pages setting, now ignored).
- ✅ v0.4.4 — red arrow on every empty required field (review screen); "still missing" checklist under Sign & submit (click a field to jump to it); quote field help text now includes the Quote Special BlackFriday line (UI + chat prompt).
- ✅ v0.4.3 — SSI question removed; Top 5 competitors captured and shown as a numbered list 1–5. Numbering now: Section 06 = Q33-Q37, 07 = Q38, 08 = Q39 start date, Q40 quote.
- ✅ v0.4.2 — "Linalysis account activated" question removed (no longer required). Start date is now Q39, quote Q41.
- ✅ v0.4.1 — links in field help text (LinkedIn/Facebook/Google Business admin, Sales Navigator,
  Linalysis, SSI…) are clickable and open in a new tab; emails open as mailto.
- ✅ v0.4.0 — unified Gershon design (Linalysis master): system font stack, bold sans headings,
  brand red #FE1B04, pill buttons, 12px rounded cards, #E5E7EB borders, #1D1D1F text. Fraunces /
  JetBrains Mono web fonts removed. Print/PDF summary view aligned.
- ✅ v0.3.1 — form fields match the original Google Form (single package, inline choices).
- ✅ v0.2.2 — brand red #FE1B04 (UI, email, PDF).

## Open
- ✅ 2026-11-23 AIRTABLE_PAT + RESEND_API_KEY set on Pages gershon-form (redeployed).
- ❌ Header on phones is cramped (version stamp + "Secured · Binding" wrap) — pre-existing.
- ❌ Old worker `gershon-welcome` (Ovattia CF account) is obsolete; welcome.gershon.ai is served by Pages.
- ❌ `tsc --noEmit` reports pre-existing implicit-any errors and missing `pdf-lib` types (build still passes).

## Deploy
Merge to `main` → Cloudflare Pages builds `gershon-form` automatically. Verify welcome.gershon.ai shows the new APP_VERSION in the header.
