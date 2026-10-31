import { EmailSendError, type EmailMessage } from "./contracts.ts";

export async function sendResendEmail(message: EmailMessage, id: string, apiKey: string, fetcher: typeof fetch = fetch) {
  const payload = { ...message };
  delete payload.delivery_provider;
  let response: Response;
  try {
    response = await fetcher("https://api.resend.com/emails", { method: "POST", headers: {
      Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": `order-confirmation/${id}`,
    }, body: JSON.stringify(payload), signal: AbortSignal.timeout(8000) });
  } catch { throw new EmailSendError("RESEND_NETWORK_ERROR", true); }
  if (!response.ok) throw new EmailSendError(`RESEND_HTTP_${response.status}`, response.status === 429 || response.status === 409 || response.status >= 500);
  const data = await response.json().catch(() => null) as { id?: unknown } | null;
  if (!data || typeof data.id !== "string" || !data.id || data.id.length > 200) throw new EmailSendError("RESEND_INVALID_RECEIPT", true);
  return data.id;
}
