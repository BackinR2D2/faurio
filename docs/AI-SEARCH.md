# Căutare Faurio

Fiecare căutare nevidă este interpretată pe server prin Groq, cu modelul implicit `openai/gpt-oss-120b`. Nu este necesară o cheie sau un abonament OpenAI. UI-ul prezintă rezultatele, nu tehnologia folosită.

## Selectarea produselor

1. Serverul citește toate produsele publicate din `catalog_products`, în loturi de 500. Indexul se păstrează 30 de secunde. Modelul primește tipurile disponibile, intervalele de preț, stocul agregat și exemple reprezentative, nu clienți sau comenzi.
2. Modelul interpretează maximum 1.200 caractere într-o schemă JSON strictă. O poveste generează tipuri potrivite și motive practice: pentru un profesor, jurnale, semne de carte sau organizare. O cerere precisă rămâne precisă: pahare nu înseamnă căni, iar un tricou absent nu este înlocuit cu decorațiuni.
3. Validarea Zod și parserul local protejează bugetele și cerințele explicite. Tipurile recomandate trebuie să existe în taxonomia publicată. Pregătirea rapidă și personalizarea nu sunt presupuse fără dovezi în cerere.
4. PostgreSQL aplică restricțiile pe întregul catalog publicat. Culorile sunt comparate ca termeni întregi: alb nu se potrivește cu albastru. Excluderile de tip, culoare și material sunt obligatorii; alternativele explicite („alb sau albastru”) folosesc OR, iar atributele combinate folosesc AND. Relevanța combină termenii interpretați cu atributele reale. Pentru povești, familiile de produse sunt diversificate înainte de paginare, astfel încât edițiile aceluiași produs să nu umple prima pagină. Sortarea explicită după preț rămâne globală.
5. Sunt returnate numai produse reale, active, moderate și publicate. Nu există completare cu produse fără legătură.

Nu este vector search și modelul nu inspectează fiecare fotografie. Rezumatele pe tip au maximum patru familii exemplu; relevanța trebuie evaluată și pentru categorii noi. Interpretarea este probabilistică, nu o garanție de înțelegere perfectă a oricărei povești.

## Filtrele catalogului

Interpretarea completează prețul minim/maxim, tipurile, materialele și pregătirea rapidă atunci când acestea sunt cerute. Categoriile sunt identificate din tipurile selectate și taxonomia întregului catalog, nu doar din produsele primei pagini. O interpretare eșuată nu completează presupuneri în formular.

Categoriile, materialele și tipurile permit selecții multiple. Alternativele manuale folosesc OR în interiorul unui grup și AND între grupuri; ele rafinează cererea, fără să elimine bugetul sau excluderile din text. Limitele explicite rămân afișate în rezumat. Pentru o cerere diferită se trimite o căutare nouă, care elimină filtrele manuale precedente. „Resetează” elimină doar rafinările manuale, iar X elimină și cererea.

URL-ul folosește parametri repetați `categorie`, `material`, `tip`, plus `pretMin`, `pret`, `rating`, `rapid` și `sort`. Linkurile vechi cu o singură categorie/material rămân valide. Numai câmpurile modificate manual sunt persistate; paginarea, reîncărcarea și Înapoi păstrează selecțiile.

Migrarea `202611070001_catalog_multi_filters.sql` este aplicată în ae_proj. `npx tsx scripts/check-catalog-filters.ts` verifică read-only suportul RPC și refuzul execuției anonime. `npx tsx scripts/check-pilot.ts` verifică agregat starea configurării atelierelor și webhook-urilor TEST, fără clienți sau secrete în output.

## Configurare și indisponibilitate

`GROQ_API_KEY` și `GROQ_MODEL=openai/gpt-oss-120b` sunt exclusiv server-side. Aplică migrările marketplace, `202610310001_ai_search.sql` și `202611060001_search_constraints.sql` numai dacă nu sunt deja aplicate. `GROQ_DAILY_SEARCH_LIMIT=200` limitează cererile noi, maximum 1.000; cache-ul comun este de o oră, legat de model și amprenta catalogului.

Interpretările valide au și un cache local de maximum 15 secunde, care nu depășește expirarea indexului de inventar. Acesta evită recitirea interpretării la aplicarea filtrelor și paginării. Cheia locală separă textele originale prin hash; nu reutilizează rezultatul deja îmbinat al altui text care ar deveni identic după mascarea datelor personale. Erorile nu sunt păstrate. Rezultatele, prețurile, stocurile și vizibilitatea produselor sunt citite în continuare din baza de date la fiecare cerere.

Timeout: 12 secunde per încercare; maximum 1.500 tokenuri de răspuns. Dacă lipsesc cheia, schema sau cota, ori furnizorul refuză cererea, căutarea returnează HTTP 503 și permite reîncercarea. Nu revine în tăcere la reguli și nu pretinde că lipsa serviciului înseamnă lipsă de produse. Catalogul fără query rămâne navigabil.

Planul gratuit are cote și nu oferă disponibilitate nelimitată: [Groq rate limits](https://console.groq.com/docs/rate-limits), [structured outputs](https://console.groq.com/docs/structured-outputs). `SEARCH_AI_ENABLED=false` este numai un comutator operațional pentru testarea indisponibilității, nu un motor alternativ.

Emailurile și telefoanele evidente sunt mascate înainte de trimitere, fără garanția anonimizării unei povești. Nu introduce date personale. Verifică [politica Groq privind datele](https://console.groq.com/docs/your-data) înainte de extinderea pilotului.

## Verificare

`npx tsx scripts/check-groq.ts` face apeluri reale și nu modifică DB. Testele `tests/e2e/ai-recommendations.spec.ts` verifică separat interpretarea, produsele din DB, bugetul, diversitatea și paginarea. Testele unitare cu răspunsuri simulate nu înlocuiesc evaluarea furnizorului live.
