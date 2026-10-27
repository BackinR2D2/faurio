# Documentație proiect — Fir de Poveste

## 1. Tipul de comerț electronic

**B2C (Business-to-Consumer)**, sub forma unui marketplace curatorial care prezintă și comercializează obiecte handmade către clientul final.

## 2. Produsele comercializate și motivația alegerii

Catalogul demonstrativ cuprinde ceramică, broderii și textile, lumânări din ceară vegetală și obiecte decorative realizate în serie mică. Segmentul handmade este potrivit proiectului deoarece alegerea produsului depinde de intenție, poveste, material, buget și timpul de livrare — criterii pe care căutarea conversațională le poate interpreta mai natural decât un formular clasic.

## 3. Modele de referință

- **Etsy** pentru structurarea marketplace-ului, căutare, categorii, favorite și încrederea acordată creatorului;
- magazine editoriale de design și obiect, pentru compoziția aerisită, fotografia de produs și modul de prezentare a atelierelor.

Rezultatul nu copiază interfața unui model; identitatea „Fir de Poveste”, firul 3D interactiv, căutarea centrată pe intenție și limbajul vizual sunt originale.

## 4. Platforma software și tehnologiile

- **Next.js 16 / React 19**, construit cu Vinext pentru rulare server-side pe Cloudflare Workers;
- **Supabase** pentru PostgreSQL, comenzi și profiluri de client, cu securitate Row Level Security atunci când sunt configurate credențialele;
- **Three.js** pentru obiectul 3D interactiv din hero;
- **GSAP** pentru animațiile de intrare;
- **Stripe Checkout** în test mode atunci când este configurată cheia; sandbox local implicit pentru demonstrație;
- fontul variabil **Oswald** livrat local, CSS responsive și paleta `#E2DBBE`, `#D5D6AA`, `#9DBBAE`, `#769FB6`, `#188FA7`.

Next.js a fost ales pentru randare performantă, API routes și separarea codului client/server. Supabase oferă PostgreSQL administrat și politici de acces. Three.js și GSAP susțin elementul original, inspirat ca nivel de interactivitate de experiențele web ale lui Bruno Simon, fără a reproduce un proiect concret.

## 5. Limbaje și baze de date

- TypeScript, TSX, CSS și SQL;
- PostgreSQL prin Supabase (`supabase/schema.sql`);
- comenzile sunt inserate exclusiv server-side cu service role; cheia nu ajunge în browser;
- versiunea demo folosește localStorage doar ca fallback evaluabil atunci când nu există credențiale externe.

## 6. Publicare

Provider: **ChatGPT Sites / Cloudflare Workers**. URL-ul public se completează după publicare:

`https://fir-de-poveste-handmade.elatedpine3.chatgpt.site`

## 7. Cerințe B2C implementate

| Cerință | Implementare / loc de demonstrat |
| --- | --- |
| Navigare cu meniuri | Header responsive, meniu mobil și rute separate |
| Catalog de produse | Pagina `/catalog`, cu URL de căutare partajabil |
| Categorii | Ceramică, Textile, Lumânări, Bijuterii |
| Detalii produs | Ruta `/produs/[id]`: galerie, caracteristici, atelier, îngrijire, rating, stoc, livrare și produse asociate |
| Coș + actualizare | Pagina `/cos`, cantități, total, transport și persistență |
| Cont utilizator | `/cont` → autentificare Sites → `/cont/profil`, profil, adresă, favorite și istoric |
| Înregistrarea comenzii | `/api/orders`, legare opțională de cont, Supabase sau fallback local demonstrativ |
| Stocuri | Stoc vizibil la produs și modificabil din panoul admin |
| Promoții | Preț redus și codul `POVESTE10` |
| Factură | Factură cu articole, cantități, prețuri, transport, reducere și TVA 19% |
| Plată electronică | Stripe test mode sau sandbox local cu card `4242 4242 4242 4242` |
| Administrare | Ruta protejată `/admin`: catalog, stocuri, comenzi, utilizatori |

## 8. Personalizări și elemente de originalitate

### Modulul de descoperire conversațională

