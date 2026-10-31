# Dovezi generate

Fișierele `home-*`, `search-*` și `sell-*` sunt capturi Playwright ale aplicației locale care rulează. Cele cu prefix `MOCK-editor-*` folosesc sesiune și transport API simulate în contextul izolat al testului de interfață. Ele verifică randarea/autosalvarea din UI, NU demonstrează o autentificare Supabase reală sau un magazin publicat extern.

Datele publice din catalogul existent sunt seed demonstrativ. Testele SQL execută schema și migrarea în PostgreSQL local PGlite; nu sunt capturi din baza externă.

Nu există capturi ale unei plăți, încasări seller, facturi fiscale sau deployment nou în această livrare. Acestea se capturează numai după testarea serviciilor respective. Rapoartele Lighthouse, dacă prezente, provin din build local de producție, nu din PageSpeed pe domeniul public.
