export type Product = {
  id: string;
  name: string;
  maker: string;
  makerLocation: string;
  category: "Ceramică" | "Textile" | "Lumânări" | "Bijuterii";
  price: number;
  oldPrice?: number;
  material: string;
  color: string;
  occasion: string[];
  recipients: string[];
  moods: string[];
  image: string;
  imagePosition?: string;
  stock: number;
  rating: number;
  reviews: number;
  days: number;
  badge?: string;
  description: string;
  details: string[];
  care: string;
  story: string;
};

export const products: Product[] = [
  {
    id: "cana-luna", name: "Cană Luna", maker: "Atelier Lut Bun", makerLocation: "Cluj-Napoca", category: "Ceramică", price: 129,
    material: "ceramică glazurată", color: "crem și albastru", occasion: ["casă nouă", "aniversare", "cadou"],
    recipients: ["prietenă", "mamă", "colegă", "iubitoare de cafea"], moods: ["cald", "liniștit", "minimalist", "poetic"],
    image: "/products/ceramica-luna.avif", stock: 7, rating: 4.9, reviews: 34, days: 2, badge: "Favorit",
    description: "Modelată și glazurată manual, cu o semilună pictată liber. Fiecare cană are mici variații care o fac unică.",
    details: ["aprox. 330 ml", "glazură alimentară", "serie mică", "ambalaj fără plastic"],
    care: "Se poate spăla la mașină, pe program delicat. Evită șocurile termice.",
    story: "Luna este trasată dintr-o singură mișcare de pensulă, înainte ca piesa să intre pentru a doua oară în cuptor.",
  },
  {
    id: "vaza-pamant", name: "Vază Pământ", maker: "Atelier Lut Bun", makerLocation: "Cluj-Napoca", category: "Ceramică", price: 189,
    material: "gresie ceramică", color: "natur și nisipiu", occasion: ["casă nouă", "nuntă", "cadou"],
    recipients: ["cuplu", "mamă", "gazdă"], moods: ["organic", "minimalist", "natural", "elegant"],
    image: "/products/ceramica-luna.avif", imagePosition: "20% center", stock: 3, rating: 4.8, reviews: 18, days: 4, badge: "Serie mică",
    description: "O vază sculpturală arsă la temperatură înaltă, inspirată de formele rotunjite ale pietrelor de râu.",
    details: ["18 cm înălțime", "impermeabilă", "serie numerotată", "cutie de cadou inclusă"],
    care: "Curăță cu o lavetă moale și apă călduță. Nu folosi produse abrazive.",
    story: "Forma se construiește lent, prin suprapunerea și netezirea manuală a fâșiilor de gresie ceramică.",
  },
  {
    id: "broderie-ierbar", name: "Ierbar de câmp", maker: "Mâini de In", makerLocation: "Brașov", category: "Textile", price: 149, oldPrice: 179,
    material: "in și fir de bumbac", color: "ocru și verde", occasion: ["casă nouă", "aniversare", "cadou", "mulțumire"],
    recipients: ["prietenă", "mamă", "colegă", "iubitoare de plante"], moods: ["botanic", "cald", "delicat", "boem"],
    image: "/products/broderie-camp.avif", stock: 5, rating: 5, reviews: 27, days: 2, badge: "-17%",
    description: "Flori de câmp brodate fir cu fir pe pânză de in, montate într-un gherghef din lemn natur.",
    details: ["diametru 21 cm", "in prespălat", "gata de agățat", "semnată de artistă"],
    care: "Șterge ușor praful cu o pensulă moale. Păstrează departe de umezeală și soare direct.",
    story: "Modelul pornește de la plante culese și presate în plimbările de pe Tâmpa; fiecare compoziție diferă ușor.",
  },
  {
    id: "broderie-roz", name: "Grădină la apus", maker: "Mâini de In", makerLocation: "Brașov", category: "Textile", price: 159,
    material: "in și bumbac", color: "roz pudrat și verde", occasion: ["aniversare", "nuntă", "cadou"],
    recipients: ["prietenă", "soră", "mamă", "cuplu"], moods: ["romantic", "delicat", "botanic", "colorat"],
    image: "/products/broderie-camp.avif", imagePosition: "75% center", stock: 4, rating: 4.9, reviews: 21, days: 3, badge: "Nou",
    description: "O compoziție botanică brodată manual în tonuri de apus, pentru interioare calme și personale.",
    details: ["diametru 18 cm", "fir de bumbac", "piesă unicat", "ambalaj de cadou"],
    care: "Curăță uscat și protejează lucrarea de umiditate ridicată.",
    story: "Firele sunt amestecate ca într-o paletă de pictură pentru a obține trecerile subtile de culoare.",
  },
  {
    id: "lumanare-chihlimbar", name: "Lumânare Chihlimbar", maker: "Foc Domol", makerLocation: "Sibiu", category: "Lumânări", price: 79,
    material: "ceară de soia", color: "chihlimbar și crem", occasion: ["mulțumire", "casă nouă", "cadou", "aniversare"],
    recipients: ["prietenă", "colegă", "gazdă", "mamă"], moods: ["cald", "relaxant", "parfumat", "cozy"],
    image: "/products/lumanare-terrazzo.avif", imagePosition: "25% center", stock: 12, rating: 4.8, reviews: 46, days: 1, badge: "Livrare rapidă",
    description: "Ceară vegetală turnată manual în sticlă reciclată, cu parfum discret de smochină și lemn de cedru.",
    details: ["180 g", "aprox. 38 ore", "fitil din bumbac", "sticlă reutilizabilă"],
    care: "Taie fitilul la 5 mm înainte de fiecare aprindere și nu o lăsa nesupravegheată.",
    story: "Parfumul este dozat în loturi mici și lăsat să se matureze șapte zile înainte de expediere.",
  },
  {
    id: "tava-terrazzo", name: "Tăviță Terrazzo", maker: "Forme Mici", makerLocation: "București", category: "Bijuterii", price: 89,
    material: "compozit mineral", color: "teracotă și albastru", occasion: ["mulțumire", "aniversare", "cadou", "casă nouă"],
    recipients: ["prietenă", "colegă", "iubitoare de bijuterii", "gazdă"], moods: ["jucăuș", "modern", "colorat", "practic"],
    image: "/products/lumanare-terrazzo.avif", imagePosition: "80% center", stock: 8, rating: 4.7, reviews: 15, days: 2,
    description: "Turnată și șlefuită manual, cu inserții minerale și accente colorate. Perfectă pentru obiectele mici de zi cu zi.",
    details: ["12 cm diametru", "sigilată mat", "bază din plută", "rezistentă la apă"],
    care: "Șterge cu o lavetă umedă. Petele puternice trebuie îndepărtate rapid.",
    story: "Fragmentele colorate sunt recuperate din alte turnări, astfel încât aproape nimic nu se pierde în atelier.",
  },
];

