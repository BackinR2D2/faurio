import { interpretNaturalQuery } from "./search-intent.ts";

export function classifyProductType(name: string, submitted: string): string | null {
  const generic = !submitted.trim() || /^(?:produs|produse|product|other|altele)$/i.test(submitted.trim());
  const types = interpretNaturalQuery(generic ? name : submitted).productTypes;
  if (types.length === 1) return types[0];
  return generic ? null : submitted.trim();
}
