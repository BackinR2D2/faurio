export type ReviewAuthor = { name: string; initials: string };

export function reviewAuthor(metadata?: Record<string, unknown> | null): ReviewAuthor {
  const candidate = metadata?.full_name || metadata?.display_name || metadata?.name;
  const cleaned = typeof candidate === "string" ? candidate.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80) : "";
  const name = cleaned && !cleaned.includes("@") ? cleaned : "Client Faurio";
  const parts = name.split(/[\s-]+/).filter(Boolean);
  const initials = [parts[0], ...(parts.length > 1 ? [parts[parts.length - 1]] : [])].map(part => Array.from(part)[0]).join("").toLocaleUpperCase("ro-RO");
  return { name, initials };
}

export function createReviewAuthorLookup(load: (id: string) => Promise<ReviewAuthor>, now = Date.now) {
  const cache = new Map<string, { expires: number; value: Promise<ReviewAuthor> }>();
  return (id: string): Promise<ReviewAuthor> => {
    const cached = cache.get(id);
    if (cached && cached.expires > now()) return cached.value;
    if (cache.size >= 200) cache.delete(cache.keys().next().value!);
    const entry = { expires: now() + 60000, value: Promise.resolve().then(() => load(id)).catch(() => {
      if (cache.get(id) === entry) cache.delete(id);
      return reviewAuthor();
    }) };
    cache.set(id, entry);
    return entry.value;
  };
}
