# Faurio — prezentare ST3

## Model și tehnologie

Marketplace B2C pentru produse handmade: ceramică, sticlărie, textile, lumânări, bijuterii, lemn, decorațiuni și papetărie. Venitul propus este un comision de 5,5% reținut vânzătorului din produse, fără taxă de listare sau suprataxă de platformă pentru cumpărător.

Implementare: Next.js, React, TypeScript, Supabase Auth/PostgreSQL/Storage, Groq, Three.js, GSAP și Stripe Checkout/Connect TEST. [Site public pe Netlify](https://faurio-marketplace.netlify.app). Sursele sunt în repository-ul privat GitHub `BackinR2D2/faurio`.

ST1/ST2 originale sunt păstrate separat de repository. [Modelul de afaceri](BUSINESS-MODEL.md) explică evoluția de la magazin centralizat la marketplace și abaterea de la alegerea Medusa din ST2: runtime-ul implementat folosește Supabase, nu Medusa. Capturile și documentele originale se atașează la predare.

## Cerințe și demonstrație

| Cerință | Locul demonstrației |
|---|---|
| Site public, DB și server | Netlify, Supabase și route handlers Next.js |
| Navigare, catalog și categorii | `/`, `/catalog` |
| Detalii, preț și fotografie | `/produs/[id]` |
| Coș și actualizare | `/cos` |
| Cont confirmat și comenzi | `/cont`, `/cont/profil` |
| Stocuri și promoții | Produs, checkout, administrare |
| Plată electronică testată | Checkout găzduit și comanda confirmată prin webhook |
| Documentul plății | Confirmare / istoric; nu factură fiscală certificată |
| Administrare | `/admin`, `/admin/marketplace`, `/admin/feedback` |
| Personalizare reprezentativă | `/studio/appearance`, pagina publică `/makers/[slug]` |
| Încasări pentru creator | `/studio/payments`, onboarding TEST și eligibilitate confirmată de server |
| Performanță | Captură PageSpeed pe URL-ul public |

Catalogul inițial este demonstrativ: 720 de ediții și 24 de imagini ilustrative. Capturile care încep cu MOCK sunt probe de interfață cu transport simulat, nu dovezi ale unei încasări.

## Originalitate

- Povestea cumpărătorului este interpretată în cerințe și recomandări din inventarul existent. Tipul, bugetul, culorile, materialele și excluderile restrâng rezultatele înainte de paginare.
- Fiecare creator personalizează independent tema, tipografia, secțiunile și conținutul atelierului, cu autosalvare, ciornă și publicare versionată.
- Intrarea este axată pe căutare și șapte obiecte 3D interactive, cu texturi locale și tranziții discrete.

## Limitele pilotului

Plățile și încasările sunt TEST. Un titular trebuie să termine personal onboardingul; redirectul de revenire nu este dovadă de activare. Generarea AWB prin API de curier, facturarea fiscală și activarea comercială live rămân lucrări distincte. Interpretarea limbajului natural este probabilistică, iar serviciile gratuite au cote.

Pentru predare: capturi pentru fiecare cerință, captură PageSpeed public, [scenariul de demonstrație](DEMO-SCRIPT.md) și [raportul verificărilor](TEST-REPORT.md). Arhiva `site_nume_prenume.zip` exclude secretele și backup-urile.
