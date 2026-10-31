import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());
const secret = process.env.CRON_SECRET;
if (!secret || secret.length < 32) throw new Error("Configure CRON_SECRET with at least 32 characters.");
const url = new URL("/api/internal/order-emails", process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
const result = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${secret}` }, signal: AbortSignal.timeout(60000) });
console.log(JSON.stringify({ status: result.status, result: await result.json() }, null, 2));
if (!result.ok) process.exitCode = 1;
