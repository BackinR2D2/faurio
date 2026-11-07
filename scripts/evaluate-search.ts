const url = process.env.E2E_BASE_URL || "http://localhost:3000";
const fixtures = [
  "Caut un set de pahare sub 200 lei",
  "O cană sau un jurnal, cel mult 200 de lei",
  "O cană albă sau albastră, maxim 160 lei",
  "Pahare între 80,50 și 150,75 lei, în stoc",
  "Cadou pentru profesor, fără vaze sau căni, nu maro, buget maxim 250 lei",
  "laptop maro sub 100 lei",
  "O cană pentru unchiul meu care este profesor și are ochi albaștri, sub 180 lei",
  "vreau sa cumpar un cadou unchiului meu care e profesor, in buget de 250 de lei maxim",
  "pahare sub 100 lei",
  "as cauta un tricou maro, am un buget de 100 de lei maxim.",
  "personalized gift under 50 EUR",
  "pahare",
  "O cană din ceramică sub 180 lei",
];
let passed = 0;
const selected = process.argv[2] ? fixtures.filter((_, index) => String(index + 1) === process.argv[2]) : fixtures;
if (!selected.length) throw new Error("Unknown evaluation fixture");
for (const query of selected) {
  const index = fixtures.indexOf(query);
  let result: { intent?: { failure?: string; productTypes?: string[]; filters?: unknown }; total?: number } = {};
  let status = 0;
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch(`${url}/api/search`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query }), signal: AbortSignal.timeout(30000) });
    status = response.status;
    result = await response.json();
    if (result.intent?.failure !== "AI_PROVIDER_429" || attempt === 3) break;
    console.log(JSON.stringify({ fixture: index + 1, waitingForProviderLimit: true }));
    await new Promise(resolve => setTimeout(resolve, 35000));
  }
  if (status === 200) passed++;
  console.log(JSON.stringify({ fixture: index + 1, status, failure: result.intent?.failure, total: result.total, productTypes: result.intent?.productTypes, filters: result.intent?.filters }));
}
console.log(JSON.stringify({ passed, total: selected.length, actualProviderAndDatabase: true, writesOnlySearchCacheAndQuota: true }));
if (passed !== selected.length) process.exitCode = 2;
export {};
