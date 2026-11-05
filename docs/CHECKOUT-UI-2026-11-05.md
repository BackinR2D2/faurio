# Checkout și confirmare — 5 noiembrie 2026

- Titlu: „Finalizează comanda.”, cu dimensiune și spațiere reduse.
- Checkout-ul cumpărătorului folosește texte neutre: „Plată online securizată”, „Continuă la plată” și „Detalii plată”, fără logo sau promovarea procesatorului.
- Avertizarea despre bani și carduri de test rămâne vizibilă. Nu s-a activat modul LIVE.
- Confirmarea afișează separat numărul integral al comenzii, totalul și acțiunile; referințele lungi se împart pe rânduri pe mobil.
- Pagina fără sesiune validată nu afișează succes sau total achitat. Verificarea server-side, persistența și notificările existente sunt păstrate.
- Informațiile necesare despre procesator din documentele juridice și configurarea încasărilor creatorilor nu au fost eliminate.

Verificare locală: TypeScript, build de producție, 88 teste unitare/de integrare și 12 verificări browser desktop/mobil. Layout-ul confirmării a fost verificat vizual la 360, 640, 1024 și 1440 px folosind explicit o chitanță fictivă randată cu componenta reală și CSS-ul aplicației. Aceste teste nu reprezintă efectuarea unei tranzacții Stripe sau validarea întregului flux financiar.

## Revizia aprobată după previzualizarea locală

- Titlul confirmării devine „Mulțumim, [prenume]!”, cu rezumat și acțiuni separate.
- Stilurile confirmării sunt încărcate de layout-ul rutei checkout, într-un fișier dedicat, fără reguli duplicate în stylesheet-ul global.
- `/checkout/preview` permite numai în development inspectarea cu date fictive; în build-ul de producție răspunde 404. Nu inițiază plăți, nu salvează comenzi și nu trimite emailuri.
- Verificarea browser include acum și pagina SSR reală de previzualizare, reîncărcare completă, revenirea din catalog și detectarea erorilor de hidratare, nu doar inserarea unui fragment de markup.
- TypeScript, build-ul local și cele 12 verificări desktop/mobil au trecut. Încărcarea CSS și blocarea previzualizării au fost verificate separat pe build-ul local de producție.
- Utilizatorul a aprobat explicit publicarea acestei revizii după previzualizarea locală.
