# Modele 3D

- `antique-ceramic-vase` — Antique Ceramic Vase 01, James Ray Cock, Poly Haven, licență CC0: https://polyhaven.com/a/antique_ceramic_vase_01
- `carved-wooden-elephant` — Carved Wooden Elephant, Greg Zaal, Poly Haven, licență CC0: https://polyhaven.com/a/carved_wooden_elephant
- `throw-pillows` — Throw Pillows 01, Serhii Khromov, Poly Haven, licență CC0: https://polyhaven.com/a/throw_pillows_01
- `brass-vase-03` — Brass Vase 03, Rico Cilliers, Poly Haven, licență CC0: https://polyhaven.com/a/brass_vase_03
- `brass-goblets` — Brass Goblets, Tina, Poly Haven, licență CC0: https://polyhaven.com/a/brass_goblets
- `bronze-whale` — Bronze Whale Statue, Tina, Poly Haven, licență CC0: https://polyhaven.com/a/bronze_whale_statue
- `brass-vase-04` — Brass Vase 04, Rico Cilliers, Poly Haven, licență CC0: https://polyhaven.com/a/brass_vase_04

Modelele provin din variantele 2K Poly Haven; texturile JPEG sunt optimizate local la maximum 1536 px, cu eșantionare 4:4:4 pentru păstrarea detaliilor. Se pot reproduce cu `npx tsx scripts/optimize-model-textures.ts`. Scena alternează automat la 3 secunde între șapte obiecte detaliate, într-o ordine aleatorie fără repetări consecutive. Este folosit un singur context WebGL și se preîncarcă numai următorul obiect; obiectul curent rămâne vizibil dacă descărcarea durează mai mult. Nu există meniu, contoare sau butoane de carusel. Pe mobil, vizualizarea 3D se activează la cerere. Schimbarea și rotația se opresc la interacțiune, hover, focus, în afara ecranului sau într-un tab ascuns. Preferința de reducere a animațiilor dezactivează schimbarea automată; Space și Escape permit controlul mișcării din tastatură.

`hero-fallback.png` este o randare locală a modelului Antique Ceramic Vase 01 (CC0), folosită pe mobil înainte de activarea scenei și dacă WebGL nu este disponibil. Pe desktop apare direct primul cadru 3D pregătit, fără schimbarea unei imagini statice cu alt obiect.
