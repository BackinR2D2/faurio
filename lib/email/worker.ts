import { buildOrderEmail } from "./order-template.ts";
import { EmailSendError, type EmailMessage, type EmailQueue } from "./contracts.ts";
import type { EmailConfig } from "./config.ts";

export async function deliverNextOrderEmail(queue: EmailQueue, config: EmailConfig, send: (message: EmailMessage, id: string) => Promise<string>, code?: string) {
  const job = await queue.claim(code);
  if (!job) return "idle";
  if (Date.now() - new Date(job.first_attempt_at).getTime() >= 23 * 60 * 60 * 1000) {
    await queue.finish(job, "uncertain", undefined, "IDEMPOTENCY_WINDOW_EXPIRED");
    return "uncertain";
  }
  let candidate: EmailMessage;
  try { candidate = job.message || { ...buildOrderEmail(job.snapshot, config), delivery_provider: config.provider || "resend" }; }
  catch { await queue.finish(job, "blocked", undefined, "EMAIL_INVALID_ORDER_PAYLOAD"); return "blocked"; }
  let message: EmailMessage;
  try { message = await queue.prepare(job, candidate); }
  catch { await queue.finish(job, "failed", undefined, "EMAIL_PREPARATION_FAILED"); return "failed"; }
  if ((message.delivery_provider || "resend") !== (config.provider || "resend")) {
    await queue.finish(job, "blocked", undefined, "EMAIL_TRANSPORT_CHANGED");
    return "blocked";
  }
  let providerId: string;
  try { providerId = await send(message, job.id); }
  catch (error) {
    const failure = error instanceof EmailSendError ? error : new EmailSendError("EMAIL_UNKNOWN_ERROR", true);
    const status = config.provider === "smtp" && failure.retryable ? "uncertain" : failure.retryable ? "failed" : "blocked";
    await queue.finish(job, status, undefined, failure.code);
    return status;
  }
  await queue.finish(job, "sent", providerId);
  return "sent";
}
