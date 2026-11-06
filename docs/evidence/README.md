# Capturi și rapoarte

Capturile cu prefix MOCK verifică interfața în contexte izolate cu autentificare și API simulate. Nu dovedesc înregistrarea unui utilizator, publicarea unui atelier, livrarea unui email sau încasarea unei plăți în serviciile externe.

Capturile locale fără acest prefix trebuie interpretate împreună cu testul care le generează. Artefactele ultimei rulări sunt în `test-results/` și `playwright-report/`, excluse din Git. Testele SQL folosesc PostgreSQL local PGlite, nu baza publică.

Pentru predare, păstrează separat capturile domeniului public, confirmarea unei plăți TEST efectuate personal și PageSpeed public. Ascunde datele personale și referințele sensibile. Nu atribui unui scor Lighthouse local valoarea unui rezultat PageSpeed public.
