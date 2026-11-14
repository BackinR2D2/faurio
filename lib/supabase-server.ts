import "server-only";
import { createClient } from "@supabase/supabase-js";
import { readDeploymentPolicy } from "@/lib/deployment-policy";

export function getSupabaseAdmin() {
  if (!readDeploymentPolicy(process.env).valid) return null;
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
