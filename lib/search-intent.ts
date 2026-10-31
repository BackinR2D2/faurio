const plain = (value: string) => value
  .toLocaleLowerCase("ro-RO")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9\s-]/g, " ")
  .replace(/\s+/g, " ")
  .trim();

const typeRules: Array<{ pattern: RegExp; types: string[]; category: string }> = [
  { pattern: /\b(set(?:uri)? de )?pahar(?:e|ul|ele)?\b/, types: ["Pahar", "Set de pahare"], category: "Sticlărie" },
  { pattern: /\bcan(?:a|i|ite|ă)\b/, types: ["Cană"], category: "Ceramică" },
  { pattern: /\b(?:ceasc(?:a|i|ute)?|cesti)\b/, types: ["Ceașcă"], category: "Ceramică" },
  { pattern: /\bvaz(?:a|e|ă)\b/, types: ["Vază"], category: "Ceramică" },
  { pattern: /\bbol(?:uri|ul)?\b/, types: ["Bol"], category: "Ceramică" },
  { pattern: /\bfarfuri(?:e|i|ile)\b/, types: ["Farfurie"], category: "Ceramică" },
  { pattern: /\bbroderi(?:e|i)\b/, types: ["Broderie"], category: "Textile" },
  { pattern: /\bpern(?:a|e|ă)\b/, types: ["Pernă"], category: "Textile" },
  { pattern: /\bpatur(?:a|i|ă)\b/, types: ["Pătură"], category: "Textile" },
  { pattern: /\bsuport(?:uri)? (?:de|pentru) lumanar(?:e|i)\b/, types: ["Suport de lumânare"], category: "Lumânări" },
  { pattern: /\bluman(?:are|ari|ări)\b/, types: ["Lumânare"], category: "Lumânări" },
  { pattern: /\bcolier(?:e|ul)?\b/, types: ["Colier"], category: "Bijuterii" },
  { pattern: /\bcerce(?:l|i|ii)\b/, types: ["Cercei"], category: "Bijuterii" },
  { pattern: /\bbratar(?:a|i|ă)\b/, types: ["Brățară"], category: "Bijuterii" },
  { pattern: /\bcuti(?:e|i)\b/, types: ["Cutie"], category: "Lemn" },
  { pattern: /\bram(?:a|e|ă)\b/, types: ["Ramă"], category: "Decorațiuni" },
  { pattern: /\btav(?:a|i|ă)\b/, types: ["Tavă"], category: "Lemn" },
  { pattern: /\bjurnal(?:e|ul)?\b/, types: ["Jurnal"], category: "Papetărie" },
  { pattern: /\bsemn(?:e)? de carte\b/, types: ["Semn de carte"], category: "Papetărie" },
  { pattern: /\bdecoratiun(?:e|i)\b/, types: ["Decorațiune"], category: "Decorațiuni" },
];

const stopWords = new Set(["caut", "cauta", "cautam", "cautare", "vreau", "as", "dori", "doresc", "am", "avea", "un", "o", "niste", "pentru", "de", "din", "cu", "si", "sau", "care", "sa", "fie", "este", "ceva", "produs", "produse", "obiect", "obiecte", "articol", "articole", "handmade", "facut", "facuta", "lucrat", "lucrate", "manual", "imi", "mi", "plac", "place", "ma", "ar", "interesa", "te", "rog", "imi", "doar", "dar", "insa", "nu", "fara", "exclude", "prefer", "preferabil", "buget", "bugetul", "maxim", "maximum", "lei", "leu", "ron", "pana", "la", "in", "sub", "intre", "cel", "mult", "mai", "putin", "max", "min", "meu", "mea", "iubeste", "ii", "ei", "lui", "are", "vrea", "the", "a", "an", "i", "want", "looking", "for", "with", "and", "under", "below", "up", "to", "between", "budget", "please", "show", "me"]);

const upperBudget = /\b(?:sub|maxim(?:um)?|max|pana (?:la|in)|buget(?:ul)?(?: de)?|nu mai mult de|under|below|up to)\s*(?:este|e|de|:)?\s*(\d{1,6})(?:\s*(?:de\s+)?(?:lei|ron))?\b/;
const upperBudgetSuffix = /\b(\d{1,6})\s*(?:de\s+)?(?:lei|ron)?\s*(?:maxim(?:um)?|max|cel mult)\b/;
const priceRange = /\b(?:intre|between)\s+(\d{1,6})\s*(?:si|and|-)\s*(\d{1,6})(?:\s*(?:de\s+)?(?:lei|ron))?\b/;
const readyPattern = /\b(rapid|repede|urgent|1 zi|2 zile|doua zile|gata de trimis)\b/;
const personalizedPattern = /\b(personalizabil[a-z]*|personalizat[a-z]*|personalized|customized)\b/;
const deadlinePattern = /\b(pana (?:in )?(?:vineri|luni|marti|miercuri|joi|sambata|duminica)|maine|poimaine)\b/;

