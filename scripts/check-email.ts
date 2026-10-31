import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { readEmailConfig } from "../lib/email/config.ts";

nextEnv.loadEnvConfig(process.cwd());
const config = readEmailConfig();
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
let outboxMigrationApplied = false;
if (url && key) {
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await db.from("order_email_outbox").select("id,snapshot,message,status,attempts,first_attempt_at,lock_token,provider_id").limit(0);
  outboxMigrationApplied = !error;
}
console.log(JSON.stringify({ emailConfigValid: Boolean(config), resendKeyPresent: Boolean(process.env.RESEND_API_KEY),
  provider: config?.provider || "resend", smtpCredentialsPresent: Boolean(process.env.SMTP_USER && process.env.SMTP_PASS),
  senderPresent: Boolean(process.env.EMAIL_FROM), outboxMigrationApplied,
  retryEndpointSecretValid: (process.env.CRON_SECRET?.length || 0) >= 32,
  sendsEmail: false, verifiesDomainOrSupabaseSMTP: false }, null, 2));
if (!config || !outboxMigrationApplied) process.exitCode = 2;
