import { InfoPage } from "@/components/info-page";
export default function SellerTerms() {
  return <InfoPage eyebrow="Creatori · versiunea seller-2026-10" title="Condiții de participare" intro="Condiții pentru etapa de test a atelierelor independente. Lansarea comercială necesită verificarea identității comerciale și a documentelor aplicabile." sections={[
    { title: "Conținut și responsabilitate", body: "Trimiți doar produse și materiale asupra cărora ai drepturi. Descrierile, stocul, prețurile și timpii de realizare trebuie să fie corecte. Nu publica date personale ale altor persoane. Nu sunt permise produse contrafăcute, ilegale sau descrieri înșelătoare." },
    { title: "Moderare și publicare", body: "Atelierul și produsele sunt verificate înainte de a fi vizibile. Modificarea unui produs publicat îl readuce în ciornă pentru o nouă verificare. Putem restricționa sau suspenda un atelier; acțiunile de moderare se înregistrează cu un motiv." },
    { title: "Plăți și comisioane", body: "Comisionul pilot este de 5,5% din produsele achitate după reduceri, fără transport, taxă de listare sau abonament. Politica seller-2026-10-31 este publicată la /sell/fees și acceptată separat de titular înaintea Stripe Connect. Modul curent folosește plăți de test. Lansarea comercială necesită identitate juridică, politici de retur, livrare și facturare validate; documentul Stripe nu este prezentat drept factură fiscală românească verificată." },
    { title: "Date și suport", body: "Contul și apartenența la atelier stabilesc cine poate edita conținutul. Nu colectăm date bancare în formularele atelierului. Pentru corectarea datelor, contestarea unei decizii sau închiderea atelierului folosește pagina Contact." },
  ]} />;
}
