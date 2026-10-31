# Faurio — evoluție către un marketplace handmade

Proiectul pornește ca magazin B2C administrat central și evoluează spre un marketplace B2C pentru ateliere independente. Aceasta este o schimbare a cerinței față de ST2, nu o decizie atribuită retroactiv studiului inițial.

Colecția demonstrativă include ceramică, sticlărie, textile, lumânări, bijuterii, lemn, decorațiuni și papetărie. Sunt produse pentru care materialul, timpul de lucru și povestea creatorului contează în alegere. Cele 720 de produse provin din seed și nu reprezintă 720 de obiecte reale verificate comercial. Ratingurile sintetice și testimonialul hardcodat nu mai sunt afișate ca opinii verificate.

ST1/ST2 originale nu sunt în repository; nu atribuim un competitor sau o concluzie suplimentară unui document neconsultat. Master promptul indică Medusa drept alegere ST2. Runtime-ul verificat folosește încă Next.js/TypeScript și Supabase; tranziția către Medusa este un milestone distinct în ADR 001. Inspirația pentru interacțiune 3D este o experiență creativă originală, iar modelele existente au licențele păstrate în public/models; nu copiem un website al lui Bruno Simon.

Frontend: Next.js App Router, React, Oswald local, CSS și componente accesibile. Backend: route handlers, validare Zod, Supabase Auth/PostgreSQL, RLS și funcții tranzacționale. Three.js/GSAP rămân pentru obiectele interactive. Stripe Checkout este găzduit de Stripe și limitat la chei de test. Hostingul recomandat pentru etapa curentă este Vercel; nu s-a efectuat publicarea în această livrare.

## Originalitate implementată

1. Căutarea descrierilor naturale transformă bugetul, tipul, materialul și alte cerințe în filtre pe inventarul efectiv. Nu inventează produse. EUR fără un curs disponibil produce o explicație, iar lipsa unui provider AI păstrează parserul local funcțional.
2. Creatorul are un atelier separat și un editor de pagină: cinci teme, trei familii tipografice aprobate, secțiuni reordonabile, poveste/galerie/FAQ, autosalvare, previzualizare și publicare cu istoric. RLS și verificările serverului limitează accesul la propriul atelier.
3. Pagina de intrare are un obiect 3D interactiv. Acesta este un element de explorare vizuală, nu un configurator de preț sau o dovadă de personalizare a produsului.

## Cerință → demonstrație → dovadă

| Cerință ST3 | Rută / acțiune | Dovadă / stare |
|---|---|---|
| Publicare Web | Domeniul Vercel final | În așteptarea publicării, nu există URL nou verificat |
| Bază de date + server | /catalog, /api/search | Supabase 720 produse; teste API locale |
| Navigare, categorii | Header, /catalog | docs/evidence/home-*.png și search-*.png |
| Detalii produs | /produs/[id] | De capturat pentru produsul ales la demo |
| Coș + actualizare | /cos | De capturat manual cu inventarul real de test |
| Cont + comandă | /cont, /cont/profil | Conturile existente sunt păstrate; comandă nouă neexecutată în această livrare |
| Stocuri + promoții | /admin, POVESTE10 | Funcții SQL de rezervare testate local; screenshot operator în așteptare |
| Plată electronică TEST | /checkout → Stripe | Integrare existentă; test real cu card Stripe încă necesar |
| Document comandă | Confirmare Stripe | Document Stripe, nu factură fiscală românească certificată |
| Administrare | /admin/marketplace | Moderare și audit implementate; necesită migrarea externă și cont operator |
| Personalizare storefront | /studio/appearance | Capturi MOCK-editor-*.png sunt doar QA cu transport simulat; nu sunt dovadă de publicare reală |
| Izolare doi creatori | shops / memberships / RLS | Teste PostgreSQL cu două identități locale; înscrierea reală Supabase este pas de staging |
| Performanță | Lighthouse local / PageSpeed public | Lighthouse final local 95/100/100/100, cu HTML/JSON și captură reală; PageSpeed după publicare |

## Ce nu este încă finalizat

Stripe Connect, split orders, transferuri/refunduri/ledger, configuratorul de personalizare cu prețuri, uploadurile proprii, recenziile de achiziție, mesageria și trackingul nu sunt prezentate ca funcții livrate. Cerința universitară de plată electronică testată trebuie demonstrată printr-o tranzacție nouă în sandbox și webhook confirmat. Etapa nouă de multi-vendor nu este completă financiar.
