# Verification report — 31 octombrie 2026

## Latest marketplace / AI / Gmail pilot delivery

Final source: **68/68 unit/PostgreSQL integration tests**, **46/46 Chrome desktop/mobile browser tests** (1.1 min), production build with 57 generated pages/routes, TypeScript, lint and `git diff --check` pass. `npm audit --omit=dev` reports zero published production-dependency vulnerabilities at the time checked; this is not a security audit or a guarantee of no vulnerabilities. Only `.env.example` is tracked; `.env.local` was not edited or printed. No Git remote was present, and no commit/push/deploy was made.

Three live Groq interpretation cases passed with the user's saved key and taxonomy read from the real catalog: brown T-shirt/max 100 RON, glassware/max 100 RON and an exploratory coffee-gift story. The first story evaluation exposed overly literal hard terms; the revised structured queryMode/prompt and post-validation move gift interests to soft ranking tokens and remove recognized attributes from literal terms. Unit tests preserve the exact unknown noun, color, budget and product qualifiers. Observed revised provider durations were about 2.4 s / 1.0 s / 0.95 s; no universal two-second latency claim is made. Six provider requests were made across the initial/revised evaluation. No query history, customer profiles or order records were sent to Groq; only fixture queries and public taxonomy.

PostgreSQL PGlite executes all seven migrations over the existing base schema and exercises tenant grants/RLS, private drafts, moderation, whole-catalog ranking before pagination, strict empty results, quota/cache permissions, 5.5% fee arithmetic, same-seller checkout, capability guards, stock/order/finance transaction rollback, durable retry identities, replay protection, fulfillment transitions, partial/full refund reconciliation, uploaded-photo ownership, delivered-purchase reviews/moderation, private return requests and public-form limits. The reserved-column syntax issue in the new rate-limit table was corrected before external activation.

Browser evidence combines real read-only catalog access with explicitly MOCK-prefixed Auth/Studio/payment/provider fixtures. It covers consent and Stripe redirects, moderated product submission with upload, maker-specific checkout and shipping totals, buyer tracking/reviews/returns, form network recovery, backend-required success, anonymous authorization, logout cart/favorite isolation, responsive layouts, keyboard/no-JS search and WebGL fallback. The additional logout test found a real redirect race between account protection and intentional sign-out; the source was fixed and the full final run passes. Mock screenshots do NOT prove real onboarding, payment, inbox delivery or persistent cloud seller records.

Read-only `npm run launch:check` still reports every marketplace activation probe false in hosted Supabase: marketplace views, outbox, search cache, Connect accounts, order finance, checkout attempts, media, reviews, returns and form usage. Groq key and original Stripe test/webhook keys are present; SMTP configuration, Connect enablement/connected webhook, retry secret and HTTPS canonical URL are incomplete. Thus new cloud marketplace workflows are **not activated**, even though local SQL and UI checks pass. Apply the seven migrations and configure services using [PRODUCTION-LAUNCH.md](PRODUCTION-LAUNCH.md), then rerun real-user staging/production checks.

No real email, Stripe Checkout payment, Express onboarding, transfer, payout, refund, external DDL, DNS change or production PageSpeed test was performed. Live Stripe keys remain refused. SMTP transport/configuration/error paths are tested locally, not inbox-tested. A public deployment remains pending GitHub/hosting access and the URL configuration; `test:production` and its manual workflow are supplied but not represented as executed. The temporary owned QA server is stopped at handoff; the user's development server on 3000 is left untouched.

## Historical verification — 30 octombrie 2026

## Faurio identity and transactional-email follow-up

Final follow-up: **50/50 unit/integration tests**, **30/30 desktop/mobile Chrome tests** (43.6 s), production build (43 routes/pages), TypeScript, lint and diff whitespace checks pass. Identity is Faurio, with new vector mark, wordmark assets and favicon. Historical storage keys, existing order codes and maker URLs are intentionally preserved.

The additive email migration is executed on local PostgreSQL PGlite over the base shop schema independently of marketplace activation. Tests cover paid-only enqueue, no historical backfill, duplicate payment events, immutable recipient/order snapshots, exclusive lease claims, immutable prepared provider payloads, token-checked acknowledgements, delayed retries, five-attempt exhaustion, stale/uncertain jobs, refunds and private grants/RLS. HTTP tests for Resend use explicit fakes: no real email is sent. Browser tests for signup SMTP failure and successful password recovery use explicitly mocked Supabase Auth, not real confirmation/recovery links. Email preview screenshots are prefixed MOCK and use fixture identities.

