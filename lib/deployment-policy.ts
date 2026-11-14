type Environment = Readonly<Record<string, string | undefined>>;
export const DEMO_PROJECT_REF = "vqpoickuafclirdvrjed";
export type Deployment = "demo" | "staging" | "commercial";

function hostedProjectRef(value?: string) {
  try {
    const url = new URL(value || "");
    if (url.protocol !== "https:" || url.username || url.password || url.port || url.search || url.hash || url.pathname !== "/") return null;
    return /^([a-z0-9]{20})\.supabase\.co$/.exec(url.hostname)?.[1] || null;
  } catch { return null; }
}

function isPrivateKey(value?: string) {
  if (!value) return false;
  if (value.startsWith("sb_secret_")) return true;
  try { return JSON.parse(Buffer.from(value.split(".")[1], "base64url").toString("utf8")).role === "service_role"; }
  catch { return false; }
}

export function readDeploymentPolicy(environment: Environment) {
  const deployment = environment.FAURIO_DEPLOYMENT ?? "demo";
  const errors: string[] = [];
  if (!["demo", "staging", "commercial"].includes(deployment)) errors.push("INVALID_DEPLOYMENT");
  if ((environment.NEXT_PUBLIC_FAURIO_DEPLOYMENT ?? "demo") !== deployment) errors.push("PUBLIC_SERVER_DEPLOYMENT_MISMATCH");
  if (isPrivateKey(environment.NEXT_PUBLIC_SUPABASE_ANON_KEY) || (environment.SUPABASE_SERVICE_ROLE_KEY && environment.SUPABASE_SERVICE_ROLE_KEY === environment.NEXT_PUBLIC_SUPABASE_ANON_KEY)) errors.push("PRIVATE_KEY_IN_PUBLIC_CONFIGURATION");
  if (deployment === "staging" || deployment === "commercial") {
    const expected = environment.FAURIO_SUPABASE_PROJECT_REF;
    if (!expected || !/^[a-z0-9]{20}$/.test(expected)) errors.push("PROJECT_BINDING_REQUIRED");
    if (expected === DEMO_PROJECT_REF) errors.push("DEMO_DATABASE_FORBIDDEN");
    if (hostedProjectRef(environment.SUPABASE_URL) !== expected || hostedProjectRef(environment.NEXT_PUBLIC_SUPABASE_URL) !== expected) errors.push("DATABASE_PROJECT_MISMATCH");
    if (!environment.SUPABASE_SERVICE_ROLE_KEY || !environment.NEXT_PUBLIC_SUPABASE_ANON_KEY) errors.push("DATABASE_KEYS_REQUIRED");
    try {
      const site = new URL(environment.NEXT_PUBLIC_SITE_URL || "");
      if (site.protocol !== "https:" || site.username || site.password || site.port || site.pathname !== "/" || site.search || site.hash || ["localhost", "127.0.0.1", "[::1]"].includes(site.hostname)) throw new Error();
    } catch { errors.push("PUBLIC_HTTPS_SITE_REQUIRED"); }
  }
  if (deployment === "commercial" && environment.FAURIO_PAYMENT_MODE !== "disabled") errors.push("COMMERCIAL_PAYMENTS_MUST_BE_DISABLED");
  return { deployment: deployment as Deployment, valid: errors.length === 0, errors };
}
