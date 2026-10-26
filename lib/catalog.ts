export type Product = {
  id: string;
  name: string;
  maker: string;
  category: "Ceramică" | "Textile" | "Lumânări" | "Bijuterii";
  price: number;
  oldPrice?: number;
  material: string;
  color: string;
  occasion: string[];
  image: string;
  imagePosition?: string;
  stock: number;
  rating: number;
  reviews: number;
  days: number;
  badge?: string;
  description: string;
  details: string[];
};

export const products: Product[] = [
  {
    id: "cana-luna",
    name: "Cană Luna",
    maker: "Atelier Lut Bun",
    category: "Ceramică",
    price: 129,
    material: "ceramică",
    color: "crem",
    occasion: ["casă nouă", "aniversare", "cadou"],
    image: "/products/ceramica-luna.jpg",
    stock: 7,
    rating: 4.9,
    reviews: 34,
    days: 2,
    badge: "Favorit",
    description: "Modelată și glazurată manual, cu o semilună pictată liber. Fiecare cană are mici variații care o fac unică.",
    details: ["aprox. 330 ml", "glazură alimentară", "compatibilă cu mașina de spălat"],
  },
  {
    id: "vaza-pamant",
    name: "Vază Pământ",
    maker: "Atelier Lut Bun",
    category: "Ceramică",
    price: 189,
    material: "gresie ceramică",
    color: "natur",
    occasion: ["casă nouă", "nuntă"],
    image: "/products/ceramica-luna.jpg",
    imagePosition: "20% center",
    stock: 3,
    rating: 4.8,
    reviews: 18,
    days: 4,
    badge: "Serie mică",
    description: "O vază sculpturală arsă la temperatură înaltă, inspirată de formele rotunjite ale pietrelor de râu.",
    details: ["18 cm înălțime", "impermeabilă", "serie numerotată"],
  },
  {
    id: "broderie-ierbar",
    name: "Ierbar de câmp",
    maker: "Mâini de In",
    category: "Textile",
    price: 149,
    oldPrice: 179,
    material: "in",
    color: "ocru",
    occasion: ["casă nouă", "aniversare", "cadou"],
    image: "/products/broderie-camp.jpg",
    stock: 5,
    rating: 5,
    reviews: 27,
    days: 2,
    badge: "-17%",
    description: "Flori de câmp brodate fir cu fir pe pânză de in, montate într-un gherghef din lemn natur.",
    details: ["diametru 21 cm", "in prespălat", "gata de agățat"],
  },
  {
    id: "broderie-roz",
    name: "Grădină la apus",
    maker: "Mâini de In",
    category: "Textile",
    price: 159,
    material: "in și bumbac",
    color: "roz pudrat",
    occasion: ["aniversare", "nuntă", "cadou"],
    image: "/products/broderie-camp.jpg",
    imagePosition: "75% center",
    stock: 4,
    rating: 4.9,
    reviews: 21,
    days: 3,
    badge: "Nou",
    description: "O compoziție botanică brodată manual în tonuri de apus, pentru interioare calme și personale.",
    details: ["diametru 18 cm", "fir de bumbac", "piesă unicat"],
  },
  {
    id: "lumanare-chihlimbar",
    name: "Lumânare Chihlimbar",
    maker: "Foc Domol",
    category: "Lumânări",
    price: 79,
    material: "ceară de soia",
    color: "chihlimbar",
    occasion: ["mulțumire", "casă nouă", "cadou"],
    image: "/products/lumanare-terrazzo.jpg",
    imagePosition: "25% center",
    stock: 12,
    rating: 4.8,
    reviews: 46,
    days: 1,
    badge: "Livrare rapidă",
    description: "Ceară vegetală turnată manual în sticlă reciclată, cu parfum discret de smochină și lemn de cedru.",
    details: ["180 g", "aprox. 38 ore", "fitil din bumbac"],
  },
  {
    id: "tava-terrazzo",
    name: "Tăviță Terrazzo",
    maker: "Forme Mici",
    category: "Bijuterii",
    price: 89,
    material: "compozit mineral",
    color: "teracotă",
    occasion: ["mulțumire", "aniversare", "cadou"],
    image: "/products/lumanare-terrazzo.jpg",
    imagePosition: "80% center",
    stock: 8,
    rating: 4.7,
    reviews: 15,
    days: 2,
    description: "Turnată și șlefuită manual, cu inserții minerale și accente metalice. Perfectă pentru obiectele mici de zi cu zi.",
    details: ["12 cm diametru", "sigilată mat", "bază protejată cu plută"],
  },
];

export const categories = ["Toate", "Ceramică", "Textile", "Lumânări", "Bijuterii"] as const;

export function interpretNaturalQuery(query: string) {
  const q = query.toLocaleLowerCase("ro-RO");
  const categoriesFound = categories.filter(
    (category) => category !== "Toate" && q.includes(category.toLocaleLowerCase("ro-RO").replace("ă", "a")),
  );
  const normalized = q.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const maxMatch = normalized.match(/(?:sub|maxim|pana la|buget(?: de)?)[^0-9]{0,12}(\d{2,4})/);
  const amount = maxMatch ? Number(maxMatch[1]) : undefined;
  const categoryKeywords: Record<string, Product["category"]> = {
    cana: "Ceramică", vaza: "Ceramică", ceramica: "Ceramică", lut: "Ceramică",
    broderie: "Textile", textil: "Textile", in: "Textile",
    lumanare: "Lumânări", parfum: "Lumânări", ceara: "Lumânări",
    bijuterie: "Bijuterii", tavita: "Bijuterii",
  };
  const category = categoriesFound[0] || Object.entries(categoryKeywords).find(([word]) => normalized.includes(word))?.[1];
  const occasion = ["nunta", "aniversare", "casa noua", "multumire", "cadou"].find((word) => normalized.includes(word));
  const occasionLabel: Record<string, string> = {
    nunta: "nuntă",
    aniversare: "aniversare",
    "casa noua": "casă nouă",
    multumire: "mulțumire",
    cadou: "cadou",
  };
  const ready = /rapid|maine|urgent|2 zile|doua zile/.test(normalized);
  const material = ["ceramica", "in", "bumbac", "soia", "mineral"].find((word) => normalized.includes(word));

  const scored = products.map((product) => {
    let score = 0;
    if (category && product.category === category) score += 6;
    if (amount && product.price <= amount) score += 4;
    if (ready && product.days <= 2) score += 3;
    if (occasion && product.occasion.some((item) => item.normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(occasion))) score += 4;
    if (material && product.material.normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(material)) score += 3;
    for (const token of normalized.split(/\W+/).filter((token) => token.length > 3)) {
      const haystack = `${product.name} ${product.maker} ${product.category} ${product.material} ${product.color} ${product.description}`
        .toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (haystack.includes(token)) score += 1;
    }
    return { product, score };
  });

  const hasSignals = Boolean(category || amount || occasion || ready || material || normalized.trim().length > 3);
  const ids = scored
    .filter(({ score }) => !hasSignals || score > 0)
    .sort((a, b) => b.score - a.score || b.product.rating - a.product.rating)
    .map(({ product }) => product.id);

  return {
    ids: ids.length ? ids : products.map((product) => product.id),
    filters: { category, maxPrice: amount, occasion, ready, material },
    summary: [
      category,
      amount ? `buget de maximum ${amount} lei` : null,
      occasion ? `pentru ${occasionLabel[occasion] || occasion}` : null,
      ready ? "livrare în cel mult 2 zile" : null,
      material ? `material: ${material}` : null,
    ].filter(Boolean),
  };
}
