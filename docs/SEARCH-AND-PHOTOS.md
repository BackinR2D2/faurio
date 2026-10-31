# Căutare și fotografii · 30 octombrie 2026

## Căutarea

Parserul nu mai elimină termenii necunoscuți atunci când găsește un buget, material sau destinatar. Termenii rămași sunt condiții textuale obligatorii în PostgreSQL, împreună cu filtrele structurate. Căutarea folosește `plainto_tsquery`, nu operatori OR interpretați din textul vizitatorului. Nu există fallback automat la produse ieftine fără legătură și nu se inventează produse.

`as cauta un tricou maro, am un buget de 100 de lei maxim.` păstrează `tricou`, `maro` și prețul <= 100 RON. Catalogul demonstrativ nu are acest produs: rezultatul verificat este zero. Sunt recunoscute și bugetele cu „maxim” după sumă, limita zero, culorile suplimentare și suporturile de lumânare distinct de lumânări. Sliderul afișează bugetul interpretat și poate doar restrânge această limită.

Acesta rămâne un parser determinist, conservator, nu un LLM și nici o garanție de înțelegere a oricărei povești. Termenii necunoscuți nu sunt ignorați pentru a crește artificial numărul de rezultate.

## Fotografii

24 de imagini ilustrative au fost generate individual cu instrumentul built-in `image_gen`, apoi verificate vizual și optimizate la maximum 1000 × 1000 px, WebP. Fișierele finale sunt în `public/products/catalog/` (3.018.764 bytes în total). Manifestul este `lib/product-media.json`; setul complet de prompturi și corespondența fișierelor sunt în `docs/product-image-prompts.json`.

Fiecare dintre cele 24 de modele demonstrative are imaginea sa, potrivită tipului, materialelor și culorii. Cele 30 de ediții ale aceluiași model folosesc aceeași imagine reprezentativă: nu sunt 720 de fotografii unice și nu sunt fotografii autentice ale inventarului unui comerciant. Pagina produsului le etichetează ca ilustrative. Nu mai afișăm două copii decupate drept fotografii diferite de detaliu.

Catalogul citește în continuare coloana `products.image` din Supabase, fără substituții ascunse în UI. La 30 octombrie, `npm run db:media -- --apply` a actualizat numai `image` și `image_position` pentru 720 de produse demonstrative. Prețurile, stocurile, numele, comenzile și fotografiile personalizate nu au fost rescrise. Rularea ulterioară read-only a găsit 720 de asocieri corecte și zero actualizări necesare.

```bash
npm run db:media
npm run db:media -- --apply
```

Prima comandă doar inspectează. A doua operează numai asupra ID-urilor demonstrative cunoscute, cu tipul corect și una dintre cele trei fotografii generice vechi; condițiile se reverifică și la actualizare. Rularea este idempotentă și nu înlocuiește fotografiile personalizate. Pentru instalări noi, seed-ul folosește deja imaginile corecte. Nu rerula seed-ul complet pe o bază cu stocuri reale doar pentru fotografii.

## Studio

Selectorul de fotografii și validatorul acceptă biblioteca nouă. Pentru salvări prin Studio, după migrarea marketplace `202610300001`, aplică `supabase/migrations/202610300002_product_media.sql` în SQL Editor. Migrarea nouă extinde lista SQL permisă, fără a permite URL-uri externe arbitrare sau a schimba autorizarea. Cele două migrații sunt testate împreună în PostgreSQL PGlite. Nu au fost aplicate automat în Supabase: mediul configurat are acces REST, fără conexiune SQL directă. Căutarea și fotografiile catalogului existent funcționează fără această activare Studio.

## Verificare

- 35 de teste unitare și de integrare trecute, inclusiv parser, existența/optimizarea celor 24 de fișiere și validarea SQL a fotografiilor.
- 22 de teste Playwright trecute în Chrome desktop și mobil, pe buildul de producție separat și cu baza Supabase configurată. Testele editorului rămân explicit mock-uri, nu dovada unui onboarding real.
- TypeScript, lint, build de producție și `git diff --check` trecute.
- Capturi reale: `docs/evidence/search-shirt-*.png`, `catalog-textiles-*.png`, `product-blanket-*.png`.
- Fără publicare externă, încasare Stripe sau modificare a secretelor. Procesul utilizatorului de pe portul 3000 a fost păstrat.
