# Rulare, migrare și publicare

> Ghidul actual pentru 31 octombrie 2026 este [PRODUCTION-LAUNCH.md](PRODUCTION-LAUNCH.md): toate cele șapte migrări, Gmail fără domeniu, Groq, Stripe Connect cu 5,5%, uploads, review/retur și GitHub → Netlify/Vercel. Secțiunile de mai jos păstrează contextul livrării din 30 octombrie și nu mai definesc limita financiară actuală.

## Ce rulează acum

Next.js este aplicația și BFF-ul. Supabase găzduiește Auth și PostgreSQL. Stripe Checkout rămâne integrarea de test a magazinului inițial. Nu există încă Medusa, Stripe Connect sau worker de transferuri. Nu este necesară o cheie AI pentru căutarea locală.

Node.js >=22.13, npm și Chrome sunt suficiente pentru verificările de mai jos. Nu am publicat o nouă versiune externă în această livrare.

```bash
cd /Users/cristianniculae/Desktop/projects/ae_proj/atelier-handmade
npm ci
npm run dev
```

Nu suprascrie `.env.local` existent. Pentru un checkout nou, copiază `.env.example` în `.env.local` și completează:

| Variabilă | Rol |
|---|---|
| NEXT_PUBLIC_SITE_URL | `http://localhost:3000` local; domeniul HTTPS final la publicare |
| NEXT_PUBLIC_SUPABASE_URL | URL proiect Supabase |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Publishable key sau vechiul anon |
| SUPABASE_URL | Același URL, acces server |
| SUPABASE_SERVICE_ROLE_KEY | Secret key sau vechiul service_role, exclusiv server |
| STRIPE_SECRET_KEY | `sk_test_...`; această livrare refuză chei live |
| STRIPE_WEBHOOK_SECRET | `whsec_...` al endpointului de test corect |
| ADMIN_EMAILS | Lista de adrese confirmate permise ca operatori |

Nu sunt necesare alte chei pentru Studio. Folosește Confirm Email și SMTP propriu pentru înscrieri publice; emailurile trebuie confirmate înainte de administrare. Dashboard Supabase → Authentication → URL Configuration: permite `/cont/profil` și `/cont` pe domeniul local și cel public. Autentificarea actuală folosește sesiunea browserului și JWT bearer pentru API, nu cookie SSR.

Actualizare Faurio: recuperarea parolei folosește acum `/cont/parola`; adaugă explicit și această cale în Redirect URLs. Emailurile comenzilor plătite folosesc RESEND_API_KEY, EMAIL_FROM, opțional EMAIL_REPLY_TO și migrarea `202610300003_order_emails.sql`. CRON_SECRET protejează reîncercările. [Instrucțiuni SMTP, DNS, activare și diagnostic](EMAIL-SETUP.md). Aceste chei sunt separate de configurarea SMTP Supabase din dashboard.

## Activarea marketplace-ului în baza existentă

Verificarea read-only din 30 octombrie 2026 a găsit 720 de produse și schema marketplace încă neaplicată. Variabilele existente oferă acces REST, fără DATABASE_URL pentru migrare SQL. Nu s-a executat DDL extern automat. Actualizarea ulterioară a fotografiilor demonstrative, autorizată separat, este descrisă în `SEARCH-AND-PHOTOS.md`.

1. În Supabase confirmă că lucrezi pe proiectul de staging/test corect și fă un backup prin mecanismul disponibil contului. Pentru un server cu acces Postgres, folosește `pg_dump` și verifică restaurarea într-o bază separată.
2. Deschide SQL Editor → New query.
3. Rulează integral, în ordine, `supabase/migrations/202610300001_marketplace.sql`, apoi `supabase/migrations/202610300002_product_media.sql`. Prima migrare se aplică o singură dată. Fișierele sunt tranzacționale: o eroare anulează modificările acelei execuții. Nu elimina `begin`/`commit` și nu executa doar fragmente. A doua migrare permite noile fotografii în salvările Studio.
4. Rulează `npm run db:check`. `marketplaceMigrationApplied` trebuie să fie `true`, iar catalogul trebuie să păstreze cele 720 de produse.
5. Reîncarcă aplicația. `/makers/fir-de-poveste` prezintă catalogul migrat. Nu există membri atribuiți automat atelierului legacy și nicio persoană nu primește acces pe baza etichetei textuale `maker`.
6. Creează două conturi de test prin `/cont`, confirmă emailurile și trimite câte o cerere prin `/sell`.
7. Intră cu un cont confirmat din ADMIN_EMAILS la `/admin/marketplace`; aprobă cele două ateliere cu un motiv.
8. În fiecare cont de creator, folosește `/studio/appearance` și `/studio/products`; publică pagina, trimite piesele la verificare, apoi aprobă listările din contul operatorului.
9. Vizitează `/makers/[slug]` și verifică izolarea și persistența. Plățile noilor ateliere vor rămâne dezactivate, explicit.

