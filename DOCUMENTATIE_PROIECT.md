# Documentație proiect — Faurio

> Actualizare 30 octombrie 2026: textul de mai jos descrie etapa inițială, administrată central. Cerința nouă este un marketplace. Starea verificată, limitele și dovezile actuale sunt în [docs/ST3-PRESENTATION.md](docs/ST3-PRESENTATION.md) și [docs/TEST-REPORT.md](docs/TEST-REPORT.md). Referințele istorice la factură nu certifică un document fiscal românesc; Connect și plățile către creatori nu sunt încă finalizate.

## 1. Tipul de comerț electronic

Proiectul este un magazin **B2C**, prin care obiectele handmade sunt comercializate direct către clientul final.

## 2. Produsele și motivația alegerii

Catalogul include ceramică, textile, lumânări, bijuterii și decorațiuni realizate în serie mică. Alegerea unui produs handmade depinde de intenție, ocazie, material, buget și timpul de livrare. Din acest motiv, proiectul folosește o căutare conversațională care transformă o descriere liberă în recomandări concrete din catalog.

## 3. Modele de referință

- Etsy pentru catalog, categorii, favorite și prezentarea creatorilor;
- magazine editoriale de design pentru compoziția aerisită și fotografia de produs;
- experiențe web interactive pentru mișcarea discretă a scenei 3D.

Identitatea vizuală, selecția și integrarea obiectelor 3D, motorul de recomandare și fluxurile magazinului sunt realizate pentru acest proiect.

## 4. Tehnologii

- Next.js 16 și React 19;
- TypeScript, TSX și CSS;
- Supabase Auth și PostgreSQL cu Row Level Security;
- Three.js pentru scena 3D;
- GSAP pentru animații;
- Stripe Checkout în test mode;
- Oswald Variable servit local;
- paleta `#E2DBBE`, `#D5D6AA`, `#9DBBAE`, `#769FB6`, `#188FA7`.

Next.js separă paginile, componentele client și rutele server. Supabase asigură autentificarea și baza de date, iar Stripe oferă fluxul de plată electronică testabil.

## 5. Baza de date

Schema din `supabase/schema.sql` conține produse, profiluri, comenzi, mesaje de contact și abonați la newsletter. Profilurile și comenzile sunt asociate utilizatorului autentificat. Politicile RLS limitează accesul clientului la propriile date, iar operațiile administrative folosesc cheia server-side.

## 6. Publicare

Aplicația este pregătită pentru Vercel sau Netlify. După conectarea repository-ului sunt adăugate variabilele din `.env.example`, iar `NEXT_PUBLIC_SITE_URL` primește domeniul final. Redirecturile de autentificare trebuie permise în Supabase.

## 7. Cerințe B2C implementate

| Cerință | Implementare |
| --- | --- |
| Navigare | Header responsive, meniu mobil și pagini separate |
| Catalog | `/catalog`, căutare, filtre și sortare |
| Categorii | Ceramică, textile, lumânări, bijuterii și decorațiuni |
| Detalii produs | `/produs/[id]`, galerie, preț, stoc, creator, livrare și produse asociate |
| Coș | `/cos`, cantități, eliminare, transport, promoție și persistență |
| Cont | `/cont`, creare cont, autentificare, resetare parolă și profil |
| Comenzi | create exclusiv după confirmarea Stripe, cu istoric asociat utilizatorului |
| Stocuri | Stoc afișat la produs și gestionat în `/admin` |
| Promoții | Prețuri promoționale și codul `POVESTE10` |
| Factură | Articole, cantități, prețuri, transport, reducere, TVA și tipărire |
| Plată | Stripe Checkout găzduit, confirmare server-side și webhook semnat |
| Administrare | `/admin`, catalog, stocuri, comenzi și utilizatori |

## 8. Personalizări

### Căutarea conversațională

Prima pagină conține doar identitatea magazinului, o scenă 3D și câmpul de căutare. O cerere precum „vreau un cadou cald pentru o prietenă, sub 150 lei, care să ajungă repede” este interpretată după buget, ocazie, destinatar, interese, atmosferă, culoare, material și urgență. Pentru denumiri precise, tipul produsului devine o condiție obligatorie: „pahare” returnează exclusiv pahare și seturi de pahare, iar o combinație inexistentă returnează zero rezultate.

Catalogul conține 720 de produse generate idempotent în PostgreSQL din 24 de colecții handmade. Interogarea, filtrarea, sortarea, numărarea și paginarea cu 24 produse pe pagină sunt executate server-side. Coloana de căutare full-text și indexurile pentru tip, categorie, preț, rating și dată evită încărcarea întregului catalog în browser.

### Scena 3D

La fiecare accesare este ales aleator un obiect PBR dintr-o listă de șapte modele Poly Haven: vază ceramică antică, vază ceramică pictată, vază din alamă gravată, cupe ornamentale din alamă, serviciu de ceai floral, elefant sculptat și perne decorative țesute. Modelele CC0 folosesc texturi 2K și sunt găzduite local. Obiectul este încadrat automat prin bounding sphere, se rotește lent și uniform pe toate cele trei axe și poate fi rotit, apropiat sau deplasat direct de utilizator. Se încarcă un singur model, rezoluția randării este plafonată, animația se suspendă în taburile ascunse și respectă preferința de mișcare redusă. Sursele și licențele se află în `public/models/ATTRIBUTION.md`.

### Fluxul de cont

Supabase Auth oferă creare cont, confirmare email, autentificare, resetare parolă și sesiune persistentă. Profilul, adresa, preferințele, coșul și favoritele utilizatorilor autentificați sunt salvate în PostgreSQL și protejate prin Row Level Security. Nu există conturi sau comenzi simulate local.

## 9. Scenariu de demonstrație

1. Introdu o cerere detaliată pe homepage.
2. Verifică recomandările și filtrele aplicate în catalog.
3. Deschide o pagină de produs și adaugă produsul în favorite și în coș.
4. Creează un cont și completează profilul și adresa.
5. Modifică o cantitate și aplică `POVESTE10`.
6. Continuă către pagina Stripe și finalizează checkout-ul cu cardul de test `4242 4242 4242 4242`, orice dată viitoare și orice CVC de trei cifre.
7. Verifică factura și istoricul comenzilor.
8. Deschide panoul administrativ și modifică un stoc.
9. Trimite formularul de contact și testează newsletter-ul.

## 10. Capturi necesare

- homepage și scena 3D;
- căutare în limbaj natural și rezultate;
- catalog, filtre și categorii;
- pagina individuală de produs;
- creare cont, profil și adresă;
- coș, promoție și actualizarea cantității;
- checkout, confirmare și factură;
- panoul administrativ;
- contact și newsletter;
- rezultatele Mobile și Desktop din PageSpeed Insights pentru domeniul final.

## 11. Performanță și accesibilitate

- imaginile sunt redimensionate și comprimate;
- scena 3D este încărcată dinamic și suspendată în taburile ascunse;
- animațiile respectă `prefers-reduced-motion`;
- fontul este servit local;
- interfața este responsive și navigabilă cu tastatura;
- metadatele, sitemap-ul și robots.txt folosesc domeniul configurat.

Raportul PageSpeed trebuie generat după publicarea pe domeniul final, deoarece scorurile depind de provider, regiune și configurația de producție.

## 12. Trecerea la producție

Înaintea lansării comerciale sunt necesare chei Stripe live, configurarea endpointului webhook existent, emailuri tranzacționale, roluri administrative distincte, conținut juridic validat și date reale despre firmă. Nicio cheie secretă nu se comite în repository.
