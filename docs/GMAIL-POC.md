# Email fără domeniu propriu — Gmail / Google Workspace

Faurio poate trimite confirmări de comandă din căsuța Gmail instituțională prin SMTP. Supabase Auth are separat propria configurare SMTP pentru confirmarea contului și recuperarea parolei. Nu este suficient să completezi doar `.env.local`.

## 1. Autorizează căsuța

Respectă politica instituției privind utilizarea căsuței pentru proiecte și destinatari externi. Activează 2-Step Verification în contul Google. Deschide [App Passwords](https://myaccount.google.com/apppasswords), creează o parolă numită Faurio POC și păstreaz-o local. Nu folosi parola normală, nu o pune în chat, capturi, documente sau GitHub. Un cont Google Workspace poate avea App Passwords dezactivat de administrator. Nu dezactiva protecțiile instituției; cere aprobarea IT sau folosește un cont Gmail personal dedicat, cu acordul necesar.

Google precizează că parolele de aplicație necesită verificare în doi pași și pot fi indisponibile în conturi de școală/organizație: [instrucțiuni](https://support.google.com/accounts/answer/185833). Limitele de trimitere și filtrarea antispam rămân aplicabile; aceasta este o soluție de POC, nu un serviciu de email de producție cu SLA.

## 2. Aplicația — confirmări de cumpărare

Adaugă în `.env.local` și, la publicare, în variabilele server-side ale hostingului:

```dotenv
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=adresa-ta-institutionala
SMTP_PASS=parola-de-aplicatie-fara-spatii
EMAIL_FROM=aceeasi-adresa-ca-SMTP_USER
EMAIL_REPLY_TO=aceeasi-adresa-ca-SMTP_USER
CRON_SECRET=un-secret-aleator-de-minimum-32-caractere
```

Repornește serverul. Rulează `npm run email:check`, apoi `npm run email:verify`. A doua comandă se conectează/autentifică fără a trimite vreun mesaj; nu dovedește livrarea în inbox. Completează migrările din ghidul de lansare. Un email este generat numai după confirmarea Stripe a unei comenzi achitate. Emailurile test sunt marcate `[TEST]`. Nu activa newslettere sau marketing pe această căsuță.

SMTP nu are deduplicarea garantată de API-ul Resend. Dacă serverul acceptă mesajul, dar conexiunea/confirmarea DB se pierde, outbox-ul marchează livrarea `uncertain` pentru verificare manuală în Gmail Sent, fără reîncercări oarbe. Un Message-ID stabil ajută la identificare, nu garantează exact-once. Schimbarea transportului unui job deja pregătit este blocată.

## 3. Supabase — conturi și parole

În Authentication → Email → SMTP Settings activează Custom SMTP:

| Câmp | Valoare |
|---|---|
| Sender email | căsuța instituțională autorizată |
| Sender name | Faurio |
| Host | smtp.gmail.com |
| Port | 465 |
| Username | adresa completă a căsuței |
| Password | parola de aplicație Google, nu parola contului |

Păstrează Confirm Email activ. În URL Configuration adaugă localhost pentru dezvoltare și domeniul HTTPS al site-ului la publicare: `/cont/profil` și `/cont/parola`. Configurează Site URL la adresa canonică. O configurație SMTP corectă local nu modifică automat Supabase. Dacă persistă `Error sending confirmation email`, verifică Auth Logs și restricțiile Google înainte de a relua înscrierea; nu expune codurile sau linkurile de confirmare.

Supabase documentează [SMTP propriu](https://supabase.com/docs/guides/auth/auth-smtp) și [particularitățile Google SMTP](https://supabase.com/kb/troubleshooting/using-google-smtp-with-supabase-custom-smtp-ZZzU4Y). Dacă Gmail blochează conexiunile de pe infrastructura cloud, nu dezactiva TLS; treci ulterior la Resend pe un domeniu verificat.

## 4. Verificarea reală

Cu doi utilizatori de test consimțitori: înscriere → primire email → confirmare → autentificare; recuperare → email → parolă nouă → autentificare; checkout Stripe test → webhook → o singură confirmare de comandă. Verifică inbox/spam și outbox `sent`. Încheierea unui test mock nu înlocuiește acești pași.
