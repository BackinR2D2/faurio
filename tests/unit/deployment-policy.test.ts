import { test } from "node:test";
import assert from "node:assert/strict";
import { DEMO_PROJECT_REF, readDeploymentPolicy } from "../../lib/deployment-policy.ts";

const project = "abcdefghijklmnopqrst";
const staging = { FAURIO_DEPLOYMENT: "staging", NEXT_PUBLIC_FAURIO_DEPLOYMENT: "staging", FAURIO_SUPABASE_PROJECT_REF: project, SUPABASE_URL: `https://${project}.supabase.co`, NEXT_PUBLIC_SUPABASE_URL: `https://${project}.supabase.co`, SUPABASE_SERVICE_ROLE_KEY: "fixture-private", NEXT_PUBLIC_SUPABASE_ANON_KEY: "fixture-public", NEXT_PUBLIC_SITE_URL: "https://fixture-staging.netlify.app" };

test("existing demo and fixture CI environments remain compatible", () => {
  assert.equal(readDeploymentPolicy({}).valid, true);
  assert.equal(readDeploymentPolicy({ NEXT_PUBLIC_SUPABASE_URL: "https://fixture.supabase.co" }).valid, true);
});

test("staging requires explicit matching project and public/server deployment identities", () => {
  assert.equal(readDeploymentPolicy(staging).valid, true);
  assert.equal(readDeploymentPolicy({ ...staging, NEXT_PUBLIC_FAURIO_DEPLOYMENT: "demo" }).valid, false);
  assert.equal(readDeploymentPolicy({ ...staging, FAURIO_SUPABASE_PROJECT_REF: "" }).valid, false);
  assert.equal(readDeploymentPolicy({ ...staging, SUPABASE_URL: "https://differentprojectabcd.supabase.co" }).valid, false);
  assert.equal(readDeploymentPolicy({ ...staging, NEXT_PUBLIC_SUPABASE_ANON_KEY: "" }).valid, false);
});

test("binding both URLs to the demonstration project is still forbidden outside demo", () => {
  const result = readDeploymentPolicy({ ...staging, FAURIO_SUPABASE_PROJECT_REF: DEMO_PROJECT_REF, SUPABASE_URL: `https://${DEMO_PROJECT_REF}.supabase.co`, NEXT_PUBLIC_SUPABASE_URL: `https://${DEMO_PROJECT_REF}.supabase.co` });
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes("DEMO_DATABASE_FORBIDDEN"));
});

test("commercial preparation requires disabled payments even with a test key", () => {
  const commercial = { ...staging, FAURIO_DEPLOYMENT: "commercial", NEXT_PUBLIC_FAURIO_DEPLOYMENT: "commercial", FAURIO_PAYMENT_MODE: "disabled" };
  assert.equal(readDeploymentPolicy(commercial).valid, true);
  for (const mode of ["", "test", "live"]) assert.equal(readDeploymentPolicy({ ...commercial, FAURIO_PAYMENT_MODE: mode }).valid, false);
});

test("unsafe URLs and unknown environments fail closed without exposing credentials", () => {
  for (const url of ["http://fixture.netlify.app", "https://localhost", "https://127.0.0.1", "https://user:password@fixture.netlify.app", "https://fixture.netlify.app/path"]) assert.equal(readDeploymentPolicy({ ...staging, NEXT_PUBLIC_SITE_URL: url }).valid, false);
  assert.equal(readDeploymentPolicy({ FAURIO_DEPLOYMENT: "production" }).valid, false);
  for (const url of [`https://${project}.supabase.co.evil.test`, `https://user:password@${project}.supabase.co`, `https://${project}.supabase.co/?token=secret`]) assert.equal(readDeploymentPolicy({ ...staging, SUPABASE_URL: url }).valid, false);
  assert.equal(JSON.stringify(readDeploymentPolicy({ ...staging, SUPABASE_SERVICE_ROLE_KEY: "never-serialize-this" })).includes("never-serialize-this"), false);
});

test("server credentials cannot be accidentally published as browser keys", () => {
  const legacyServiceKey = `header.${Buffer.from(JSON.stringify({ role: "service_role" })).toString("base64url")}.signature`;
  for (const key of ["sb_secret_fixture", legacyServiceKey]) assert.equal(readDeploymentPolicy({ ...staging, NEXT_PUBLIC_SUPABASE_ANON_KEY: key }).valid, false);
  assert.equal(readDeploymentPolicy({ ...staging, SUPABASE_SERVICE_ROLE_KEY: "same-secret", NEXT_PUBLIC_SUPABASE_ANON_KEY: "same-secret" }).valid, false);
});
