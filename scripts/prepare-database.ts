import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { bootstrapMigrations, buildCleanBootstrap } from "../lib/database-bootstrap.ts";

const args = process.argv.slice(2);
if (args.length !== 2 || args[0] !== "--environment" || !["staging", "commercial"].includes(args[1])) throw new Error("Usage: npm run db:prepare -- --environment staging|commercial");
const environment = args[1] as "staging" | "commercial";
const folder = resolve("supabase/migrations");
const available = (await readdir(folder)).filter(name => name.endsWith(".sql")).sort();
if (JSON.stringify(available) !== JSON.stringify(bootstrapMigrations)) throw new Error("Review the migration manifest before generating a new installation.");
const schema = await readFile(resolve("supabase/schema.sql"), "utf8");
const migrations = await Promise.all(bootstrapMigrations.map(async name => ({ name, sql: await readFile(resolve(folder, name), "utf8") })));
const result = buildCleanBootstrap(environment, schema, migrations);
const output = resolve("dist/database", `clean-${environment}.sql`);
await mkdir(resolve("dist/database"), { recursive: true });
await writeFile(output, result.sql);
console.log(JSON.stringify({ output, environment, sourceFingerprint: result.fingerprint, migrations: result.migrationCount, executesSql: false, connectsToDatabase: false, includesSeed: false }, null, 2));