Read-only `npm run email:check` reports no RESEND_API_KEY, no EMAIL_FROM, no valid CRON_SECRET and no outbox migration in hosted Supabase. The first HEAD-only schema probe was replaced with a GET/limit(0) probe because missing relations can produce ambiguous empty HEAD errors; the current diagnostic correctly detects the absent schema. No DDL was applied externally and `.env.local` was not edited. The reported signup 500 cannot be declared fixed in production until the user verifies their domain, configures Supabase SMTP and tests an actual email. Instructions: [EMAIL-SETUP.md](EMAIL-SETUP.md).

The initial new browser run passed 28/30; the recovery assertion selected both the form's alert and Next's route announcer. Scoping the assertion to the recovery form fixed that test-selector ambiguity; the final run above passes all 30. Tests verify password mismatch makes no update request, a successful authenticated update signs out, and an anonymous recovery visitor cannot submit a password.

Purchase notifications use Resend only after server-verified Stripe payment and durable paid-order enqueue. Transient send failures do not roll back a recorded payment; the immutable payload and provider idempotency key allow safe retries within a conservative 23h window. Provider acceptance is not represented as inbox delivery. Automatic retry workflow files are supplied but not activated externally. Existing checkout remains Stripe test-only and templates label those messages [TEST]. No SMTP settings, DNS, hosting, GitHub repository or real Stripe payment was changed. Only the owned temporary production server on 3100 is used for browser verification; the user's dev server on 3000 is retained.

## Follow-up: exact search and representative photos

Later on the same day, the search/photo fix passed **35 unit/integration tests**, **22 Chrome desktop/mobile tests** (44.6 s), production build, strict TypeScript, lint and diff whitespace checks. Details: [SEARCH-AND-PHOTOS.md](SEARCH-AND-PHOTOS.md). The earlier results below describe the initial marketplace foundation, not this follow-up.

24 independently generated WebP images were visually inspected and assigned to all 720 known demo editions through guarded Supabase updates to image/image_position only. A subsequent dry-run found zero pending updates and 30 correct assignments per model. Current local server on port 3000 was also verified: the exact brown T-shirt query returns zero; glassware under 100 RON returns 48 matching products; pillows return 30 products using the pillow photo. The old duplicated-crop detail gallery is removed.

The marketplace migration is still unapplied in hosted Supabase. Migration 002 adds the new product-image allowlist to Studio SQL and is verified with migration 001 in PGlite, not represented as applied remotely. Catalog search/photos do not depend on Studio activation. No deployment, Stripe charge or secret change occurred.

## Environment and scope

Node.js 22.19.0, npm, Next.js 16.4.3 (upgraded from baseline 16.3.4), Chrome. Worktree was already dirty at the start; existing changes and `.env.local` were preserved. No deployment or Stripe charge was performed. The user's development process on port 3000 was retained. Production verification used a separate `.next-build` on port 3100. Restart that development process after the dependency upgrade.

## Executed commands

| Command | Observed result |
|---|---|
| `npm test` | 28/28 pass: 11 PostgreSQL/RLS tests and 17 contract/parser/checkout tests |
| `npm run typecheck` | Pass, strict TypeScript, no emit |
| `npm run lint` | Pass; generated Playwright/build artifacts excluded |
| `NEXT_BUILD_DIR=.next-build npm run build` | Pass; 41 generated pages, new Studio/maker/admin routes included |
| `E2E_BASE_URL=http://localhost:3100 npm run test:e2e` | 18/18 pass on the final production build, 30.9 s; includes clearly labeled mock editor transport |
| `npm run db:check` | 720 external products readable; marketplace migration not applied; no DATABASE_URL configured |
| `git diff --check` | Pass |
| `npm audit --omit=dev --audit-level=high` | 0 vulnerabilities after targeted Next.js and transitive dependency updates |
| Lighthouse production homepage | Final: 95 performance / 100 accessibility / 100 best practices / 100 SEO; actual HTML/JSON and report screenshot in docs/evidence |

