# Faurio — model de business, ST1 și ST2

## Poziționare și diferențe față de studii

ST1 propune un magazin B2C centralizat pentru produse handmade locale, cu filtre pe metadate, povești de creatori, personalizare, conturi, favorite, urmărire și guest checkout. ST2 reafirmă explicit modelul centralizat și alege Medusa ca motor headless. Cererea actuală extinde intenționat proiectul către un marketplace cu administrare de către creatori și încasări Stripe Connect. Aceasta este o schimbare de model, nu implementarea identică a ST2.

Documente citite, fără modificare: `/Users/cristianniculae/Downloads/ST1_Niculae_Robert_Cristian.pdf`, `/Users/cristianniculae/Downloads/ST2_Niculae_Robert_Cristian.pdf`.

## Politici comparate la 31 octombrie 2026

| Platformă | Politică relevantă |
|---|---|
| Etsy | 6,5% transaction fee, inclusiv transport/ambalaj cadou; listing și payment processing sunt separate. |
| Folksy | 6% + VAT pe vânzări; condiții distincte de listare/abonament. |
| Breslo | Fără taxă de listare; pagina distinge scheme de 19% sau taxare cu minimum lunar 5,7 EUR și plafon legat de 6,9% din vânzări, în condițiile publicate. Nu există o singură rată universală. |
| Faurio pilot | 5,5% din produse după reduceri, exclus transport; fără taxă de listare, abonament sau suprataxă buyer. |

Surse: [Etsy](https://www.etsy.com/legal/fees/), [Folksy](https://folksy.uservoice.com/knowledgebase/articles/58077-how-much-does-it-cost-to-sell-on-folksy), [Breslo](https://www.breslo.ro/us/fees). Faurio este cu 1 punct procentual sub rata Etsy și cu 0,5 sub Folksy. Bazele de calcul și TVA diferă; nu este o comparație all-inclusive.

## Venit implementat, nu profit fictiv

Serverul încarcă prețurile reale, validează atelierul și stocul și calculează comisionul în bani întregi. Stripe primește application_fee_amount = 550 bps din produsele după reduceri și transfer_data.destination = contul Connect verificat al creatorului, niciodată un cont trimis de client. Titularul acceptă politica separat înainte de onboarding. Confirmarea unui return URL nu activează plățile: capabilities sunt recitite din Stripe.

Produse 100 lei + livrare 19 lei: cumpărătorul achită 119 lei, creatorul primește transferul 113,50 lei, iar application fee este 5,50 lei. Platforma suportă costurile Stripe/Connect, suportul, hostingul, obligațiile fiscale și eventualele dispute; comisionul este venit brut, nu profit. Atelierul legacy este operatorul însuși, fără comision artificial către sine. Un checkout achită un atelier, iar celelalte produse rămân în coș.

Fee snapshots persistă în DB; creatorii au acces doar la propriile comenzi. Operatorul are `/admin/finance`. Rambursările din Faurio cer inversarea transferului și application fee, iar ledger-ul urmează valorile Stripe confirmate. Pending/failed/cancelled orders nu sunt afișate ca venit. Exemplu ilustrativ: 100 de comenzi cu produse de 200 lei înseamnă GMV produse 20.000 lei și comision brut 1.100 lei, înainte de costuri/refunduri/taxe. Nu este o prognoză sau un venit realizat. Stripe TEST nu produce venit real.

## Îmbunătățiri legate de studii

- Descoperire: Groq extrage intenția, PostgreSQL filtrează și ordonează întregul catalog publicat înainte de paginare. Cerințele precise nu sunt înlocuite cu obiecte ieftine fără legătură.
- Identitate: teme, tipografie, poveste, secțiuni reordonabile, versiuni și fotografii proprii optimizate în Storage, fără HTML/JS arbitrar.
- Încredere: membership/RLS și moderare auditată. Utilizatorii autentificați pot lăsa o recenzie per produs; numai cumpărătorii cu o comandă achitată și livrată primesc eticheta de achiziție verificată. Autorecenziile sunt interzise. Numai recenziile aprobate contribuie la ratingurile publice.
- Operațiuni: Stripe găzduit, Connect, rezervare atomică, comisioane explicite, order tracking, retururi persistente și confirmare email după plată. Cererea de retur nu promite automat bani înapoi.
- Performanță: paginare server-side, imagini optimizate, cache/cote AI și homepage cu poster utilizabil fără WebGL. Latența externă AI se măsoară separat; ținta de două secunde din studii nu este promisă pentru fiecare apel.

## Abateri și etape ulterioare

Supabase rămâne sursa unică pentru produse, inventar și comenzi. Medusa NU a fost introdus; nu există două sisteme de comenzi sincronizate. Migrarea Medusa rămâne un milestone separat cu staging, identitate unitară, import/reconciliere și cutover unic. Alegerea reduce riscul și costul de POC, dar este o abatere față de ST2 și trebuie declarată în prezentare. Configuratorul comercial de variante și prețuri dinamice din exemplul de brățară ST2 nu este încă implementat.

Nu adăugăm abonamente sau promovare înainte de validarea vânzărilor și costurilor. Ulterior pot exista analytics premium și promoted listings voluntare, marcate explicit, nu manipularea ascunsă a căutării.

Lansarea reală cere validarea datelor juridice ale operatorului/comercianților, TVA/facturării, politicilor și obligațiilor marketplace, retururilor, produselor, dispute/chargebacks și monitorizării/backupului. Onboardingul Stripe nu înlocuiește aceste obligații. [Îndrumări UE](https://europa.eu/youreurope/business/selling-in-eu/selling-goods-services/ecommerce-distance-selling/index_en.htm). Cheile live sunt refuzate intenționat până la validarea separată a lansării comerciale.
