# Raport de verificare — 7 noiembrie 2026

## Cod și interfață

- `npm test`: 92/92 teste unitare și de integrare PostgreSQL PGlite.
- TypeScript strict, ESLint, build de producție și `git diff --check`: trecute.
- 88 teste UI generale desktop/mobil și 18 teste de căutare cu Groq/Supabase reale: trecute în rulări separate.
- Testele pentru indisponibilitatea forțată necesită serverul QA izolat. Testul care creează și închide ateliere este opt-in și nu a fost rulat peste baza curățată.

UI: selectoare comune în catalog, Contact, Studio, editor și formularele de produs; caret și focus conținut în câmp, fără contur albastru exterior. Sunt verificate navigarea, filtrele, cantitățile în coș, pagina produsului, formularele, recuperarea parolei cu transport simulat, editorul, moderarea produsului cu upload simulat, confirmarea plății fără afirmații false, accesul anonim refuzat și layout-urile responsive.

Scena 3D a afișat toate cele șapte modele, fără repetări într-un ciclu, într-un singur canvas. Pauza la focus/interacțiune, tastatura și mișcarea redusă sunt verificate. Texturile au fost reduse de la 42.630.535 la 13.643.157 bytes; nu se descarcă toate simultan. Vaza albă și serviciul de ceai neutilizate au fost eliminate din proiect.

## Căutare reală

Au fost verificate: set de pahare versus pahare individuale, două tipuri alternative, culori alternative, limite zecimale de preț, stoc, excluderi de tip/culoare, laptop și tricou absente, cadou pentru profesor și un produs precis într-o poveste despre destinatar. Detaliile destinatarului nu devin automat atribute ale produsului. Alb nu se potrivește cu albastru prin simplă subsecvență.

Interpretările sunt reale, nu răspunsuri hardcodate. Testele pot folosi cache-ul interpretărilor Groq, dar produsele, prețurile și eligibilitatea sunt recitite din Supabase. Filtrarea SQL se face înainte de numărare și paginare.

Evaluarea intensivă a expus limitele gratuite Groq (429) și generări care returnau schema în locul datelor (400). Promptul a fost compactat și clarificat; o eroare de generare a schemei permite o singură reîncercare. Limitele providerului nu sunt ocolite și nu sunt ascunse prin rezultate fără legătură. Nu se garantează înțelegerea perfectă a oricărui text sau disponibilitatea nelimitată a unui serviciu gratuit.

## Baza publică și configurarea

Migrarea `202611060001_search_constraints.sql` a fost aplicată în ae_proj. Un test read-only al RPC-ului confirmă că excluderea tuturor tipurilor întoarce zero produse.

După backup privat verificat prin SHA-256 și aprobarea exactă a utilizatorului, au fost șterse cele șapte ateliere non-legacy, cele două produse asociate și cele opt imagini ale lor. Cele 720 produse inițiale și toate cele șapte comenzi au fost comparate integral cu backup-ul; identificatorii celor două conturi existente au rămas identici. Atelierul intern a fost păstrat. Nu au fost șterse conturi Stripe. Înregistrările noi create ulterior de utilizator nu fac parte din acest snapshot.

Netlify urmărește repository-ul privat `BackinR2D2/faurio`, branch `main`. Verificarea read-only a confirmat existența cheilor Groq, SMTP, ambelor webhook-uri de plată, secretului cron și URL-ului canonic HTTPS în contextul de producție. Valorile secrete nu apar în raport sau cod. Unele variabile locale sunt intenționat diferite de producție.

SMTP: conexiunea și autentificarea Gmail sunt verificate fără mesaj nou. Outbox-ul are cinci notificări marcate `sent`; acceptarea SMTP nu dovedește livrarea în inbox. Confirmarea înscrierii a fost primită și confirmată de utilizator în testul anterior.

## Verificarea publicării

Commitul `1876522` a fost publicat automat de GitHub pe Netlify. Cele 24 de teste publice desktop/mobil au trecut, iar pipeline-ul GitHub complet a încheiat cu succes testele, analiza statică și buildul. Probele publice includ selectoarele, modelele noi, excluderi/alternative în căutare, paginare și refuzul accesului anonim.

[PageSpeed public, 7 noiembrie 2026](https://pagespeed.web.dev/analysis/https-faurio-marketplace-netlify-app/dr05c5yiw7?form_factor=mobile): mobil 95 performanță, 100 accesibilitate, 100 bune practici și 100 SEO; LCP 2,4 s, TBT 60 ms, CLS 0. Desktopul a avut performanță 70 și TBT 1.780 ms, motiv pentru reducerea ulterioară a costului scenei 3D. Sunt măsurători de laborator, nu date de teren sau garanții de accesibilitate/SEO.

Reglajul ulterior reduce harta iluminării de la 256 la 64 px pe față și plafonul pixel ratio la 1,25. Randarea se oprește când scena este nemodificată și în pauză; scrierea într-un câmp suspendă mișcarea. Texturile obiectelor rămân neschimbate. Toate cele opt teste homepage desktop/mobil au trecut din nou, inclusiv pauza în timpul scrierii. Buildul și TypeScript au fost reverificate.

## Limitele dovezilor

Testele SQL și cele marcate MOCK nu reprezintă plăți reale, KYC, transferuri sau primirea unui colet. Fluxurile financiare izolate verifică rezervarea stocului, idempotenta, eligibilitatea creatorului, comisionul, ledger-ul, rambursările și izolarea comenzilor. Codul acceptă numai chei de plată TEST.

La verificarea dinaintea publicării nu exista încă un atelier nou sau un cont Connect configurat. Titularul trebuie să creeze atelierul, să obțină aprobarea operatorului și să finalizeze personal onboardingul TEST. Urmează apoi plata TEST către acel creator, verificarea comisionului/transferului și confirmarea emailului în inbox. Până atunci nu este declarată încheiată acceptanța financiară multi-vendor.

Nu există integrare API de curier/AWB sau factură fiscală românească certificată. Scorul Lighthouse local istoric nu este prezentat drept PageSpeed public; raportul public de mai sus este o măsurătoare separată. Aceste distincții sunt importante pentru susținerea proiectului și pentru o eventuală lansare comercială.
