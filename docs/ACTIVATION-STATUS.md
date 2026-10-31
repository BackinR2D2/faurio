# Activare Faurio — 31 octombrie 2026

## Supabase și căutare: activate

În proiectul existent `ae_proj` au fost executate integral, în ordinea din PRODUCTION-LAUNCH.md, toate cele șapte migrări până la `202610310004_buyer_trust.sql`. Execuția fiecăreia a fost confirmată de SQL Editor. Sunt aplicate manual: nu presupune că istoricul CLI le înregistrează automat și nu le rula din nou.

Înaintea modificărilor s-au copiat tabelele publice, definițiile funcțiilor publice și politicile în schema `faurio_backup_20261031`. Schema nu permite USAGE pentru anon/authenticated și nu este expusă prin API. Acesta este un snapshot în aceeași bază de date, nu un backup extern complet: nu acoperă Auth/Storage și nu înlocuiește un export PostgreSQL și o restaurare testată.

Comparația SQL după migrare a confirmat 720 produse, 2 comenzi, aceleași ID-uri/prețuri/stocuri și aceleași coduri/totaluri/statusuri ale comenzilor. Bucket-ul `shop-media` este privat. Toate cele 10 probe de tabele/views din `npm run launch:check` au trecut.

Cheia Groq a trecut cele trei evaluări reale. Verificarea ulterioară prin `/api/search`, cu filtrare SQL asupra catalogului real, a confirmat `engine: groq`:

| Cerere | Rezultate |
| --- | ---: |
| Ceramică minimalistă pentru casă nouă | 24 |
| Caut pahare sub 100 lei | 48 |
| as cauta un tricou maro, am un buget de 100 de lei maxim. | 0 |

Rezultatele reflectă catalogul de la verificare, nu garanții pentru inventarul viitor. Au fost corectate flexiunile stilurilor românești și termenii canonici de ranking. Pagina SSR a fost verificată separat: conține produse și nu mai afișează eroarea AI. Erorile viitoare sunt clasificate în loguri fără interogări ale clienților, credențiale sau răspunsuri brute ale providerului.

## Email: așteaptă parola locală

Setările Gmail neconfidențiale și providerul SMTP au fost salvate în `.env.local`, folosind căsuța instituțională indicată de titular. La ultima verificare lipsea `SMTP_PASS`. După salvarea parolei de aplicație local, se rulează `npm run email:verify`, apoi se configurează aceeași căsuță în Supabase Auth. Confirmarea emailului rămâne obligatorie. Nu s-au trimis emailuri reale pentru a simula succesul.

## Stripe: acces TEST verificat, activare incompletă

Cheia TEST a fost verificată direct prin Stripe API. Connect este accesibil; la verificare nu existau connected accounts sau endpointuri webhook. După migrare a fost activat `STRIPE_CONNECT_ENABLED=true` local. Cheile live rămân refuzate de aplicație.

Au fost create două webhook-uri Stripe TEST pentru `https://faurio-marketplace.netlify.app/api/stripe/webhook` și `/api/stripe/connect`, cu evenimentele din ghid. Secretele lor distincte sunt salvate în `.env.netlify.local` (ignorat de Git, mod 0600) și în variabilele Netlify pentru producție. Configurația locală din `.env.local` rămâne pentru dezvoltare. Existența endpointurilor nu demonstrează livrarea unui eveniment. Onboardingul real al unui seller, plata test găzduită, transferul/application fee, refundul și emailul după plată rămân de verificat end-to-end. Nu s-au creat identități de vânzători și nu s-au ocolit confirmările conturilor.

`CRON_SECRET` a fost generat și salvat local, fără a-l publica. Netlify și secretul GitHub Actions `FAURIO_CRON_SECRET` au fost configurate, împreună cu variabila `FAURIO_URL`. Retry-ul necesită deploy funcțional și SMTP valid; nu dovedește livrarea în inbox.

## GitHub și hosting

Repository privat creat: [BackinR2D2/faurio](https://github.com/BackinR2D2/faurio). Remote-ul `origin` este configurat. Fișierele de mediu și documentul local de instrucțiuni sunt excluse din Git. Scanarea surselor și a istoricului nu a găsit credențialele curente sau tiparele de chei private verificate; aceasta nu constituie un audit independent complet.

Contul Netlify a fost autorizat și planul Free confirmat. Proiectul `faurio-marketplace` este creat și legat prin CLI de repository-ul privat, cu o cheie SSH read-only pentru acel repository și un webhook GitHub pentru evenimente push. Site public verificat: [faurio-marketplace.netlify.app](https://faurio-marketplace.netlify.app). Variabilele serviciilor au fost copiate după acord explicit, exclusiv în contextul production; nu au fost configurate secrete pentru previews.

Netlify a publicat automat commitul aplicației `5316793`; webhook-ul GitHub push a primit HTTP 204, iar deploy-ul a ajuns în starea `ready`. Cele patru teste HTTPS desktop/mobil de producție au trecut, inclusiv pagini, layout fără overflow, căutare, paginare și refuzul accesului anonim. Cele trei căutări din tabel au fost repetate pe URL-ul public cu `engine: groq`, aceleași rezultate și constrângeri verificate.

Primul smoke GitHub a identificat un timeout cumulativ: opt navigări împărțeau un singur test de 45 secunde și așteptau inclusiv încărcarea resurselor opționale. Suita a fost separată în verificări individuale pe rute, după DOMContentLoaded și afișarea conținutului principal, fără eliminarea aserțiunilor HTTP/layout. Cele 20 de cazuri rezultate au trecut local pe site-ul public. Verificarea search cere acum explicit `engine: groq`.

Ambele endpointuri Stripe publice au acceptat probe sintetice semnate (HTTP 200) și au refuzat probe nesemnate (HTTP 400). Evenimentele sintetice au un tip necunoscut, ignorat de aplicație: nu s-au creat comenzi/plăți și nu reprezintă dovada livrării unui eveniment real de la Stripe.

Primul GitHub CI a trecut build/typecheck/lint/testele unitare, dar a identificat două teste UI care presupuneau existența cheilor Stripe/DB în CI. Testul a fost corectat pentru a verifica butonul dezactivat în mediul neconfigurat, fără a introduce chei reale sau bypass în aplicație. Fluxul mock complet rămâne verificat local, unde configurația backend există. Verificările pe catalogul real sunt omise explicit în CI fără staging securizat.

Pipeline-ul corectat a trecut în GitHub Actions: [run 41233600320](https://github.com/BackinR2D2/faurio/actions/runs/41233600320). Corecția checkout-ului a fost verificată separat desktop/mobil atât cu configurația backend locală, cât și pe un server QA izolat fără chei.

## Verificări de cod

71 teste unitare/integration PostgreSQL locale și 46 teste Chrome desktop/mobil au trecut. TypeScript, lint și build-ul de producție au trecut. Suita browser combină verificări pe catalogul real cu transporturi mock explicit etichetate pentru Auth/Connect/email; nu dovedește livrarea emailului, onboardingul sau plățile end-to-end. Testele locale SQL nu înlocuiesc verificările efectuate separat pe Supabase găzduit. Raportul PageSpeed anterior nu este o verificare a unui deploy public nou.
