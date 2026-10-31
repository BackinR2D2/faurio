# Căutare Faurio

## Înainte

`lib/search-intent.ts` interpreta româna prin expresii regulate, extrăgea tip/categorie/buget/material/culoare și aplica interogări Supabase. Termenii rămași erau căutare full-text AND. Nu exista apel AI; ordonarea Relevanță folosea rating/număr de recenzii. Propozițiile lungi puteau deveni prea restrictive, iar interpretarea depindea de dicționare fixe.

## Acum

1. Formularele și API-ul acceptă până la 1.200 caractere.
2. Serverul citește taxonomia produselor publicate din DB, nu inventează tipuri și nu trimite întregul catalog sau comenzile către model.
3. Groq extrage JSON strict: obiectele cerute, cerințele obligatorii și vocabularul semantic de relevanță. Model implicit `openai/gpt-oss-20b`, găzduit de Groq; nu cere un abonament separat sau o cheie OpenAI.
4. Zod verifică rezultatul. Tipurile necunoscute sunt refuzate. Parserul determinist păstrează bugetele explicite, tipurile cunoscute, culoarea și celelalte constrângeri; un tricou nu devine o vază. Cererile vagi fără sens utilizabil sau intervalele contradictorii dau zero rezultate.
5. `search_marketplace_catalog` aplică toate constrângerile în PostgreSQL pe întregul catalog publicat. Scorul semantic explicabil folosește vocabularul generat de AI în nume/tip, material/culoare și descriere/metadate. Sortarea și numărul total se calculează înainte de paginare. Nu este vector search și nu este un LLM care selectează IDs din prima pagină.
6. Rezultatele sunt doar rânduri reale, active, moderate, ale atelierelor publicate. Zero potriviri înseamnă zero rezultate, fără completare cu produse ieftine fără legătură.

## Activare gratuită în limita cotelor

Creează o cheie la [Groq Console](https://console.groq.com/keys), pune `GROQ_API_KEY` exclusiv în `.env.local` / secretele serverului. Aplică migrările marketplace și `202610310001_ai_search.sql`. Opțional: `GROQ_MODEL`, `GROQ_DAILY_SEARCH_LIMIT=200`, `SEARCH_AI_ENABLED=true`. Modelul, disponibilitatea și limitele planului gratuit se verifică în cont: [rate limits](https://console.groq.com/docs/rate-limits), [structured outputs](https://console.groq.com/docs/structured-outputs). Nu există un angajament de utilizare nelimitată sau latență sub 2 secunde pentru apelurile AI.

Apelurile au timeout de 7 secunde, maximum 1.200 tokenuri de răspuns, cache comun de o oră și o cotă DB zilnică atomică, implicit 200, maximum configurabil 1.000. Se contorizează și încercările eșuate; limita se raportează la ziua DB. Aceasta protejează bugetul global, nu înlocuiește firewall/CAPTCHA sau limitarea traficului pe hosting. Dacă nu există cheie, schema lipsește, providerul refuză sau cota este epuizată, căutarea exactă rămâne funcțională și UI nu pretinde utilizarea AI.

Emailurile și numerele de telefon evidente se maschează înainte de trimitere. Nu introduce date personale în căutări; mascarea nu garantează anonimizarea unei povești libere. Verifică Data Controls/retention din [Groq](https://console.groq.com/docs/your-data) și politica de confidențialitate înainte de înscrieri publice. Nicio cheie și niciun profil/istoric de comandă nu ajunge în browserul public sau în prompt.

## Limite urmărite

Extracția LLM este probabilistică, nu înțelegere perfectă a oricărei povești. Parserul protejează constrângerile cunoscute și substantivele precise frecvente; taxonomia și testele trebuie extinse pentru tipuri noi. Relevanța lexicală extinsă de AI nu oferă încă embeddings, învățare din clicuri, mesaje conversaționale cu context sau analiză vizuală. Preferăm false-negative în locul recomandărilor precise false. Testele mock nu dovedesc calitatea modelului live; folosește un set evaluat de cereri reale și verifică rezultatele manual înainte de lansare.