The first browser run had a failing malformed-JSON test because Playwright serialized a string as valid JSON. Sending a raw Buffer fixed the test; the endpoint correctly returns INVALID_JSON. A lint run initially scanned generated report bundles; explicit generated-directory ignores resolved this configuration issue. These were repaired before the passing runs above.

The runtime dependency audit initially reported four advisories, including a critical advisory against the old Next.js package. Next.js and eslint-config-next were pinned to 16.4.3; sharp, source-map-js and baseline-browser-mapping were updated within their supported dependency ranges. No blind force upgrade was used. The final runtime audit reports zero. [Next.js advisory](https://github.com/advisories/GHSA-vcvr-r3jv-pc5j), [sharp advisory](https://github.com/advisories/GHSA-wq5f-xc86-pv6w). This is dependency remediation, not evidence that the application was exploited.

## What the tests prove

- The real migration executes on local PostgreSQL PGlite with roles, grants, SECURITY DEFINER functions and RLS. Auth users/JWT claims are local fixtures; no hosted Auth registration is implied.
- Two sellers apply, receive separate memberships, save different themes, publish snapshots and retain private drafts. Another seller cannot read drafts/versions or mutate products/layouts by forging a shop/product ID.
- A seller cannot promote itself, change membership, write product approval flags or call operator moderation. Suspended sellers cannot edit and public views remove their listings.
- Revision mismatch rejects a stale save. Direct SQL calls reject unapproved layout themes and remote media URLs.
- New seller products cannot use legacy checkout. Rejected orders roll back stock changes. Existing paid/expired reservation functions remain guarded and idempotent in the tested sequence.
- Budget ranges, exact product types, diacritic variants, linen/preposition distinction, negative materials, stock and personalization constraints parse correctly. Foreign currencies and contextless followups give an honest limitation.
- Checkout input rejects price/ownership tampering and invalid quantities. Unavailable lines are rejected rather than silently omitted.
- Browser tests cover real public search with Supabase, budget/type correctness, deep invalid pagination, anonymous API denial, HTML form submission without JavaScript and the static WebGL fallback.
- The editor browser tests use explicitly mocked HTTP/session transport to exercise rendering, autosave/reload, preview theme, keyboard reorder, publish and undo. Backend persistence/authorization are tested separately with PostgreSQL. This is not a real Supabase/Stripe seller onboarding E2E.
- The final editor test also verifies native desktop drag-and-drop. Mobile retains the touch/keyboard reorder buttons. Switching the active shop updates its URL, and Studio hides stale data belonging to a previous authenticated account.

## Not verified / not delivered

External migration and real two-seller Auth flow, own-image uploads/Storage RLS, actual buyer/seller/admin screenshots, concurrent multi-connection stock contention, Connect capability onboarding, mixed-seller charges/transfers/ledger, partial refunds/reversals/disputes, full password recovery, SSR cookies, LLM extraction, verified-purchase reviews, shipping integration, fiscal invoices and public PageSpeed. These remain explicit milestones in implementation-plan.md. No generated screenshot is represented as a paid order or live payout.

## Performance interpretation

Lighthouse uses local simulated mobile runs, not field measurements or production PageSpeed. Initial LCP was 5.5 s, CLS 0.002 and TBT 2,940 ms (48 performance). The report identified initial WebGL work, an account icon without a mobile accessible name and heading contrast. Changes defer mobile WebGL until interaction, add a real static vase render and high-priority image fetch, label the account link, and darken the heading accent.

Final run on Next.js 16.4.3: 30 October 2026, 14:34 Europe/Bucharest; performance 95, accessibility 100, best practices 100, SEO 100; LCP 2.8 s, CLS 0.002, TBT 60 ms. The LCP target of <=2.5 s is not met in this run; no field INP is available. An intermediate run scored 96 before the framework security update. Keep all three reports rather than presenting the best score as the final score.

Files: `lighthouse-home.report.*` (initial), `lighthouse-home-optimized.report.*` (intermediate), `lighthouse-home-final.report.*` (final), `lighthouse-final-summary.png`. Browser evidence is refreshed by the final Playwright run. No public PageSpeed result exists yet.

Final read-only external check still reports 720 products and `marketplaceMigrationApplied: false`. Apply the single supplied migration in Supabase SQL Editor, then repeat the actual two-account journey. Local SQL tests and mocked browser previews do not replace that staging acceptance step. Only the temporary owned production server was stopped; the user's existing development process was left in place.
