# Raport de verificare — 7 noiembrie 2026

## Cod și interfață

- `npm test`: 108/108 teste unitare și de integrare PostgreSQL PGlite.
- TypeScript strict, ESLint, build de producție și `git diff --check`: trecute.
- Rularea integrală desktop/mobil a trecut 119 cazuri și a identificat o cursă la Undo în Studio. Aceasta a fost remediată; regresia controlează explicit un autosave întârziat și revenirea atât în previzualizare, cât și în ciorna salvată. A fost repetată de trei ori pe fiecare viewport.
- Cele 14 regresii dedicate Admin/catalog au trecut separat. Cele opt probe Admin au trecut și pe buildul de producție; cele două probe de indisponibilitate a căutării au trecut pe serverul QA izolat.
- Cazul care creează și închide ateliere este opt-in și nu a fost rulat peste baza curățată.

Regresie suplimentară: filtrul manual cu buget `132.38`, fără text de căutare, provoca o eroare PostgreSQL deoarece coloana `products.price` este de tip integer. Pragul minim este acum rotunjit în sus și maximul în jos numai la construirea predicatelor pentru această coloană; valorile din formular și URL rămân exacte. Testele desktop/mobil verifică aplicarea, paginarea, reload-ul, intervalele zecimale și intervalele fără potriviri. Testele unitare compară predicatul adaptat cu cel numeric pentru toate prețurile întregi între 0 și 250 și mai multe perechi de limite. Nu s-a modificat schema sau vreun preț stocat.

Fallback la cotă: șase teste unitare verifică activarea exclusivă pentru 429/cotă zilnică, păstrarea restricțiilor și revenirea la interpretarea principală. Un test PostgreSQL verifică produsele publicate, termenii obligatorii, bugetul, culoarea, vizibilitatea și absența înlocuitorilor pentru produse lipsă. Opt probe browser au trecut pe buildul de producție local: patru cu `GROQ_DAILY_SEARCH_LIMIT=0`, patru cu transport Groq 429 simulat. Produsele au fost citite din Supabase; nu s-a epuizat intenționat cota publică. Sunt verificate și aplicarea unui filtru suplimentar, paginarea și reload-ul. Cele opt regresii normale ale catalogului au trecut separat. Rulările folosesc directoare de artefacte distincte după identificarea unei coliziuni de trace între procese, fără a modifica aserțiunile ca să ascundă o eroare a aplicației.

Incidentul istoric cu `<small>` în brand nu a fost reprodus. Acea etichetă nu mai există în brand; nu s-a ascuns problema cu `suppressHydrationWarning`. Intrarea directă în cele patru pagini Admin, reload-ul, navigarea client-side și sesiunea salvată simulată sunt verificate. Anul din footer este transmis de server, evitând diferențe între ceasuri; testul fixează browserul în anul 2040.

În Admin au fost reparate tabelul prea lat pe mobil, butoanele inaccesibile, rollback-ul stocului și statisticile după confirmarea serverului. În Studio, Undo rămâne utilizabil în timpul autosave-ului.

UI: selectoare comune în catalog, Contact, Studio, editor și formularele de produs; caret și focus conținut în câmp, fără contur albastru exterior. Sunt verificate navigarea, filtrele, cantitățile în coș, pagina produsului, formularele, recuperarea parolei cu transport simulat, editorul, moderarea produsului cu upload simulat, confirmarea plății fără afirmații false, accesul anonim refuzat și layout-urile responsive.

Scena 3D a afișat toate cele șapte modele, fără repetări într-un ciclu, într-un singur canvas. Pauza la focus/interacțiune, tastatura și mișcarea redusă sunt verificate. Texturile au fost reduse de la 42.630.535 la 13.643.157 bytes; nu se descarcă toate simultan. Vaza albă și serviciul de ceai neutilizate au fost eliminate din proiect.

## Căutare reală

Au răspuns cu succes 13 cereri sintetice prin Groq și baza găzduită. Bugetul minim/maxim, tipurile, categoriile și materialele sunt precompletate din interpretare. Categoriile provin din taxonomia completă, nu din prima pagină. Selecțiile multiple, aplicarea în lot, resetarea, căutarea nouă, reload-ul, paginarea și Înapoi sunt testate. Materialele cu punctuație sunt tratate literal; „in” nu se potrivește accidental cu „argint”.

Au fost verificate: set de pahare versus pahare individuale, două tipuri alternative, culori alternative, limite zecimale de preț, stoc, excluderi de tip/culoare, laptop și tricou absente, cadou pentru profesor și un produs precis într-o poveste despre destinatar. Detaliile destinatarului nu devin automat atribute ale produsului. Alb nu se potrivește cu albastru prin simplă subsecvență.

Interpretările sunt reale, nu răspunsuri hardcodate. Testele pot folosi cache-ul interpretărilor Groq, dar produsele, prețurile și eligibilitatea sunt recitite din Supabase. Filtrarea SQL se face înainte de numărare și paginare.

Evaluarea intensivă a expus limitele gratuite Groq (429) și generări care returnau schema în locul datelor (400). Promptul a fost compactat și clarificat; o eroare de generare a schemei permite o singură reîncercare. Limitele providerului nu sunt ocolite și nu sunt ascunse prin rezultate fără legătură. Nu se garantează înțelegerea perfectă a oricărui text sau disponibilitatea nelimitată a unui serviciu gratuit.

