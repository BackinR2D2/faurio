# Faurio · configurarea emailurilor

## Cele două fluxuri

| Mesaj | Cine îl trimite | Configurare |
|---|---|---|
| Confirmare cont, retrimitere confirmare, recuperare parolă | Supabase Auth → Resend SMTP | Dashboard Supabase |
| Confirmare comandă achitată | Next.js → Resend API | `.env.local`, migrarea outbox și webhook Stripe |

Un API key pus doar în `.env.local` nu configurează SMTP-ul Supabase. Setările SMTP nu trimit automat emailuri despre comenzi.

## 1. Domeniu verificat în Resend

Folosește un domeniu pe care îl deții. De exemplu, adaugă `mail.yourdomain.ro` în Resend → Domains, apoi copiază în DNS toate înregistrările cerute de Resend pentru trimitere. Exemplul nu este un domeniu rezervat pentru proiect: înlocuiește-l peste tot cu al tău. Nu înlocui la întâmplare MX-ul căsuței de email existente și nu crea înregistrări SPF duplicate pe același nume.

Așteaptă starea Verified. Pentru Auth, dezactivează click tracking ca linkurile de unică folosință să nu fie rescrise. Creează o cheie cu drept de trimitere pe domeniul verificat. Poți folosi chei separate pentru Auth și comenzi. Resend nu este implicit și o căsuță de email pentru răspunsuri: setează un Reply-To pe care chiar îl citești.

`onboarding@resend.dev` permite doar teste către adresa contului Resend. Nu este o soluție pentru clienți. Un subdomeniu gratuit Vercel/Netlify nu este un domeniu de email pe care îl poți verifica prin DNS.

