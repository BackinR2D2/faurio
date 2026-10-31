export function authErrorMessage(error: { code?: string; message?: string }) {
  if (error.message?.includes("Error sending confirmation email") || error.message?.includes("Error sending recovery email")) return "Emailul nu a putut fi trimis. Încearcă mai târziu sau contactează-ne.";
  if (error.code === "over_email_send_rate_limit" || error.code === "over_request_rate_limit") return "Prea multe solicitări. Așteaptă înainte să ceri un nou email.";
  if (error.code === "email_not_confirmed") return "Confirmă adresa de email înainte de autentificare.";
  return "Solicitarea nu a putut fi finalizată. Verifică datele și încearcă din nou.";
}