function removeMatches(value: string, pattern: RegExp) {
  return value.replace(new RegExp(pattern.source, "g"), " ");
}

export type SearchIntent = {
  productTypes: string[];
  strict: boolean;
  freeText: string;
  summary: string[];
  notice?: string;
  unsupported?: boolean;
  filters: {
    category?: string;
    maxPrice?: number;
    minPrice?: number;
    occasion?: string;
    recipients: string[];
    mood?: string;
    color?: string;
    colors: string[];
    material?: string;
    materials: string[];
    excludedMaterials: string[];
    personalizable: boolean;
    inStock: boolean;
    ready: boolean;
  };
};

export function interpretNaturalQuery(query: string): SearchIntent {
  const normalized = plain(query).slice(0, 1200);
  const typeMatch = typeRules.find((rule) => rule.pattern.test(normalized));
  const budgetMatch = normalized.match(upperBudget);
  const suffixBudgetMatch = normalized.match(upperBudgetSuffix);
  const rangeMatch = normalized.match(priceRange);
  const foreignCurrency = /\b(eur|euro|usd|dollars?|gbp)\b/.test(normalized);
  const ceilings = [rangeMatch?.[2], budgetMatch?.[1], suffixBudgetMatch?.[1]].filter((value): value is string => value !== undefined).map(Number);
  const maxPrice = foreignCurrency || !ceilings.length ? undefined : Math.min(...ceilings);
  const minPrice = foreignCurrency ? undefined : rangeMatch ? Number(rangeMatch[1]) : undefined;
  const occasionMap: Record<string, string> = { nunta: "nuntă", aniversare: "aniversare", "casa noua": "casă nouă", multumire: "mulțumire", craciun: "Crăciun", cadou: "cadou" };
  const occasionKey = Object.keys(occasionMap).find((word) => normalized.includes(word));
  const occasion = occasionKey ? occasionMap[occasionKey] : undefined;
  const recipientMap: Record<string, string> = { prietena: "prietenă", prieten: "prieten", mama: "mamă", tata: "tată", colega: "colegă", coleg: "coleg", sora: "soră", frate: "frate", cuplu: "cuplu", gazda: "gazdă", plante: "iubitor de plante", cafea: "iubitor de cafea", ceai: "iubitor de ceai", profesoara: "profesoară" };
  const recipients = Object.entries(recipientMap).filter(([word]) => new RegExp(`\\b${word}\\b`).test(normalized)).map(([, label]) => label);
  const moodRules = ["cald", "minimalist", "natural", "elegant", "botanic", "delicat", "romantic", "colorat", "modern", "practic", "relaxant", "cozy", "boem", "poetic", "rustic"].map((word) => ({ word, pattern: new RegExp(`\\b${word}(?:a|e|i)?\\b`) }));
  const moodRule = moodRules.find(({ pattern }) => pattern.test(normalized));
  const mood = moodRule?.word;
  const colorRules: Array<[RegExp, string]> = [[/\b(?:maro|maroniu|maronie|maronii|brown)\b/, "maro"], [/\bgr[ie]\b/, "gri"], [/\bgalben(?:a|e|i)?\b/, "galben"], [/\b(?:mov|violet[a-z]*)\b/, "mov"], [/\bbej\b/, "bej"], [/\bcrem\b/, "crem"], [/\balbastr(?:u|a|e|i)\b/, "albastru"], [/\bnisipi(?:u|e)\b/, "nisipiu"], [/\bocru\b/, "ocru"], [/\bver(?:de|zi)\b/, "verde"], [/\broz\b/, "roz"], [/\bchihlimbar\b/, "chihlimbar"], [/\bteracot(?:a|ă)\b/, "teracotă"], [/\bros(?:u|ie|ii)\b/, "roșu"], [/\bnegr(?:u|a|e|i)\b/, "negru"], [/\balb(?:a|e|i)?\b/, "alb"], [/\bauri(?:u|e|i)\b/, "auriu"], [/\barginti(?:u|e|i)\b/, "argintiu"]];
  const colors = colorRules.filter(([pattern]) => pattern.test(normalized)).map(([, label]) => label);
  const color = colors[0];
  const materialRules: Array<[RegExp, string]> = [[/\bceramica\b/, "ceramică"], [/\bgresie\b/, "gresie"], [/\bsticla\b/, "sticlă"], [/\b(?:din|doar|material|si|sau) (in)\b/, "in"], [/\bbumbac\b/, "bumbac"], [/\bsoia\b/, "soia"], [/\bceara\b/, "ceară"], [/\balama\b/, "alamă"], [/\bargint\b/, "argint"], [/\blemn\b/, "lemn"], [/\bhartie\b/, "hârtie"], [/\bpiele\b/, "piele"]];
  const included: string[] = [];
  const excludedMaterials: string[] = [];
  for (const [pattern, label] of materialRules) {
    const match = normalized.match(pattern);
    if (!match) continue;
    const prefix = normalized.slice(0, match.index);
    const negation = prefix.match(/(?:nu vreau|fara|exclude|nu din)\s+([^;]*)$/);
    const excluded = negation && !/\b(doar|dar|insa)\b/.test(negation[1]);
    (excluded ? excludedMaterials : included).push(label);
  }
  const material = included[0];
  const ready = readyPattern.test(normalized);
  const personalizable = personalizedPattern.test(normalized);
  const inStock = /\bin stoc\b/.test(normalized) || ready;
  const dateRequested = deadlinePattern.test(normalized);
  const followupWithoutContext = /\b(acelasi lucru|mai ieftin|same thing|cheaper)\b/.test(normalized) && !typeMatch;
  const contextSignals = maxPrice !== undefined || minPrice !== undefined || Boolean(occasion || recipients.length || mood || color || material || excludedMaterials.length || ready || personalizable || inStock);
  let remaining = normalized;
  const consumedPatterns = [upperBudget, upperBudgetSuffix, priceRange, readyPattern, personalizedPattern, deadlinePattern, /\bin stoc\b/];
  if (typeMatch) consumedPatterns.push(typeMatch.pattern);
  if (occasionKey) consumedPatterns.push(new RegExp(`\\b${occasionKey}\\b`));
  if (moodRule) consumedPatterns.push(moodRule.pattern);
  for (const [word] of Object.entries(recipientMap)) consumedPatterns.push(new RegExp(`\\b${word}\\b`));
  for (const [pattern] of colorRules) if (pattern.test(normalized)) consumedPatterns.push(pattern);
  for (const [pattern] of materialRules) if (pattern.test(normalized)) consumedPatterns.push(pattern);
  for (const pattern of consumedPatterns) remaining = removeMatches(remaining, pattern);
  const meaningful = Array.from(new Set(remaining.split(/\s+/).filter((word) => word.length > 1 && !stopWords.has(word) && !/^\d+$/.test(word))));
  const freeText = meaningful.join(" ");
  const strict = Boolean(typeMatch || freeText || contextSignals);
  const emptyRequest = !strict;
  const notice = foreignCurrency ? "Catalogul folosește RON. Reformulează bugetul în lei; nu convertim automat valute." : followupWithoutContext || emptyRequest ? "Spune ce produs cauți sau ce caracteristici trebuie să aibă." : dateRequested ? "Putem filtra timpul de pregătire, dar data sosirii trebuie confirmată cu atelierul și curierul." : undefined;
  const summary = [
    typeMatch?.types.join(" / "),
    freeText ? `termeni: ${freeText}` : null,
    minPrice !== undefined ? `de la ${minPrice} lei` : null,
    maxPrice !== undefined ? `maximum ${maxPrice} lei` : null,
    occasion ? `pentru ${occasion}` : null,
    ...recipients.map((recipient) => `pentru ${recipient}`),
    mood ? `stil ${mood}` : null,
    ...colors.map((item) => `culoare ${item}`),
    ...included.map((item) => `material ${item}`),
    ...excludedMaterials.map((item) => `fără ${item}`),
    personalizable ? "personalizabil" : null,
    inStock ? "în stoc" : null,
    ready ? "pregătire în maximum 2 zile" : null,
  ].filter(Boolean) as string[];

  return {
    productTypes: typeMatch?.types || [],
    strict,
    freeText,
    summary,
    notice, unsupported: foreignCurrency || followupWithoutContext || emptyRequest,
    filters: { category: typeMatch?.category, minPrice, maxPrice, occasion, recipients, mood, color, colors, material, materials: included, excludedMaterials, ready, personalizable, inStock },
  };
}
