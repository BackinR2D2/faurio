# Fir de Poveste

Magazin B2C demonstrativ pentru produse handmade, construit cu Next.js 16 (Vinext), Three.js, GSAP și un adaptor server-side pentru Supabase. Include un checkout Stripe pregătit pentru test mode și un sandbox local implicit, astfel încât proiectul să poată fi evaluat fără credențiale sau tranzacții reale.

## Funcționalități

- căutare în limbaj natural cu interpretare de buget, categorie, ocazie, material și timp de livrare;
- catalog responsive cu categorii și filtre avansate;
- pagină de detaliu, stoc, promoții, favorite și coș persistent;
- cod promoțional `POVESTE10`;
- checkout electronic sandbox cu cardul de test `4242 4242 4242 4242`;
- înregistrarea comenzii, emiterea facturii și tipărire/salvare PDF;
- interfață de administrare demonstrativă pentru produse, stocuri, comenzi și utilizatori;
- experiență 3D Three.js și tranziții GSAP, cu suport pentru `prefers-reduced-motion`;
- API routes server-side pentru căutare, comenzi și inițializarea plății.

## Pornire locală

Necesită Node.js 22.13 sau mai nou.

```bash
npm install
npm run dev
```

Build de producție:

```bash
npm run build
npm start
```

## Supabase și Stripe

1. Creează un proiect Supabase și rulează `supabase/schema.sql` în SQL Editor.
2. Copiază `.env.example` în `.env.local` și completează valorile.
3. Pentru Stripe, adaugă o cheie `sk_test_...` în `STRIPE_SECRET_KEY`.

Fără aceste valori, site-ul rulează în demo mode: catalogul este seed-uit în aplicație, comenzile sunt păstrate în browser, iar plata sandbox emite un ID `pi_test_...` fără transfer de bani. Cheile de service sunt folosite numai server-side.

## Structură relevantă

- `components/storefront.tsx` — experiența B2C completă;
- `components/artisan-orbit.tsx` — scena Three.js interactivă;
- `lib/catalog.ts` — catalog și motorul de interpretare a căutării;
- `app/api/checkout/route.ts` — Stripe Checkout sau sandbox;
- `app/api/orders/route.ts` — persistență Supabase cu fallback demo;
- `supabase/schema.sql` — schema bazei de date;
- `DOCUMENTATIE_PROIECT.md` — documentația cerută pentru susținere.

Imaginile de produs din `public/products/` sunt generate special pentru acest proiect și sunt marcate în interfață drept demonstrative.