Prima pagină pornește de la întrebarea „Ce ai vrea să găsești astăzi?”. Modulul interpretează expresii precum „un cadou de casă nouă sub 150 lei” și extrage automat bugetul, ocazia, categoria, materialul și urgența. Rezultatele sunt ordonate după relevanță și filtrele detectate sunt aplicate în catalog.

### Scena 3D „ceainicul atelierului”

Un ceainic ceramic imaginar este construit procedural din corp, capac, toartă, cioc, glazură, petale, ac și un fir curbat. Obiectul răspunde la cursor, plutește subtil și este completat de o secvență GSAP pentru intrarea elementelor. Randarea 3D este limitată la aproximativ 30 FPS, folosește un pixel ratio plafonat, se oprește când tabul nu este vizibil și este înlocuită de un fallback CSS pe ecrane mici sau în modul `prefers-reduced-motion`.

### Fluxul complet de cont

Magazinul folosește autentificarea securizată oferită de Sites, fără o parolă suplimentară stocată de proiect. După autentificare, clientul își completează telefonul, adresa și preferințele; datele se salvează în tabela `profiles` când Supabase este configurat și rămân demonstrabile local în lipsa credențialelor.

### Fluxul de încredere

Checkout-ul explică explicit mediul sandbox, comanda apare în administrare, iar factura conține dovada plății de test. Astfel, demonstrația cerinței de plată este completă, repetabilă și nu implică bani reali.

## 9. Scenariu recomandat pentru demonstrație

1. Deschide homepage-ul și mișcă cursorul peste ceainicul 3D.
2. Caută „Vreau un cadou cald pentru o prietenă, îi plac plantele, sub 150 lei și să ajungă repede”.
3. Arată semnalele înțelese și motivele potrivirii în `/catalog`, apoi modifică filtrele.
4. Deschide pagina produsului „Ierbar de câmp” și prezintă galeria, atelierul, stocul și livrarea.
5. Creează/autentifică un cont, completează profilul și adresa implicită.
6. Adaugă produsul în coș, aplică `POVESTE10` și modifică cantitatea.
7. Continuă checkout-ul și folosește cardul `4242 4242 4242 4242`, expirare `12/34`, CVC `123`.
8. Tipărește factura, verifică istoricul din cont și apoi ruta `/admin`.

## 10. Capturi de ecran necesare pentru predare

- homepage și căutarea în limbaj natural;
- rezultatele filtrate și catalogul pe categorii;
- pagina individuală de detalii produs;
- creare cont, profil și adresă;
- coșul și actualizarea cantității;
- promoția `POVESTE10`;
- checkout-ul sandbox cu datele de test vizibile;
- confirmarea plății și factura;
- panoul admin: catalog/stoc și comenzi;
- rezultat PageSpeed Insights pentru URL-ul publicat.

## 11. PageSpeed și optimizări

- imagini de produs redimensionate și comprimate;
- imagini sub fold încărcate cu `loading="lazy"`;
- scena Three.js încărcată dinamic, plafonată la aproximativ 30 FPS și suspendată în taburile ascunse;
- animațiile respectă `prefers-reduced-motion`;
- Oswald este servit local, fără cereri Google Fonts la runtime;
- layout responsive și elemente accesibile din tastatură.

Pentru captura cerută: deschide `https://pagespeed.web.dev/`, introdu URL-ul public și salvează ecranul cu rezultatele Mobile și Desktop.

Raportul Mobile rulat la 26.10.2026 după optimizare a obținut:

- **98 — Performanță**;
- **91 — Accesibilitate**;
- **100 — Cele mai bune practici**;
- **100 — SEO**;
- FCP 1,4 s, LCP 1,7 s, TBT 0 ms, CLS 0.

Raport salvat: [PageSpeed Insights — Fir de Poveste](https://pagespeed.web.dev/analysis/https-fir-de-poveste-handmade-elatedpine3-chatgpt-site/9v9t26yub8?form_factor=mobile)

## 12. Limitări și trecerea la producție

Produsele, clienții și firma din demo sunt fictive. Pentru producție sunt necesare: configurarea proiectului Supabase, chei Stripe test/live, validarea juridică a termenilor și politicilor, webhook Stripe pentru confirmarea server-side și notificări tranzacționale. Autentificarea contului este deja delegată mecanismului securizat Sites. Nicio cheie secretă nu trebuie comisă în repository.
