# Faurio — GitHub, integrare și pilot public

Actualizat: 7 noiembrie 2026. Acest ghid este pentru un pilot public cu plăți Stripe TEST. Publicarea pe internet nu echivalează cu autorizarea comercială sau cu testarea încasărilor reale.

Starea verificărilor este în [TEST-REPORT.md](TEST-REPORT.md). Cele zece migrări de mai jos sunt aplicate în `ae_proj`. NU le executa din nou acolo. Instrucțiunile rămân valabile pentru o bază nouă sau migrări încă neaplicate.

## 1. Activează baza de date existentă

Verificarea inițială a găsit catalogul de bază, dar nu tabelele marketplace. Acestea au fost activate ulterior prin SQL Editor, după confirmare și snapshot privat. Pentru o instalare nouă, confirmă proiectul Supabase de test și fă backup. În SQL Editor rulează integral, în ordine, doar migrările neaplicate:

1. `supabase/migrations/202610300001_marketplace.sql`
2. `supabase/migrations/202610300002_product_media.sql`
3. `supabase/migrations/202610300003_order_emails.sql`
4. `supabase/migrations/202610310001_ai_search.sql`
5. `supabase/migrations/202610310002_connect_and_fees.sql`
6. `supabase/migrations/202610310003_shop_media.sql`
7. `supabase/migrations/202610310004_buyer_trust.sql`
8. `supabase/migrations/202611010001_shop_lifecycle.sql` — închidere numai de proprietar, cu păstrarea istoricului și blocare pentru comenzi/retururi deschise.
9. `supabase/migrations/202611060001_search_constraints.sql` — excluderi de tip/culoare și alternative explicite de culori/materiale.
10. `supabase/migrations/202611070001_catalog_multi_filters.sql` — selecții multiple de categorii, materiale și tipuri; intervale de preț manuale, aplicate înainte de numărare și paginare.

Nu rula din nou `schema.sql` sau `seed.sql` peste datele existente. Nu executa o migrare deja aplicată. Migrarea media creează bucket-ul privat `shop-media`; numai serverul poate încărca în el. Fotografiile sunt servite la adrese publice `/media/[uuid].webp`, inclusiv în ciornă, lucru explicat înainte de upload. Nu încărca date personale. Sunt limitate la 30 de fișiere/zi și 200/atelier, input 5 MB, 16 milioane pixeli, WebP maximum 1600 × 1600 fără metadate.

Rulează `npm run launch:check`. Este read-only și nu afișează chei. Valori `false` sau exit code 2 înseamnă configurare incompletă, nu permisiune de a ocoli verificările. Repornește serverul după actualizarea variabilelor.

Migrarea financiară include retry identity durabil și o singură tranzacție pentru stoc, comanda pending și fee snapshots. Reîncercările aceluiași formular reiau sesiunea Stripe existentă; modificarea formularului creează altă încercare. Stocul nu este rezervat de două ori la replay. Cotele se aplică și noilor încercări checkout, nu reluării unei sesiuni salvate.

## 2. Email fără domeniu

Urmează [GMAIL-POC.md](GMAIL-POC.md): App Password în contul instituțional autorizat, `EMAIL_PROVIDER=smtp`, SMTP și expeditor identice în `.env.local`; aceeași căsuță în SMTP Settings din Supabase. Păstrează confirmarea emailului activă. `npm run email:verify` verifică doar conexiunea, nu trimite email. `npm run email:check` verifică configurația/outbox. Cron-ul folosește un `CRON_SECRET` aleator de minimum 32 de caractere. Nu trimite marketing din căsuța instituțională.

## 3. AI

Configurează `GROQ_API_KEY` server-side și `GROQ_MODEL=openai/gpt-oss-120b`. `GROQ_DAILY_SEARCH_LIMIT=200` controlează apelurile noi; cache o oră, cotă comună în DB. Fiecare query nevid folosește interpretarea modelului sau cache-ul ei; fără serviciu, căutarea eșuează explicit, fără rezultate de substituție. Catalogul fără query rămâne disponibil. `npx tsx scripts/check-groq.ts` face apeluri REALE pentru evaluare, fără scrieri DB sau chei în output. Testul de interpretare nu dovedește că migrarea SQL este activă. Vezi [AI-SEARCH.md](AI-SEARCH.md).

## 4. Stripe Connect TEST