export const categories = ["Toate", "Ceramică", "Textile", "Lumânări", "Bijuterii"] as const;
const plain = (value: string) => value.toLocaleLowerCase("ro-RO").normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export function getProduct(id: string) { return products.find((product) => product.id === id); }

export function interpretNaturalQuery(query: string) {
  const normalized = plain(query);
  const budgetMatch = normalized.match(/(?:sub|maxim|pana la|buget(?:ul)?(?: de)?|nu mai mult de)[^0-9]{0,18}(\d{2,4})/);
  const amount = budgetMatch ? Number(budgetMatch[1]) : undefined;
  const words: Record<string, Product["category"]> = {
    cana: "Ceramică", ceasca: "Ceramică", vaza: "Ceramică", ceramica: "Ceramică", lut: "Ceramică",
    broderie: "Textile", tablou: "Textile", textil: "Textile", panza: "Textile", in: "Textile",
    lumanare: "Lumânări", parfum: "Lumânări", ceara: "Lumânări", aromat: "Lumânări",
    bijuterii: "Bijuterii", tavita: "Bijuterii", organizator: "Bijuterii",
  };
  const category = Object.entries(words).find(([word]) => normalized.includes(word))?.[1];
  const occasionMap: Record<string, string> = { nunta: "nuntă", aniversare: "aniversare", "casa noua": "casă nouă", multumire: "mulțumire", craciun: "cadou", cadou: "cadou" };
  const occasionToken = Object.keys(occasionMap).find((word) => normalized.includes(word));
  const occasion = occasionToken ? occasionMap[occasionToken] : undefined;
  const recipientTokens = ["prietena", "mama", "colega", "sora", "cuplu", "gazda", "cafea", "plante", "bijuterii"].filter((word) => normalized.includes(word));
  const recipientMap: Record<string, string> = { prietena: "prietenă", mama: "mamă", colega: "colegă", sora: "soră", cafea: "iubitoare de cafea", plante: "iubitoare de plante", bijuterii: "iubitoare de bijuterii" };
  const recipientLabels = recipientTokens.map((recipient) => recipientMap[recipient] || recipient);
  const mood = ["cald", "minimalist", "natural", "elegant", "botanic", "delicat", "romantic", "colorat", "modern", "practic", "relaxant", "cozy", "boem", "poetic"].find((word) => normalized.includes(word));
  const color = ["crem", "albastru", "nisipiu", "ocru", "verde", "roz", "chihlimbar", "teracota"].find((word) => normalized.includes(word));
  const material = ["ceramica", "gresie", "in", "bumbac", "soia", "ceara", "mineral"].find((word) => normalized.includes(word));
  const ready = /rapid|repede|urgent|maine|poimaine|1 zi|2 zile|doua zile/.test(normalized);
  const tokens = normalized.split(/[^a-z0-9]+/).filter((token) => token.length > 3);

  const ranked = products.map((product) => {
    let score = 0;
    const reasons: string[] = [];
    const haystack = plain(`${product.name} ${product.maker} ${product.category} ${product.material} ${product.color} ${product.description} ${product.moods.join(" ")} ${product.recipients.join(" ")}`);
    if (category && product.category === category) { score += 8; reasons.push(product.category); }
    if (amount && product.price <= amount) { score += 6 + Math.max(0, (amount - product.price) / 100); reasons.push(`în buget (${product.price} lei)`); }
    if (amount && product.price > amount) score -= 9;
    if (occasion && product.occasion.includes(occasion)) { score += 5; reasons.push(`potrivit pentru ${occasion}`); }
    for (const recipientLabel of recipientLabels) if (product.recipients.includes(recipientLabel)) { score += 5; reasons.push(`pentru ${recipientLabel}`); }
    if (mood && product.moods.includes(mood)) { score += 4; reasons.push(`stil ${mood}`); }
    if (color && plain(product.color).includes(color)) { score += 4; reasons.push(`tonuri de ${color}`); }
    if (material && plain(product.material).includes(material)) { score += 5; reasons.push(product.material); }
    if (ready && product.days <= 2) { score += 5; reasons.push(`expediere în ${product.days} ${product.days === 1 ? "zi" : "zile"}`); }
    for (const token of tokens) if (haystack.includes(token)) score += 0.75;
    return { id: product.id, score, reasons: Array.from(new Set(reasons)).slice(0, 4) };
  }).sort((a, b) => b.score - a.score || (getProduct(b.id)?.rating || 0) - (getProduct(a.id)?.rating || 0));

  const hasSignals = Boolean(category || amount || occasion || recipientLabels.length || mood || color || material || ready);
  const selected = ranked.filter((item) => !hasSignals || item.score > 0);
  const ids = (selected.length ? selected : ranked).map((item) => item.id);
  const reasons = Object.fromEntries(ranked.map((item) => [item.id, item.reasons]));
  const summary = [category, amount ? `maximum ${amount} lei` : null, occasion ? `pentru ${occasion}` : null, ...recipientLabels.map((recipient) => `pentru ${recipient}`), mood ? `atmosferă ${mood}` : null, color ? `culoare ${color}` : null, material ? `material ${material}` : null, ready ? "livrare rapidă" : null].filter(Boolean) as string[];
  return { ids, reasons, filters: { category, maxPrice: amount, occasion, recipients: recipientLabels, mood, color, ready, material }, summary };
}

export const money = new Intl.NumberFormat("ro-RO", { style: "currency", currency: "RON", maximumFractionDigits: 0 });
