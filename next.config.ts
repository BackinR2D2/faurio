import type { NextConfig } from "next";
import { readDeploymentPolicy } from "./lib/deployment-policy.ts";

const deployment = readDeploymentPolicy(process.env);
if (!deployment.valid) throw new Error(`FAURIO_DEPLOYMENT_CONFIGURATION: ${deployment.errors.join(", ")}`);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  agentRules: false,
  distDir: process.env.NEXT_BUILD_DIR === ".next-build" ? ".next-build" : ".next",
  turbopack: { root: process.cwd() },
  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
    ] }];
  },
};

export default nextConfig;
