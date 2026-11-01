import { defineConfig, devices } from "@playwright/test";
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());
const baseURL = process.env.E2E_BASE_URL || "http://localhost:3000";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  expect: { timeout: 15000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: { baseURL, trace: "retain-on-failure", screenshot: "only-on-failure", launchOptions: process.env.CI ? { args: ["--enable-unsafe-swiftshader"] } : undefined },
  projects: [
    { name: "desktop-chrome", use: { ...devices["Desktop Chrome"], channel: "chrome", viewport: { width: 1440, height: 1000 } } },
    { name: "mobile-chrome", use: { ...devices["Desktop Chrome"], channel: "chrome", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: "reduce" } },
  ],
  webServer: { command: `npm run dev -- --port ${new URL(baseURL).port || "3000"}`, url: `${baseURL}/api/health`, reuseExistingServer: !process.env.CI, timeout: 120000 },
});