La 429 sau epuizarea cotei zilnice există acum un mod explicit după cuvinte-cheie, fără generare semantică de recomandări. Alte erori rămân indisponibilitate cu reîncercare. Modul de rezervă nu este salvat ca interpretare Groq și nu lărgește automat cererile fără potriviri.

## Baza publică și configurarea

Migrarea `202611060001_search_constraints.sql` a fost aplicată în ae_proj. Un test read-only al RPC-ului confirmă că excluderea tuturor tipurilor întoarce zero produse.

Și migrarea `202611070001_catalog_multi_filters.sql` este aplicată. Probele read-only confirmă noile grupuri și refuzul execuției anonime. Nu au fost șterse date în această intervenție; curățarea descrisă mai jos este anterioară acestei verificări.

După backup privat verificat prin SHA-256 și aprobarea exactă a utilizatorului, au fost șterse cele șapte ateliere non-legacy, cele două produse asociate și cele opt imagini ale lor. Cele 720 produse inițiale și toate cele șapte comenzi au fost comparate integral cu backup-ul; identificatorii celor două conturi existente au rămas identici. Atelierul intern a fost păstrat. Nu au fost șterse conturi Stripe. Înregistrările noi create ulterior de utilizator nu fac parte din acest snapshot.

Netlify urmărește repository-ul privat `BackinR2D2/faurio`, branch `main`. Verificarea read-only a confirmat existența cheilor Groq, SMTP, ambelor webhook-uri de plată, secretului cron și URL-ului canonic HTTPS în contextul de producție. Valorile secrete nu apar în raport sau cod. Unele variabile locale sunt intenționat diferite de producție.

SMTP: conexiunea și autentificarea Gmail sunt verificate fără mesaj nou. Outbox-ul are cinci notificări marcate `sent`; acceptarea SMTP nu dovedește livrarea în inbox. Confirmarea înscrierii a fost primită și confirmată de utilizator în testul anterior.

Ultimele trei rulări verificate ale automatizării de retry email au rezultat `success`; secretul GitHub necesar există. Aceasta nu garantează livrarea sau execuția exact la fiecare cinci minute. Local, URL-ul este HTTP și secretul unui eventual webhook Connect local nu este configurat; endpoint-ul public este configurat separat.

Cele șapte comenzi plătite au fost comparate read-only cu sesiunile lor Stripe: toate șapte sunt plătite în TEST, fără diferențe de total sau monedă. Ambele webhook-uri publice sunt active pentru evenimentele checkout/rambursare și `account.updated`. Nu s-a inițiat o plată sau rambursare nouă.

## Verificarea publicării

Datele de publicare și PageSpeed de mai jos sunt istorice. Pentru noul commit, CI și probele publice se verifică separat în GitHub Actions/Netlify. Probele publice includ acum și hidratarea Admin, filtre precompletate/multiple și refuzul evenimentelor de plată nesemnate.

Commitul `1876522` a fost publicat automat de GitHub pe Netlify. Cele 24 de teste publice desktop/mobil au trecut, iar pipeline-ul GitHub complet a încheiat cu succes testele, analiza statică și buildul. Probele publice includ selectoarele, modelele noi, excluderi/alternative în căutare, paginare și refuzul accesului anonim.

[PageSpeed public, 7 noiembrie 2026](https://pagespeed.web.dev/analysis/https-faurio-marketplace-netlify-app/dr05c5yiw7?form_factor=mobile): mobil 95 performanță, 100 accesibilitate, 100 bune practici și 100 SEO; LCP 2,4 s, TBT 60 ms, CLS 0. Desktopul a avut performanță 70 și TBT 1.780 ms, motiv pentru reducerea ulterioară a costului scenei 3D. Sunt măsurători de laborator, nu date de teren sau garanții de accesibilitate/SEO.

Reglajul ulterior reduce harta iluminării de la 256 la 64 px pe față și plafonul pixel ratio la 1,25. Randarea se oprește când scena este nemodificată și în pauză; scrierea într-un câmp suspendă mișcarea. Texturile obiectelor rămân neschimbate. Toate cele opt teste homepage desktop/mobil au trecut din nou, inclusiv pauza în timpul scrierii. Buildul și TypeScript au fost reverificate.

## Limitele dovezilor

Testele SQL și cele marcate MOCK nu reprezintă plăți reale, KYC, transferuri sau primirea unui colet. Fluxurile financiare izolate verifică rezervarea stocului, idempotenta, eligibilitatea creatorului, comisionul, ledger-ul, rambursările și izolarea comenzilor. Codul acceptă numai chei de plată TEST.

La verificarea dinaintea publicării nu exista încă un atelier nou sau un cont Connect configurat. Titularul trebuie să creeze atelierul, să obțină aprobarea operatorului și să finalizeze personal onboardingul TEST. Urmează apoi plata TEST către acel creator, verificarea comisionului/transferului și confirmarea emailului în inbox. Până atunci nu este declarată încheiată acceptanța financiară multi-vendor.

Nu există integrare API de curier/AWB sau factură fiscală românească certificată. Scorul Lighthouse local istoric nu este prezentat drept PageSpeed public; raportul public de mai sus este o măsurătoare separată. Aceste distincții sunt importante pentru susținerea proiectului și pentru o eventuală lansare comercială.
