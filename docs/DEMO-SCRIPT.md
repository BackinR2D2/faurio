# Demonstrație de 5–8 minute

Pregătire: rulează migrarea din DEPLOYMENT.md într-un proiect de staging, păstrează 720 produse demo, creează două conturi de creator și un operator confirmat. Aprobă atelierele și pregătește câte o piesă. Aceste conturi NU au fost create automat în Supabase în această livrare.

1. **0:00–1:00 — căutare:** deschide `/`, caută „pahare sub 100 lei”. Arată tipul și bugetul interpretat, doar pahare din inventar și URL-ul păstrat la paginare. „Show gifts under 50 EUR” arată limita de monedă fără conversii inventate.
2. **1:00–2:00 — produs și coș:** intră pe un produs legacy, arată materialul, stocul și timpul de pregătire. Actualizează cantitatea în coș. Nu prezenta imaginile seed ca fotografii individuale autentificate sau ratinguri ca recenzii verificate.
3. **2:00–4:00 — identitatea atelierului:** creator A în `/studio/appearance`, alege Clay, scrie povestea și mută o secțiune cu tastatura. Așteaptă salvarea. Pagina publică rămâne neschimbată până la Publică. Creator B alege Botanical și păstrează conținutul propriu.
4. **4:00–5:00 — produs și moderare:** creator A trimite o piesă spre verificare. Operatorul o aprobă în `/admin/marketplace` cu motiv. Arată intrarea de audit și pagina atelierului. Suspendarea ascunde imediat atelierul și piesele.
5. **5:00–6:00 — izolare:** arată raportul `npm test`, inclusiv shop ID falsificat, ciorne private, conflict de revizie și refuzul checkout-ului pentru un seller fără plăți. Nu este nevoie să expui chei sau date personale.
6. **6:00–8:00 — plată de test pregătită separat:** doar un produs legacy, Stripe listener pornit, card de test 4242. Confirmă statusul paid în baza staging și evenimentul webhook. Arată documentul Stripe cu denumirea corectă. Dacă acest test nu a fost pregătit/executat, spune explicit că nu este demonstrat; nu folosi o captură simulată drept dovadă de tranzacție.

Încheie cu raportul Lighthouse local și lista etapelor rămase. PageSpeed public și documentele fiscale se verifică separat înainte de lansarea comercială.
