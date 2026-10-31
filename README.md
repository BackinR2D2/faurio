# Faurio

Magazin B2C pentru produse handmade, în evoluție către un marketplace cu ateliere independente. Next.js, React, Supabase, Three.js, GSAP și Stripe.

Pilot public, plăți exclusiv TEST: [faurio-marketplace.netlify.app](https://faurio-marketplace.netlify.app). Stare și limitări: [activarea serviciilor](docs/ACTIVATION-STATUS.md). Emailurile și onboardingul vânzătorilor nu sunt încă validate end-to-end.

## Emailuri și identitate

Identitate Faurio, logo SVG și favicon în `public/brand` și `public/favicon.svg`. Confirmarea contului folosește Supabase Auth cu SMTP configurat în dashboard. Confirmarea comenzilor achitate folosește Gmail SMTP pentru POC sau Resend API, printr-un outbox privat; livrările SMTP incerte nu sunt reîncercate orbește. [Configurare completă, diagnosticarea erorii 500 și activarea emailurilor](docs/EMAIL-SETUP.md). `npm run email:check` nu trimite mesaje; `npm run email:dispatch` procesează notificările eligibile. Vezi [Gmail fără domeniu](docs/GMAIL-POC.md). SMTP Supabase și transportul aplicației se configurează separat; migrarea outbox este obligatorie.

Identificatorii existenți ai comenzilor, cheile locale pentru coș/favorite și slugurile istorice nu sunt rescrise de rebranding.

## Căutare și fotografii

Termenii necunoscuți rămân obligatorii chiar când cererea conține buget sau culoare; fără potrivire exactă nu se recomandă produse fără legătură. Catalogul are 24 de fotografii ilustrative distincte, potrivite celor 24 de modele demonstrative, asociate în Supabase celor 720 de ediții. Detalii, prompturi, sincronizare sigură și migrarea necesară selectorului Studio: [SEARCH-AND-PHOTOS.md](docs/SEARCH-AND-PHOTOS.md).

## Marketplace · implementarea din 31 octombrie 2026

- `/sell` — cerere de atelier asociată contului Supabase existent;
- `/studio` și `/studio/products` — apartenență la mai multe ateliere, produse proprii și trimitere la moderare;
- `/studio/appearance` — cinci teme, fonturi aprobate, secțiuni reordonabile, poveste/galerie/FAQ, autosalvare cu revizii, previzualizare, publicare și istoric;
- `/makers` și `/makers/[slug]` — doar ateliere active și versiuni publicate;
- `/admin/marketplace` — aprobări, retragerea listărilor, suspendări și audit;
- RLS și funcții SQL testate cu două identități; view-uri publice fără ciorne;
- fallback 3D static, încărcare la cerere pe mobil, pauză offscreen și suport fără WebGL;
- parser cu intervale de preț, excluderi de materiale, personalizare ca filtru strict și explicații pentru monede/deadline-uri neconfirmate.

**Stare verificată:** cele șapte migrări sunt aplicate în Supabase, iar căutarea Groq a fost verificată pe catalogul real. [ACTIVATION-STATUS.md](docs/ACTIVATION-STATUS.md) descrie verificările și pașii încă nefinalizați pentru Gmail, onboarding/webhook-uri Stripe și hosting. Nu rerula migrările, schema de bază sau seed-ul peste datele existente. [Ghid de lansare](docs/PRODUCTION-LAUNCH.md).

**Pilot financiar:** Stripe Connect Express cu checkout per atelier, 5,5% comision, comenzi/expediere și refund reconciliation sunt implementate; baza de date este activată, dar onboardingul și webhook-urile Stripe mai necesită configurare/testare. Uploaduri proprii, retururi, recenzii verificate/moderate și suport sunt incluse. Modul live este refuzat. Medusa, configuratorul de preț și plata comună multi-maker rămân milestone-uri deschise.

[Lansare și Git-deploy](docs/PRODUCTION-LAUNCH.md) · [Model business/ST1/ST2](docs/BUSINESS-MODEL.md) · [Căutare Groq](docs/AI-SEARCH.md) · [Instrucțiuni istorice](docs/DEPLOYMENT.md) · [Arhitectură și ADR](docs/adr/marketplace-architecture.md) · [Plan și stadiu](docs/implementation-plan.md) · [Raport teste](docs/TEST-REPORT.md) · [Prezentare ST3](docs/ST3-PRESENTATION.md).

## Funcționalități

- căutare strictă în limbaj natural, fără rezultate aproximative pentru cereri precise;
- 720 de produse seed, fotografii reprezentative, search AI opțional, catalog paginat server-side, filtre, sortare, favorite și pagini individuale;
- cont client prin Supabase Auth și stare sincronizată pentru coș și favorite; recovery cu formular de parolă nouă implementat; sesiunea browser/bearer rămâne, fără cookie SSR;
- profil, adresă, preferințe și istoric de comenzi;
- coș persistent, cod promoțional `POVESTE10` și checkout;
- Stripe Checkout găzduit, comandă `pending`, webhook semnat, confirmare idempotentă și actualizare atomică a stocului;
- document Stripe (fără afirmație de conformitate fiscală românească), stocuri, panou administrativ, contact și newsletter;
- pagini separate pentru blog, despre, livrare, termeni și confidențialitate;
- scenă Three.js și animații GSAP optimizate pentru `prefers-reduced-motion`.

## Rulare locală

Este necesar Node.js 22.13 sau mai nou.

```bash
npm install
npm run dev
```

Aplicația este disponibilă la `http://localhost:3000`.

```bash
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
npm start
```

## Configurare

1. Copiază `.env.example` în `.env.local`.
2. Pentru o bază nouă de staging/demo: rulează `supabase/schema.sql`, apoi `supabase/seed.sql`, apoi migrarea marketplace, în SQL Editor. Seed-ul creează 720 de produse demonstrative și nu trebuie rulat peste stocurile unui magazin activ.
3. Completează URL-ul proiectului, cheia publică, cheia `service_role` și `ADMIN_EMAILS`.
4. Adaugă cheia Stripe de test `sk_test_...` în `STRIPE_SECRET_KEY`.
5. În Stripe Workbench, creează un webhook către `/api/stripe/webhook` pentru `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed` și `checkout.session.expired`, apoi copiază secretul `whsec_...`.

Aplicația nu simulează autentificarea, baza de date sau plata. Fără variabilele externe afișează explicit starea neconfigurată. Cu Supabase și Stripe test configurate, checkout-ul redirecționează către pagina oficială Stripe. Pentru test se poate folosi cardul `4242 4242 4242 4242`, orice dată viitoare și orice CVC de trei cifre.

## Publicare

### Vercel

Importă repository-ul, selectează framework-ul Next.js și adaugă variabilele din `.env.example`. Comanda de build este `npm run build`.

### Netlify

Importă repository-ul ca proiect Next.js, folosește `npm run build` și adaugă aceleași variabile de mediu. Adapterul oficial Netlify pentru Next.js este detectat automat.

După publicare, setează `NEXT_PUBLIC_SITE_URL` la domeniul final și adaugă URL-urile de redirect în Supabase Auth.

## Structură

- `app` — pagini și rute API;
- `components` — interfață, magazin, autentificare și scena 3D;
- `lib` — catalog, căutare, Supabase și utilitare;
- `public/products` — imaginile produselor;
- `public/models` — modelele 3D locale și licențele lor;
- `supabase/schema.sql` — schema PostgreSQL, indexuri, politici RLS și funcția atomică de confirmare a plății;
- `supabase/seed.sql` — generatorul idempotent pentru 720 de produse;
- `DOCUMENTATIE_PROIECT.md` — documentația pentru prezentare.

Cheile secrete trebuie păstrate numai în variabilele de mediu ale serverului.