Surse: [domenii Resend](https://resend.com/docs/dashboard/domains/introduction), [restricția resend.dev](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain).

## 2. Repararea erorii de înregistrare

Eroarea observată este `500 unexpected_failure: Error sending confirmation email`. Ea identifică eșecul trimiterii de către Supabase Auth, nu cauza SMTP exactă. Nu s-au citit setările private ori logurile Auth ale contului. În Supabase → Authentication → Email → SMTP Settings, activează Custom SMTP:

| Câmp | Valoare |
|---|---|
| Sender name | Faurio |
| Sender email | `cont@mail.yourdomain.ro` — exact domeniul verificat |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | cheia API Resend, nu parola contului |

Salvează. Păstrează Email provider și Confirm email active. Nu dezactiva confirmarea ca să ascunzi eroarea.

În Authentication → URL Configuration setează Site URL `http://localhost:3000` pentru testul local și permite:

```text
http://localhost:3000/cont/profil
http://localhost:3000/cont/parola
```

La publicare, setează Site URL la domeniul HTTPS al aplicației și adaugă aceleași căi cu domeniul final. Nu este obligatoriu ca domeniul aplicației să fie același cu domeniul expeditorului.

Păstrează linkurile din template-urile Confirm signup și Reset password bazate pe `{{ .ConfirmationURL }}`. Nu trimite utilizatorul direct la homepage fără verificarea tokenului. Poți seta numele/subjectele Faurio în template-uri. Opțional, activează notificările de securitate pentru schimbarea parolei.

Surse: [Resend SMTP pentru Supabase](https://resend.com/docs/send-with-supabase-smtp), [redirecturi](https://supabase.com/docs/guides/auth/redirect-urls), [template-uri](https://supabase.com/docs/guides/auth/auth-email-templates).

### Dacă eroarea 500 continuă

Deschide Auth Logs în Supabase la ora solicitării, apoi logurile Resend. Verifică domeniul From, permisiunea cheii pentru acel domeniu, parola SMTP și rate limits. Dacă Supabase raportează o respingere SMTP înainte ca mesajul să apară în Resend, problema este la conectare/autorizare; dacă Resend arată bounce/suppression, verifică destinatarul acolo. `Delivered`/acceptarea serverului nu garantează plasarea în inbox.

După reparare, folosește o adresă de test proprie. Dacă utilizatorul apare deja neconfirmat în Auth Users, folosește Retrimite confirmarea din aplicație după răspunsul de email neconfirmat ori din dashboard; nu șterge conturi sau comenzi pentru a reîncerca. Așteaptă limita de retrimitere în loc să apeși repetat butonul.

## 3. Emailul după cumpărare

Completează în `.env.local` (și ulterior în variabilele serverului de hosting):

```dotenv
RESEND_API_KEY=re_REPLACE_WITH_PRIVATE_SENDING_KEY
EMAIL_FROM=comenzi@mail.yourdomain.ro
EMAIL_REPLY_TO=your-real-support-inbox@example.com
CRON_SECRET=REPLACE_WITH_A_RANDOM_SECRET_OF_AT_LEAST_32_CHARACTERS
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

`EMAIL_FROM` conține doar adresa, nu `Faurio <...>`; numele este adăugat de cod. `EMAIL_REPLY_TO` este opțional. Nu publica nicio cheie cu prefix NEXT_PUBLIC și nu pune secrete în Git. Generează CRON_SECRET cu un generator criptografic, nu cu textul exemplului.

Rulează verificarea fără trimitere:

```bash
npm run email:check
```

Dacă `outboxMigrationApplied` este false, rulează **o singură dată**, integral, `supabase/migrations/202610300003_order_emails.sql` în SQL Editor pe baza proiectului. Această migrare se poate aplica peste schema magazinului existent fără a activa marketplace-ul 001/002. Nu rerula `schema.sql` ori seed-ul pentru activarea emailurilor. Migrarea nu trimite și nu reîncarcă automat comenzile istorice achitate anterior.

Repornește `npm run dev` după modificarea variabilelor, apoi repetă `npm run email:check`. Verificarea vede configurația locală și tabelul outbox, nu poate confirma DNS-ul, setările SMTP din dashboard ori livrarea efectivă în inbox.

## 4. Confirmarea plății și testul complet

Păstrează webhook-ul Stripe funcțional. Local:

```bash
stripe listen --events checkout.session.completed,checkout.session.async_payment_succeeded,checkout.session.async_payment_failed,checkout.session.expired --forward-to localhost:3000/api/stripe/webhook
```

Pune secretul acelui listener în STRIPE_WEBHOOK_SECRET și repornește serverul. În hosting configurează endpointul Stripe public și secretul său separat. Nu reutiliza automat secretul CLI pentru endpointul public.

1. Creează un cont de test propriu, primește confirmarea și verifică autentificarea.
2. Cere recuperarea parolei; linkul trebuie să ajungă la `/cont/parola`, unde alegi parola și te autentifici din nou.
3. Plasează o comandă cu adresa ta. Folosește numai card Stripe de test, de exemplu 4242 4242 4242 4242; nu introduce un card real.
4. Confirmarea plății trebuie să creeze exact un rând în `order_email_outbox`. Emailul conține codul comenzii, produsele/cantitățile, prețurile, reducerea, livrarea, totalul, adresa și documentul Stripe dacă acesta era disponibil.
5. Verifică în Resend și inbox. Retrimiterea aceluiași eveniment Stripe nu trebuie să creeze un al doilea email.

Magazinul acceptă încă numai chei Stripe test. Emailurile respective au subiect `[TEST]` și spun că nu s-au încasat bani reali. Păstrează mediul de test privat; nu expune un checkout cu carduri de test publicului ca pe un magazin live. Nu au fost efectuate plăți sau trimise mesaje reale în verificările implementării.

## 5. Reîncercări și operare

După statusul paid, triggerul SQL salvează o singură notificare în aceeași tranzacție cu comanda. Webhook-ul verificat și pagina de succes verificată server-side solicită trimiterea cu `after()`. Browserul nu poate marca o plată ori alege un destinatar prin endpointul de dispatch.

Payloadul exact este salvat înainte de trimitere și refolosit după restart/deploy. Lockurile SQL și cheia Resend `order-confirmation/<job-id>` protejează evenimentele concurente/repetate. Erorile tranzitorii primesc backoff; credențialele/domeniile respinse devin blocked. Joburile incerte mai vechi de 23h nu se retrimit automat, deoarece Resend păstrează idempotency keys 24h. Verifică logurile furnizorului înainte de orice reactivare manuală. Nu șterge rândul sau reseta `sent` ca să forțezi retrimiterea.

`sent` în outbox înseamnă că Resend a acceptat mesajul și a returnat un ID, nu dovada că destinatarul l-a citit sau l-a primit în inbox. Nu există încă un consumer de evenimente de bounce/delivery în aplicație.

Reîncercare manuală a joburilor eligibile, cu aplicația pornită:

```bash
npm run email:dispatch
```

Pentru reîncercări automate, după ce publici tu proiectul și îl pui pe GitHub, există `.github/workflows/order-email-retries.yml`: configurează variabila repository `FAURIO_URL` cu URL-ul HTTPS final și secretul `FAURIO_CRON_SECRET` identic cu CRON_SECRET de pe server. Workflow-ul cere dispatch la aproximativ 5 minute, în limita programării GitHub Actions; este inactiv fără URL. Alternativ, orice scheduler de încredere poate apela GET sau POST `/api/internal/order-emails` cu header `Authorization: Bearer <CRON_SECRET>`. Fără scheduler, reîncercările nu rulează singure; prima încercare după plata confirmată funcționează independent.

Outbox este privat, accesibil numai service_role/funcțiilor serverului. Endpointul nu permite destinatar, text sau comandă arbitrară în request. Emailurile tranzacționale nu înscriu clientul la marketing. Newsletterul/contactul rămân salvări în DB, fără campanii automate; notificarea de expediere nu este implementată prin acest modul.

Surse: [API Resend](https://resend.com/docs/api-reference/emails/send-email), [fereastra de idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys).
