# Faurio — proiect de comerț electronic

Faurio este un marketplace B2C pentru ateliere independente care comercializează produse handmade. Pilotul public este disponibil la [faurio-marketplace.netlify.app](https://faurio-marketplace.netlify.app), cu plăți exclusiv TEST.

Catalogul demonstrativ cuprinde ceramică, sticlărie, textile, lumânări, bijuterii, lemn, decorațiuni și papetărie. Cele 720 de ediții inițiale folosesc 24 de fotografii ilustrative reprezentative. Produsele reale ale creatorilor se publică după moderare, cu fotografiile lor.

## Implementare

Frontend și backend: Next.js App Router, React și TypeScript. Date și autentificare: Supabase PostgreSQL, Auth și Storage. Politicile RLS și validarea serverului izolează atelierele. Route handlers implementează comenzile, moderarea și integrările. Stripe Checkout/Connect este procesatorul folosit în sandbox. Confirmările comenzilor sunt trimise printr-un outbox privat, cu transport SMTP pentru pilot.

Căutarea folosește interpretare Groq într-o schemă JSON strictă și filtrare SQL pe întregul inventar publicat înainte de paginare. Numai la limita furnizorului (HTTP 429) sau cota zilnică epuizată se activează fallback-ul după cuvinte-cheie, cu aceleași restricții SQL. Acesta nu înlocuiește interpretarea semantică a poveștilor. Un produs absent nu este înlocuit cu altul fără legătură; în modul principal, o poveste despre un destinatar generează tipuri potrivite din inventar. Interpretarea nu este o garanție de înțelegere perfectă a oricărui text.

## Funcțiile magazinului

Navigare, categorii, filtre, paginare, pagină produs, stoc, coș actualizabil, promoții, cont confirmat, profil, favorite și istoric de comenzi. Plata găzduită rezervă stocul tranzacțional și confirmă comanda prin webhook semnat, idempotent. Cumpărătorul poate vedea pregătirea și urmărirea coletului, solicita retur și trimite recenzie după livrare. Numai recenziile aprobate de la cumpărători verificați generează ratinguri publice.

Creatorul aplică pentru atelier, iar operatorul îl verifică în `/admin/marketplace`. După aprobare, creatorul personalizează pagina și trimite produse spre moderare. Titularul configurează personal contul de încasări TEST în `/studio/payments`. Comisionul platformei este de 5,5% din valoarea produselor după reduceri, fără comision pe transport; detaliile sunt în termeni. Coșul cu mai multe ateliere se achită separat per atelier.

Documentul de plată nu este prezentat drept factură fiscală românească. AWB-ul nu este generat automat: vânzătorul organizează livrarea și introduce curierul și numărul de urmărire.

## Personalizări

1. Căutare conversațională cu buget, atribute, excluderi și recomandări pentru povești de cadouri.
2. Pagina proprie a atelierului: teme, tipografie, secțiuni reordonabile, galerie, poveste, FAQ, ciornă și publicare versionată.
3. Scenă Three.js cu șapte obiecte detaliate Poly Haven, texturi locale și alternare aleatorie la minimum trei secunde. GSAP gestionează tranzițiile; mișcarea se suspendă la interacțiune și respectă preferințele de accesibilitate.

## Prezentare și verificare

Scenariul și matricea cerințelor sunt în [prezentarea ST3](docs/ST3-PRESENTATION.md) și [scenariul demo](docs/DEMO-SCRIPT.md). [Raportul de teste](docs/TEST-REPORT.md) separă verificările reale de simulări.

Pentru susținere se atașează capturi ale fiecărei cerințe și rezultatul [PageSpeed Insights](https://pagespeed.web.dev/) pe domeniul public. O captură locală Lighthouse nu înlocuiește acest rezultat. Arhiva de predare se numește `site_nume_prenume.zip` și nu include parole, chei, backup-uri sau date personale.

ST1/ST2 originale se atașează separat la predare. [Modelul de afaceri](docs/BUSINESS-MODEL.md) explică extinderea magazinului centralizat spre marketplace și abaterea de la alegerea Medusa din ST2. Alegerea implementată este Next.js + Supabase; nu există un backend Medusa activ.