Pentru o bază complet nouă: `supabase/schema.sql`, apoi numai în staging/demo `supabase/seed.sql`, apoi migrarea. Nu rula schema de bază sau seed-ul peste un marketplace deja migrat: seed-ul resetează intenționat stocurile și metadatele demonstrative, iar schema veche reconfigurează politicile inițiale. Modificările viitoare se fac prin migrații noi.

## Ce schimbă migrarea

Adaugă shops, memberships, applications, page drafts, published versions și audit. Completează `products.shop_id` cu un atelier legacy, păstrând ID-uri, prețuri, stocuri și comenzi. Adaugă listing_status, rating_source și personalizable. View-urile publice conțin doar pagini publicate, ateliere active și produse aprobate. Drafturile și versiunile sunt citite numai de membrii curenți; scrierile trec prin funcții autorizate. Moderarea este exclusiv service_role prin API cu operator verificat.

O comandă nouă este refuzată tranzacțional dacă include un produs din afara atelierului legacy. Inventarul rezervat de funcția veche revine la valoarea anterioară dacă verificarea eșuează. Nu există două pipeline-uri de comenzi.

## Rollback fără pierdere de date

Înainte de activare: revino la versiunea precedentă de cod; fără migrarea aplicată, magazinul de bază continuă să funcționeze. După activare: păstrează schema, versiunile, auditul și comenzile. Dacă este nevoie de oprirea temporară a noilor ateliere, operatorul le restricționează din admin; nu șterge tabele sau utilizatori. Un rollback de cod vechi care ocolește view-urile publice nu este sigur după apariția produselor unor creatori: folosește un release cu filtrarea marketplace păstrată. Restaurarea completă din backup cere o fereastră de mentenanță și reconcilierea comenzilor/Stripe după momentul backupului.

## Teste

```bash
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

`npm test` rulează Zod/parser/checkout și PostgreSQL PGlite cu roluri și politici RLS reale. Auth schema din test este o fixture locală, nu Supabase Auth. Nu contactează Stripe și nu mută bani.

Playwright folosește Chrome instalat; pe CI: `npx playwright install --with-deps chrome`. Scenariile publice folosesc serviciul configurat, dacă există. `editor.mock.spec.ts` interceptează transportul API și sesiunea doar în contextul browserului de test; nu demonstrează înregistrări Supabase sau publicare externă. Capturile respective au prefixul `MOCK-`.

Pentru alt server: `E2E_BASE_URL=http://localhost:3100 npm run test:e2e`. Pentru un build separat de serverul de dezvoltare: `NEXT_BUILD_DIR=.next-build npm run build`, apoi `NEXT_BUILD_DIR=.next-build npm start -- --port 3100`.

## Stripe legacy în test

```bash
stripe login
stripe listen --events checkout.session.completed,checkout.session.async_payment_succeeded,checkout.session.async_payment_failed,checkout.session.expired --forward-to localhost:3000/api/stripe/webhook
```

Folosește secretul listenerului în STRIPE_WEBHOOK_SECRET și repornește serverul. Card de test: 4242 4242 4242 4242, dată viitoare, CVC de test. Nu s-a executat o plată Stripe în această livrare. În producție/staging public, creează un endpoint Snapshot în Workbench la `https://DOMENIU/api/stripe/webhook`, cu propriul secret.

## Vercel și etapa financiară viitoare

Pentru acest slice: importă repository-ul privat în Vercel, framework Next.js, Node 22, `npm ci`, `npm run build`, start gestionat de platformă. Adaugă cele opt variabile, actualizează site URL și redirecturile Auth, aplică migrarea în staging înaintea testului cu vânzători, apoi redeploy. `/api/health` verifică procesul; `npm run db:check` verifică separat dependența DB. Alege o regiune apropiată proiectului Supabase. Nu există o integrare Storage pentru fotografii proprii încă: imaginile sunt din biblioteca locală permisă.

Vercel + Supabase este suficient pentru Studio și RSC. Vercel + Railway/Render + Redis devine justificat numai la adoptarea Medusa/worker. Medusa nu poate fi tratat ca un job serverless de lungă durată. Înainte de acel release: verifică identitatea comercială a platformei și sellerilor, Accounts v2/capabilități, RON/țări, comisioane, cine facturează, TVA, retururi și reconcilierea refund/transfer. Documentul Stripe nu este o garanție de conformitate fiscală românească.
