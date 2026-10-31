import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { readEmailConfig } from "./config";
import { sendResendEmail } from "./resend";
import { sendSmtpEmail } from "./smtp";
import { deliverNextOrderEmail } from "./worker";
import type { EmailJob, EmailMessage, EmailQueue } from "./contracts";

function queueFor(db: SupabaseClient): EmailQueue {
  return {
    async claim(code) {
      const { data, error } = await db.rpc("claim_order_email", { p_order_code: code || null });
      if (error) throw new Error(`EMAIL_QUEUE_${error.code || "UNAVAILABLE"}`);
      return (data?.[0] || null) as EmailJob | null;
    },
    async prepare(job, message) {
      const { data, error } = await db.rpc("prepare_order_email", { p_id: job.id, p_token: job.lock_token, p_message: message });
      if (error || !data) throw new Error("EMAIL_QUEUE_PREPARE_FAILED");
      return data as EmailMessage;
    },
    async finish(job, status, providerId, errorCode) {
      const { error } = await db.rpc("finish_order_email", { p_id: job.id, p_token: job.lock_token,
        p_status: status, p_provider_id: providerId || null, p_error: errorCode || null });
      if (error) throw new Error("EMAIL_QUEUE_ACK_FAILED");
    },
  };
}

export async function dispatchOrderEmails(code?: string, limit = 5) {
  const config = readEmailConfig();
  const db = getSupabaseAdmin();
  if (!config || !db) return { configured: false, processed: 0, results: [] as string[] };
  const queue = queueFor(db);
  const results: string[] = [];
  for (let index = 0; index < Math.max(1, Math.min(5, limit)); index++) {
    const result = await deliverNextOrderEmail(queue, config, (message, id) => config.provider === "smtp" ? sendSmtpEmail(message, id, config) : sendResendEmail(message, id, config.apiKey), code);
    if (result === "idle") break;
    results.push(result);
  }
  return { configured: true, processed: results.length, results };
}

export async function notifyPaidOrder(code: string) {
  try {
    const result = await dispatchOrderEmails(code, 1);
    if (!result.configured) console.warn("ORDER_EMAIL_NOT_CONFIGURED");
    else if (result.results.some((status) => status !== "sent")) console.warn("ORDER_EMAIL_REQUIRES_RETRY_OR_REVIEW");
  } catch { console.error("ORDER_EMAIL_DISPATCH_DEFERRED_CHECK_OUTBOX_MIGRATION"); }
}
