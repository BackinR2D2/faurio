# Demonstrație de 8 minute

Deschide [Faurio](https://faurio-marketplace.netlify.app). Pregătește un cumpărător confirmat și un atelier aprobat, cu pagină și produs publicate. Configurează încasările TEST personal din Studio. Nu rerula seed-ul sau migrările deja aplicate.

La verificarea read-only din 7 noiembrie existau șapte plăți istorice TEST confirmate, dar niciun atelier nou cu procesator conectat. Configurarea unui atelier pentru demonstrație este un pas de pregătire, nu o verificare deja finalizată. Dacă nu o termini înainte de susținere, demonstrează plata pentru catalogul intern și declară separat limita fluxului de creator.

1. **Căutare (1 minut).** „pahare sub 100 lei”, apoi „vreau să cumpăr un cadou unchiului meu care e profesor, în buget de 250 lei maxim”. Arată doar produse reale în buget. „tricou maro sub 100 lei” trebuie să nu recomande decorațiuni în locul tricoului.
2. **Catalog și produs (1 minut).** Aplică filtre, schimbă sortarea și pagina. Deschide un produs, arată materialul, stocul și timpul de pregătire. Adaugă-l în coș și modifică o cantitate.
3. **Atelier (2 minute).** În `/studio/appearance`, schimbă tema și povestea, reordonează o secțiune, așteaptă autosalvarea. Publică și deschide pagina atelierului.
4. **Produs și moderare (1 minut).** Încarcă o fotografie proprie și trimite produsul la verificare. Din contul operatorului, aprobă-l cu motiv la `/admin/marketplace`. Arată produsul publicat.
5. **Plată TEST (2 minute).** Plasează o comandă cu un card de test permis de procesator. Plata este executată personal de prezentator. Verifică confirmarea, istoricul, stocul și emailul. Pentru produsul unui creator verifică separat comisionul și transferul în sandbox, nu doar comanda atelierului intern.
6. **Comandă și livrare (1 minut).** În `/studio/orders`, treci comanda în pregătire. Pentru expediere introdu curier și număr de urmărire reale pentru testul demonstrat. Nu prezenta un cod inventat drept colet real.

Încheie cu PageSpeed pentru domeniul public și rezultatele testelor. Nu arăta fișiere `.env`, tokenuri, parole, date personale sau capturi simulate drept plăți reale. Dacă un pas financiar nu este finalizat, menționează exact limita în prezentare.

Dacă serviciul de interpretare atinge cota, folosește o căutare precisă, precum „Jurnal Herbarium sub 130 lei”. Modul după cuvinte-cheie rămâne funcțional la cotă, dar nu promite interpretarea unei povești ca în modul principal. Nu epuiza cota sau modifica variabilele de producție pentru a demonstra fallback-ul; folosește captura QA etichetată ori serverul local izolat.
