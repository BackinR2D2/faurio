type ConnectFailure = { status: number; code: string; message: string };

export function connectFailure(error: unknown): ConnectFailure | null {
  if (!error || typeof error !== "object" || !("type" in error) || typeof error.type !== "string" || !error.type.startsWith("Stripe")) return null;
  const message = "message" in error && typeof error.message === "string" ? error.message : "";
  if (/signed up for Connect|enable Connect/i.test(message)) return { status: 503, code: "CONNECT_ACTIVATION_REQUIRED", message: "Configurarea încasărilor trebuie activată de administratorul platformei. Încearcă din nou după activare." };
  if (error.type === "StripeAuthenticationError" || error.type === "StripePermissionError") return { status: 503, code: "PAYMENT_SETUP_REQUIRED", message: "Configurarea încasărilor necesită intervenția administratorului platformei." };
  if (error.type === "StripeRateLimitError") return { status: 429, code: "PAYMENT_RATE_LIMIT", message: "Prea multe cereri. Așteaptă puțin și încearcă din nou." };
  if (error.type === "StripeInvalidRequestError") return { status: 409, code: "ONBOARDING_UNAVAILABLE", message: "Contul de încasări nu poate fi configurat momentan. Contactează-ne pentru verificarea configurării." };
  return { status: 503, code: "PAYMENT_UNAVAILABLE", message: "Serviciul de încasări nu este disponibil momentan. Încearcă din nou." };
}
