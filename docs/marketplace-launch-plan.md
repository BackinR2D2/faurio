# Faurio marketplace launch — 2026-10-31

## Scope and sequence

- [x] Inspect existing Next.js/Supabase seller, search, payment, email and CI implementation.
- [x] Locate and read ST1/ST2; research current Groq, Gmail SMTP, marketplace fees and Stripe Connect documentation.
- [x] Add constrained Groq interpretation, catalog-wide database retrieval/ranking, bounded shared quotas/cache and honest no-key fallback.
- [x] Add institutional Gmail SMTP for transactional order email without weakening confirmation-email security.
- [x] Add Stripe-hosted seller onboarding, 5.5% seller commission, seller order/fee records and payment-status reconciliation.
- [x] Improve creator media uploads and storefront customization within tenant permissions.
- [x] Add deployment/preflight instructions, Git push CI and production smoke-test support.
- [x] Add purchase/delivery-verified moderated reviews, buyer tracking/returns, operator support and public-form protection.
- [x] Run unit, PostgreSQL/RLS, browser, type and production-build checks; record gaps precisely.

## External activation remains pending

- [ ] Apply seven SQL migrations to hosted Supabase after backup/project confirmation.
- [ ] Configure authorized Gmail SMTP in application and Supabase; verify confirmation/recovery and actual purchase email delivery.
- [ ] Enable Stripe Connect TEST, connected-account webhook and real test seller onboarding/payment/refund reconciliation.
- [ ] Set retry secret, GitHub remote and hosting integration; configure HTTPS URLs and run public smoke/PageSpeed checks.
- [ ] Review legal/fiscal/security/backup obligations before any commercial/live launch.

## Defaults

Faurio charges 550 basis points on discounted products, excluding shipping. This is a service commission, not a government tax. No listing/subscription fee or buyer surcharge. Stripe processing/Connect costs are platform expenses, so commission revenue is not profit. All third-party payments stay in test mode unless the operator explicitly enables a separately reviewed live launch.

Each Stripe-hosted checkout settles one maker's order. A cart may contain several makers but must select a maker to pay; paid items alone are removed. A single combined multi-maker charge is deferred rather than routing other makers' funds to the operator. Refunds use Stripe transfer/application-fee reversal and must reconcile into the order ledger.

## External activation

SMTP App Password, Groq key, Stripe Connect enablement, database migrations and GitHub/hosting account access are not assumed present. Local code and mocked tests do not prove live delivery, KYC, payouts or production deployment. Do not print secrets, disable email confirmation, auto-approve sellers or turn on live charges to bypass those requirements.