1. Activează Connect în contul Stripe de test și configurează identitatea/brandingul onboardingului găzduit. Nu este necesar să colectezi IBAN sau acte în Faurio. Sunt folosite Accounts v1 Express din SDK-ul existent pentru integrarea incrementală; Stripe continuă să documenteze această cale. Nu există conturi v2 false sau conversii automate de conturi.
2. Păstrează `STRIPE_SECRET_KEY=sk_test_…`. Codul refuză toate cheile live. Configurează `STRIPE_CONNECT_ENABLED=true` numai după migrare.
3. Configurează endpointul de evenimente al platformei la `/api/stripe/webhook`: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `charge.refunded`, `application_fee.refunded`. Secretul său este `STRIPE_WEBHOOK_SECRET`.
4. Configurează separat evenimentele pentru connected accounts, `account.updated`, la `/api/stripe/connect`. Secretul său este `STRIPE_CONNECT_WEBHOOK_SECRET`, nu secretul webhook-ului platformei.
5. Creează și confirmă un cont de creator; `/sell` → aplică; operatorul din `ADMIN_EMAILS` aprobă atelierul la `/admin/marketplace`.
6. Publică pagina din `/studio/appearance`, trimite produse la verificare și aprobă-le din contul operatorului. În `/studio/payments`, titularul acceptă politica de 5,5% și completează onboardingul Stripe cu datele de test indicate în documentația Stripe. Reîntoarcerea în aplicație NU este dovadă de verificare: serverul recitește capabilities, charges_enabled și payouts_enabled.
7. Verifică o comandă reală în modul test cu cardul Stripe de test 4242 4242 4242 4242, o dată viitoare și CVC de test. Confirmă Stripe Checkout, rezervarea stocului, webhook, o singură comandă achitată, application fee, transfer către contul conectat, email și `/studio/orders`.
8. Operatorul poate solicita o rambursare test la `/admin/finance`; requestul Stripe include reverse_transfer și refund_application_fee. Webhook-ul recitește sumele Stripe și reconciliază ledger-ul fără a scădea din nou la replay. Rambursările făcute manual în Stripe trebuie să includă inversările necesare; aplicația nu poate presupune că ele au fost cerute. O rambursare nu readaugă automat produsul în stoc înaintea primirii fizice/inspecției.

Acest pilot face o plată găzduită per atelier; nu promite un singur payment intent pentru mai mulți vânzători. Fee snapshots sunt în bani întregi, 550 bps din produse după reduceri, fără comision pe transport. Atelierul legacy este propriul operator, fără transfer/commission artificial către sine. Verifică eligibilitatea țării și responsabilitatea platformei în contul Stripe înainte de extindere.

