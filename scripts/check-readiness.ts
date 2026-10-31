import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { readEmailConfig } from "../lib/email/config.ts";

nextEnv.loadEnvConfig(process.cwd());
const url=process.env.SUPABASE_URL; const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
const db=url&&key?createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}):null;
const probes = [
  ["marketplace","public_shops","id"], ["orderEmailQueue","order_email_outbox","id"],
  ["aiSearch","search_intent_cache","cache_key"], ["sellerPayments","shop_payment_accounts","shop_id"],
  ["sellerFinance","marketplace_order_finance","order_code"], ["sellerUploads","shop_media_assets","id"],
  ["checkoutRetryIdentity","checkout_attempts","id"],
  ["verifiedReviews","product_reviews","id"], ["buyerReturns","return_requests","id"], ["publicFormProtection","public_form_usage","kind"],
] as const;
const database:Record<string,boolean>={};
for(const [name,table,column] of probes) database[name]=db?!(await db.from(table).select(column).limit(0)).error:false;
const email=readEmailConfig();
const result={database,aiKeyPresent:Boolean(process.env.GROQ_API_KEY),emailConfigValid:Boolean(email),emailProvider:email?.provider||process.env.EMAIL_PROVIDER||"resend",
  stripeTestKeyPresent:Boolean(process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_")),stripeWebhookSecretPresent:Boolean(process.env.STRIPE_WEBHOOK_SECRET),
  connectEnabled:process.env.STRIPE_CONNECT_ENABLED==="true",connectWebhookSecretPresent:Boolean(process.env.STRIPE_CONNECT_WEBHOOK_SECRET),
  retriesConfigured:(process.env.CRON_SECRET?.length||0)>=32,siteUrlIsHttps:process.env.NEXT_PUBLIC_SITE_URL?.startsWith("https://")||false,
  readOnly:true,verifiesInboxOrStripeOnboarding:false};
console.log(JSON.stringify(result,null,2));
if(Object.values(database).some((value)=>!value)||!result.aiKeyPresent||!result.emailConfigValid||!result.stripeWebhookSecretPresent||!result.connectEnabled||!result.connectWebhookSecretPresent||!result.retriesConfigured) process.exitCode=2;
