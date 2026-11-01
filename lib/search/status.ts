export function searchFailureReason(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (/^AI_(?:SEARCH_(?:MIGRATION_REQUIRED|DATABASE_UNAVAILABLE|BUDGET_EXHAUSTED)|PROVIDER_\d{3}|UNKNOWN_TAXONOMY|INVALID_RESPONSE)$/.test(message)) return message;
  if (error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name)) return "AI_TIMEOUT";
  return "AI_RESPONSE_INVALID";
}

export function searchFailureNotice(reason: string): string {
  if (reason === "AI_SEARCH_MIGRATION_REQUIRED" || reason === "AI_CONFIGURATION_REQUIRED") return "Căutarea necesită finalizarea configurării. Te rugăm să revii mai târziu.";
  if (reason === "AI_SEARCH_BUDGET_EXHAUSTED" || reason === "AI_PROVIDER_429") return "Limita temporară a căutării a fost atinsă. Încearcă din nou mai târziu.";
  return "Nu am putut pregăti recomandările. Reîncearcă în câteva momente.";
}