Surse: [hosted onboarding](https://docs.stripe.com/connect/hosted-onboarding), [destination charges](https://docs.stripe.com/connect/destination-charges?platform=web&ui=stripe-hosted), [marketplace risks](https://docs.stripe.com/connect/marketplace).

## 5. GitHub fără secrete

Repository privat: `BackinR2D2/faurio`, configurat ca `origin`. Verifică explicit că `.env.local`, tokenurile, adresele clienților și dump-urile DB NU sunt tracked. `.gitignore` exclude `.env*`, cu excepția `.env.example`, și documentul local cu instrucțiuni de implementare. Nu publica istoricul unui repository dacă a conținut anterior chei; revocă-le și curăță istoricul înainte de publicare.

```bash
git status --short
git ls-files '.env*'
git remote add origin ADRESA-REPOSITORY-ULUI-TAU
git push -u origin NUMELE-BRANCHULUI-TAU
```

Comenzile sunt exemple pentru clone noi. Repository-ul existent are deja remote și sursele au fost încărcate pe `main`. Commitul trebuie să includă sursele/migrările/testele/configurațiile necesare, nu doar ultimul diff. Build-urile, `.netlify`, node_modules și fișierele de mediu nu se comit.

## 6. Hosting și redeploy la fiecare push

Pentru un pilot comercial fără abonament, preferă Netlify Free în limita creditelor. Netlify permite proiecte comerciale pe Free; cotele și termenii pot schimba disponibilitatea. Vercel Hobby este doar personal/non-comercial: bun pentru demonstrația universitară, nu pentru un magazin real cu venit. [Netlify Free](https://www.netlify.com/blog/introducing-netlify-free-plan/), [limitele actuale](https://www.netlify.com/pricing/), [Vercel](https://vercel.com/pricing).

### Netlify

Add new project → Import existing project → GitHub → selectează repository-ul privat. Framework Next.js, Node 22, build `npm run build`, output `.next` (configurate în `netlify.toml`). Adaptorul Next.js este aplicat de Netlify; nu folosi static export. Importă variabilele din `.env.local` prin dashboardul de secrete, nu prin commit. Vei primi o adresă `https://NUME.netlify.app` fără domeniu cumpărat. Next.js SSR, route handlers, optimizarea imaginilor și `after` sunt [suportate de adaptor](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/); integrarea efectivă trebuie verificată printr-un deploy al acestui repository.

### Vercel pentru demo necomercial

Import Project → GitHub → framework Next.js → Node 22 → aceleași variabile. Primești `https://NUME.vercel.app`. Nu utiliza acest plan pentru vânzări comerciale. [Git integration](https://vercel.com/docs/git/vercel-for-github).

### Actualizare automată

CI folosește valori publice Supabase fictive pentru testele UI cu transport mock și nu are chei server-side. Testele care necesită catalogul real sunt omise explicit în CI dacă nu există un staging securizat. Deploy-ul providerului folosește propriile variabile reale din dashboard, nu artifactele de test CI.

Conectarea GitHub activează redeploy-urile native pe push. Producția urmărește branch-ul ales (de regulă `main`); alte branch-uri primesc deploy previews. Nu se repornește manual un server persistent: providerul construiește și publică o versiune nouă. `.github/workflows/ci.yml` rulează typecheck, lint, teste, build și browser checks la push/PR. Activează branch protection și cere verificarea CI înainte de merge pentru a nu promova cod neverificat. Deploy-urile native nu sunt implicit blocate de toate check-urile GitHub; nu confunda cele două mecanisme. Previews nu trebuie să primească date/chei live.

## 7. Configurarea URL-urilor după primul deploy

Setează `NEXT_PUBLIC_SITE_URL` la URL-ul HTTPS canonic și redeploy. În Supabase setează Site URL și allowlist explicit `/cont/profil`, `/cont/parola`. Păstrează localhost doar pentru dezvoltare; evită wildcard-uri de preview pentru autentificarea reală. Configurează cele două webhook-uri Stripe la URL-ul public și actualizează secretele endpointurilor. Listenerul Stripe local are alte secrete. Secretele trebuie să fie disponibile funcțiilor serverului, nu `NEXT_PUBLIC_*`.

În GitHub → Settings → Secrets and variables → Actions adaugă variabila `FAURIO_URL` (URL-ul public) și secretul `FAURIO_CRON_SECRET` identic cu `CRON_SECRET` din hosting. Workflow-ul de retry la cinci minute este best-effort, nu coadă cu SLA și nu garantează un email la o secundă fixă. Joburile `uncertain` necesită verificare manuală. Free-tier quotas ale GitHub/hosting/email pot opri retries; monitorizează outbox-ul.

## 8. Verificare publică

```bash
FAURIO_URL=https://NUME.netlify.app npm run test:production
```

Sau pornește manual workflow-ul `Verify public Faurio deployment` din GitHub Actions. Acesta verifică HTTPS, paginile publice, căutarea precisă, paginarea și refuzul accesului anonim. Nu face plăți sau înregistrări și nu șterge date. Testele complete de email, seller onboarding, payout, charge/refund, upload și persistență trebuie executate separat, cu conturi Stripe de test și utilizatori consimțitori. Salvează PageSpeed pentru URL-ul public, desktop/mobil; nu înlocui rezultatul de producție cu un scor local vechi.

## 9. Încredere și suport

Cont → Comenzi oferă istoric paginat, pregătire, curier și urmărire; cereri de retur/retragere persistente și recenzii după livrare. Înregistrarea returului nu promite o rambursare și nu cere motiv justificativ. Recenziile necesită achiziție a produsului și nu pot proveni din autocomenzile atelierului. `/admin/feedback` moderează recenzii/retururi și arată mesajele Contact; numai recenziile aprobate generează ratinguri publice.

Contact/Newsletter au validare, same-origin, body limit și cote DB comune: 200/zi per formular și 10/oră per identificator. Netlify/Vercel folosesc headerul providerului; alte medii împart limita fallback. HMAC-ul traficului se rotește zilnic, nu stochează IP-ul brut și se curăță după două zile la următoarea utilizare. Acest POC nu înlocuiește firewall/CAPTCHA/DDoS protection. Newsletterul salvează cereri de abonare, fără campanii automate. `SUPPORT_EMAIL` este afișat public doar dacă îl configurezi intenționat.

## 10. Gata de pilot vs. gata de afacere

Rămân necesare: verificare legală/fiscală pentru operator și comercianți, politici de retur și retragere operaționale, profiluri de comerciant și date obligatorii validate, facturare fiscală/TVA, dispute și chargebacks, monitorizare, alertare, backup/restaurare testată, managementul ștergerii datelor/media și un audit de securitate. Stripe test nu este o autorizare de marketplace și nu probează settlement bancar real. [Cerințe UE pentru vânzări la distanță și marketplace](https://europa.eu/youreurope/business/selling-in-eu/selling-goods-services/ecommerce-distance-selling/index_en.htm), [transparența marketplace](https://commission.europa.eu/topics/consumers/consumer-rights-and-complaints/enforcement-consumer-protection/coordinated-actions/market-places-and-digital-services_en).
