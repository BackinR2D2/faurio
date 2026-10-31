export function searchFailureReason(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (/^AI_(?:SEARCH_(?:MIGRATION_REQUIRED|DATABASE_UNAVAILABLE|BUDGET_EXHAUSTED)|PROVIDER_\d{3}|UNKNOWN_TAXONOMY|INVALID_RESPONSE)$/.test(message)) return message;
  if (error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name)) return "AI_TIMEOUT";
  return "AI_RESPONSE_INVALID";
}

export function searchFailureNotice(reason: string): string {
  if (reason === "AI_SEARCH_MIGRATION_REQUIRED") return "Căutarea AI necesită finalizarea configurării. Folosim temporar filtre exacte.";
  return "AI nu este disponibil acum. Căutarea folosește filtrele exacte, fără recomandări inventate.";
}
