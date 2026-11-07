# Faurio

Marketplace de produse handmade. Pilot public cu plăți exclusiv TEST: [faurio-marketplace.netlify.app](https://faurio-marketplace.netlify.app).

Next.js App Router, React, TypeScript, Supabase Auth/PostgreSQL/Storage, Groq, Three.js, GSAP și Stripe Checkout/Connect. Catalogul inițial are 720 de ediții demonstrative și 24 de fotografii ilustrative, nu fotografii individuale ale fiecărei ediții.

## Rulare

Node.js 22.13 sau mai nou. Copiază `.env.example` în `.env.local` și completează valorile local; nu publica fișierele de mediu.

```bash
npm ci
npm run dev
```

Deschide [localhost:3000](http://localhost:3000).

```bash
npm run typecheck
npm test
npm run test:e2e
npm run build
```

Testele de browser marchează explicit transporturile simulate cu MOCK. Fluxul `pilot.live.spec.ts` poate crea date numai dacă activezi intenționat `LIVE_PILOT_E2E=1`; nu îl folosi pentru un control read-only al producției.

## Funcționalități

- Căutare în limbaj natural pe inventarul publicat, filtre și paginare; fallback strict după cuvinte-cheie numai la depășirea cotei.
- Cont cu confirmare email, recuperare parolă, profil, coș și favorite sincronizate.
- Ateliere independente, editor de pagină, fotografii proprii, produse și moderare.
- Plată găzduită, rezervare atomică a stocului, webhook-uri semnate și notificări cu outbox.
- Încasări prin conturi conectate de test, comision de 5,5% din produse și plăți separate per atelier.
- Comenzi, pregătire, curier/urmărire introduse de vânzător, retururi și recenzii după livrare.
- Administrare, jurnal, contact, termeni și confidențialitate.
- Șapte obiecte 3D locale, alternare aleatorie, control tactil/tastatură și mișcare redusă.

Configurarea contului conectat trebuie terminată personal de titular. Revenirea din onboarding nu dovedește singură că încasările sunt activate. Integrarea curierilor pentru generarea automată a AWB-ului și facturarea fiscală nu sunt implementate. Codul refuză cheile de plată live.

## Documentație

- [Configurare, migrări și publicare](docs/PRODUCTION-LAUNCH.md)
- [Gmail SMTP pentru pilot](docs/GMAIL-POC.md)
- [Căutarea și limitele ei](docs/AI-SEARCH.md)
- [Modelul de afaceri](docs/BUSINESS-MODEL.md)
- [Prezentare ST3](docs/ST3-PRESENTATION.md)
- [Scenariu de demonstrație](docs/DEMO-SCRIPT.md)
- [Raport de verificare](docs/TEST-REPORT.md)
- [Sursele modelelor 3D](public/models/ATTRIBUTION.md)

`app/`: pagini și API; `components/`: interfață; `lib/`: logică și integrări; `supabase/`: schema și migrările; `tests/`: teste.

GitHub → Netlify publică la push pe `main`. Variabilele server-side rămân în hosting. Nu rerula schema, seed-ul sau migrări deja aplicate peste baza existentă. Backup-urile private sunt excluse din Git.
