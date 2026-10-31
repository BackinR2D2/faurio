# Marketplace implementation plan

The master prompt is a phased product roadmap. A phase is complete only when its behavior has evidence; schema presence alone is insufficient.

## 0. Audit and architecture
- [x] Inspect current code, dirty worktree, env names and commerce/security boundaries.
- [x] Document current state and compare custom/Medusa/Mercur strategies.
- [x] Record final lint/typecheck/build results (baseline had no automated tests).
- [x] Patch runtime dependencies to Next.js 16.4.3; runtime npm audit reports zero advisories.

## 1. Tenant foundation
- [x] Add additive shop/membership/application migration and legacy product backfill.
- [x] Enforce tenant RLS and server authorization, with negative PostgreSQL tests.
- [x] Implement seller application, scoped product CRUD and operator moderation.
- [x] Public maker discovery and product attribution.
- [x] Guard new-seller checkout until financial onboarding is implemented, including a SQL guard.
- [ ] Apply migration to external Supabase and execute the journey with two actual Auth accounts. Block: no direct SQL connection configured; run the supplied file in SQL Editor.

## 2. Distinct maker storefronts
- [x] Safe themes and typed ordered blocks, biography and FAQ.
- [x] Draft autosave, live mobile/desktop preview, keyboard reorder, undo.
- [x] Publish/unpublish/version snapshot with conflict protection.
- [x] Two-seller persistence/isolation PostgreSQL integration test; UI transport mock tested separately.
- [ ] Storage uploads with bucket RLS and content validation (separate follow-up if not delivered).

## 3. Discovery
- [x] Hard-constraint parser regression tests, budget ranges/material exclusions/currency notices.
- [x] Catalog visibility enforces seller + listing status and stable pagination; filters survive SSR links.
- [ ] Optional structured LLM adapter, rate limits and facet counts.

## 4. Financial marketplace — not completed by this delivery
- [ ] Stripe Accounts v2 hosted onboarding; real capability reconciliation.
- [ ] Integer pricing/customization snapshots (80 + 20 + 15 + 10 = 125 RON).
- [ ] Mixed-seller quote, shipping and master/seller orders.
- [ ] Signed idempotent webhooks, ledger/outbox, test transfers.
- [ ] Contention, expiry, async success, decline, partial refund/reversal tests.
- [ ] Worker/reconciliation and fiscal-invoice provider boundary.

## 5–7. Creative experience, trust and release
- [x] Add WebGL offscreen pause/error/static fallback; no entrance animation in reduced motion; mobile loads 3D on request.
- [ ] Purchase-verified reviews, fulfillment and buyer tracking.
- [ ] Secure media uploads, abuse controls, privacy flows.
- [ ] SSR auth and full password recovery.
- [ ] Medusa/Mercur migration spike and decision gate (ADR 001).
- [x] Mobile/browser tests and genuine local screenshots, with mocked editor evidence explicitly labeled.
- [x] Local production Lighthouse; initial and optimized reports retained in docs/evidence.
- [ ] PageSpeed on a deployed production URL and authenticated external seller/payment screenshots.
- [ ] Deployment and an actual Stripe test payment after service setup.

See `docs/TEST-REPORT.md`, `docs/DEPLOYMENT.md`, `docs/ST3-PRESENTATION.md` and `docs/DEMO-SCRIPT.md` for run evidence and exact handoff.
