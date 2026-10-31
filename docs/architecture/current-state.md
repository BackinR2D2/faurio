# Current state — 31 octombrie 2026

Runtime: Next.js 16.4.3, React 19.2.6, Supabase commerce/Auth/Storage, Groq, Stripe TEST Checkout + Connect Express, GSAP/Three.js. Existing dirty worktree and credentials preserved; no commits or external deployment created.

| Area | Local implementation | External activation |
|---|---|---|
| AI search | Strict Groq extraction, deterministic constraints, catalog-wide SQL scoring/pagination, shared cache/quota and fallback | Groq key verified with real requests; SQL migration still absent in hosted DB |
| Email | Gmail SMTP or Resend, paid-only outbox, uncertain SMTP handling, Supabase signup/recovery UI | SMTP credentials/dashboard setup and outbox migration still required |
| Creator marketplace | Membership/RLS, applications, moderated products, five-theme designer, own photo uploads | Marketplace/media migrations still required |
| Finance | 5.5% destination-charge application fee, seller orders/fulfillment, operator refund requests and webhook reconciliation | Connect enablement, onboarding and connected-account webhook still required; live keys refused |
| Buyer trust | Paginated order tracking, return requests, purchase/delivery-verified moderated reviews, real rating aggregates | Buyer-trust migration and real user/purchase tests required |
| Support | Backend-persisted contact/subscriptions, operator inbox, global/per-client form quotas | DB form-protection migration; no automated marketing campaigns |
| Production | Netlify configuration, GitHub CI, native Git-deploy guide, public smoke-test workflow | No Git remote or hosting identity supplied; no production URL tested |
| Legal/commercial readiness | Explicit test/fee terms and documented launch gates | Operator/trader details, fiscal integration, dispute processes, retention/backup/security review not completed |

Supabase is the only authoritative commerce store. Medusa migration, a priced product customizer, combined multi-maker payments and commercial live activation remain explicit future work. See [business model](../BUSINESS-MODEL.md) and [launch checklist](../PRODUCTION-LAUNCH.md).

## Historical baseline — 30 octombrie 2026

Repository inspected: `atelier-handmade`, Next.js 16.3.4 / React 19.2.6 / strict TypeScript. npm lockfile; existing dirty worktree preserved. Brand: Fir de Poveste. No AGENTS.md found in the project or parent directories. `.env.local` is ignored and has not been copied into documentation.

| Area at baseline | Status | Evidence / limitation |
|---|---|---|
| Catalog, product pages, filters, pagination | Implemented | `lib/products.ts`, `/catalog`, `/produs/[id]`; Supabase data, 24 results/page. Range-error fallback previously added. No deterministic tie-breaker. |
| Natural-language search | Partial | Local Romanian parser; no LLM. Missing minimum budget, exclusions, currency handling. |
| Authentication | Partial | Supabase password auth, browser sessions, bearer-verified API access. No SSR cookie session; reset sends email but lacks new-password form. |
| Cart / favorites / profile | Implemented | Browser guest state; authenticated Supabase merge. No customization line identity. |
| Payments | Partial | Hosted Stripe Checkout; server-loaded prices; SQL stock reservation, signed webhook, guarded paid/cancel transitions. No seller ownership, split orders, Connect, ledger or refund reconciliation. |
| Checkout robustness | Partial | Invalid JSON throws; unavailable cart lines silently removed; floating point totals; no client retry identity. Success page calls Stripe before persisting (not a blind URL confirmation), but payment finalization should be webhook-only. |
| Reviews | Missing | Seed supplies synthetic ratings/counts. These are fixture data, not verified reviews. |
| Admin | Partial | Server checks verified auth email against ADMIN_EMAILS. Inventory/order views; no seller or listing moderation/audit. |
| Sellers / ownership / RLS | Missing | Maker is a text label, not an account. Existing RLS protects customer records but has no tenant model. |
| Storefront designer | Missing | No shops, drafts, versions, themes or seller studio. |
| 3D / GSAP | Implemented, partial hardening | Direct Three.js, GLTF models, TrackballControls, DPR clamp, 30fps, visibility/reduced motion, cleanup. No R3F; no need to rewrite working scene to introduce sellers. Offscreen pause and WebGL failure fallback need work. |
| SEO / presentation | Partial | Product metadata, sitemap, robots, academic documentation. No measured PageSpeed/deployment evidence in this run. |
| Tests / CI / migrations | Missing | Baseline has lint/build only, monolithic schema/seed, no automated tenant tests. |

## Boundary of this delivery

Implement the first coherent marketplace slice: non-destructive legacy backfill, shop memberships and authorization, seller applications, moderated product CRUD, public maker pages, persisted draft/publish storefronts with version conflict checks, audited moderation, and repeatable PostgreSQL/RLS tests. Preserve single-operator checkout for the legacy shop; explicitly reject payment for new seller products until Connect and seller-order reconciliation are delivered. Never route seller funds into the legacy merchant flow.

Post-implementation evidence and remaining milestones live in `docs/implementation-plan.md` and `docs/TEST-REPORT.md`.
