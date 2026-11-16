# gershon-form — STATUS

Last updated: 2026-11-16 · App v0.4.1

## What it is
Conversational client onboarding for Gershon Consulting — live at https://welcome.gershon.ai
(Cloudflare Pages project `gershon-form`, Git-connected to this repo: push to `main` = deploy).

## State
- ✅ v0.4.1 — red arrow on every empty required field (review screen); "still missing" checklist under Sign & submit (click a field to jump to it); quote field help text now includes the Quote Special BlackFriday line (UI + chat prompt).
- ✅ v0.4.0 — unified Gershon design (Linalysis master): system font stack, bold sans headings,
  brand red #FE1B04, pill buttons, 12px rounded cards, #E5E7EB borders, #1D1D1F text. Fraunces /
  JetBrains Mono web fonts removed. Print/PDF summary view aligned.
- ✅ v0.3.1 — form fields match the original Google Form (single package, inline choices).
- ✅ v0.2.2 — brand red #FE1B04 (UI, email, PDF).

## Open
- ❌ Header on phones is cramped (version stamp + "Secured · Binding" wrap) — pre-existing.
- ❌ Old worker `gershon-welcome` (Ovattia CF account) is obsolete; welcome.gershon.ai is served by Pages.
- ❌ `tsc --noEmit` reports pre-existing implicit-any errors and missing `pdf-lib` types (build still passes).

## Deploy
Merge to `main` → Cloudflare Pages builds `gershon-form` automatically. Verify welcome.gershon.ai shows the new APP_VERSION in the header.
