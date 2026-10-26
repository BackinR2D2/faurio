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
- **Supabase** pentru PostgreSQL, comenzi și securitate Row Level Security atunci când sunt configurate credențialele;
- **Three.js** pentru obiectul 3D interactiv din hero;
- **GSAP** pentru animațiile de intrare;
- **Stripe Checkout** în test mode atunci când este configurată cheia; sandbox local implicit pentru demonstrație;
- CSS responsive, fără framework vizual greu.

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
| Navigare cu meniuri | Header responsive, ancore, meniu mobil |
| Catalog de produse | Secțiunea „Obiecte cu rost” |
| Categorii | Ceramică, Textile, Lumânări, Bijuterii |
| Detalii produs | Modal cu descriere, caracteristici, preț, imagine, rating și stoc |
| Coș + actualizare | Drawer lateral, cantități, total, transport și persistență |
| Înregistrarea comenzii | `/api/orders`, Supabase sau fallback local demonstrativ |
| Stocuri | Stoc vizibil la produs și modificabil din panoul admin |
| Promoții | Preț redus și codul `POVESTE10` |
| Factură | Factură cu articole, cantități, prețuri, transport, reducere și TVA 19% |
| Plată electronică | Stripe test mode sau sandbox local cu card `4242 4242 4242 4242` |
| Administrare | Footer → „Administrare demo”: catalog, stocuri, comenzi, utilizatori |

## 8. Personalizări și elemente de originalitate

### Modulul de descoperire conversațională

Prima pagină pornește de la întrebarea „Ce ai vrea să găsești astăzi?”. Modulul interpretează expresii precum „un cadou de casă nouă sub 150 lei” și extrage automat bugetul, ocazia, categoria, materialul și urgența. Rezultatele sunt ordonate după relevanță și filtrele detectate sunt aplicate în catalog.

### Scena 3D „firul de poveste”

Un obiect tridimensional construit procedural dintr-un nucleu, fire, ac și talisman răspunde la cursor, are lumină caldă și o mișcare subtilă continuă. Este încărcat în browser și respectă preferința de reducere a animațiilor.

### Fluxul de încredere

Checkout-ul explică explicit mediul sandbox, comanda apare în administrare, iar factura conține dovada plății de test. Astfel, demonstrația cerinței de plată este completă, repetabilă și nu implică bani reali.

## 9. Scenariu recomandat pentru demonstrație

1. Deschide pagina principală și mișcă cursorul peste obiectul 3D.
2. Selectează exemplul „Un cadou de casă nouă sub 150 lei”.
3. Modifică prețul maxim, materialul și filtrul de livrare.
4. Deschide detaliile produsului „Cană Luna” și adaugă-l în coș.
5. Aplică `POVESTE10` și modifică cantitatea.
6. Continuă checkout-ul și folosește cardul `4242 4242 4242 4242`, expirare `12/34`, CVC `123`.
7. Salvează factura ca PDF din dialogul final.
8. Deschide „Administrare demo” și arată comanda și gestiunea stocului.

## 10. Capturi de ecran necesare pentru predare

- homepage și căutarea în limbaj natural;
- rezultatele filtrate și catalogul pe categorii;
- modalul cu detalii produs;
- coșul și actualizarea cantității;
- promoția `POVESTE10`;
- checkout-ul sandbox cu datele de test vizibile;
- confirmarea plății și factura;
- panoul admin: catalog/stoc și comenzi;
- rezultat PageSpeed Insights pentru URL-ul publicat.

## 11. PageSpeed și optimizări

- imagini de produs redimensionate și comprimate;
- imagini sub fold încărcate cu `loading="lazy"`;
- scena Three.js încărcată dinamic;
- animațiile respectă `prefers-reduced-motion`;
- fără fonturi sau scripturi externe care blochează randarea;
- layout responsive și elemente accesibile din tastatură.

Pentru captura cerută: deschide `https://pagespeed.web.dev/`, introdu URL-ul public și salvează ecranul cu rezultatele Mobile și Desktop.

## 12. Limitări și trecerea la producție

Produsele, clienții și firma din demo sunt fictive. Pentru producție sunt necesare: configurarea proiectului Supabase, chei Stripe test/live, pagini juridice, politici de retur, webhook Stripe pentru confirmarea server-side și un sistem de autentificare. Nicio cheie secretă nu trebuie comisă în repository.
