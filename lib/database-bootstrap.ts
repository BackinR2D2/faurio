import { createHash } from "node:crypto";

export const bootstrapMigrations = [
  "202610300001_marketplace.sql",
  "202610300002_product_media.sql",
  "202610300003_order_emails.sql",
  "202610310001_ai_search.sql",
  "202610310002_connect_and_fees.sql",
  "202610310003_shop_media.sql",
  "202610310004_buyer_trust.sql",
  "202611010001_shop_lifecycle.sql",
  "202611060001_search_constraints.sql",
  "202611070001_catalog_multi_filters.sql",
  "202611070002_open_product_reviews.sql",
  "202611090001_account_deletion.sql",
] as const;

export function buildCleanBootstrap(environment: "staging" | "commercial", schema: string, migrations: { name: string; sql: string }[]) {
  if (!["staging", "commercial"].includes(environment)) throw new Error("INVALID_BOOTSTRAP_ENVIRONMENT");
  if (JSON.stringify(migrations.map(item => item.name)) !== JSON.stringify(bootstrapMigrations)) throw new Error("BOOTSTRAP_MIGRATION_MANIFEST_MISMATCH");
  const bodies = migrations.map(({ name, sql }) => {
    const source = sql.trim();
    if (!/^begin;\s/i.test(source) || !/\scommit;$/i.test(source)) throw new Error(`BOOTSTRAP_TRANSACTION_WRAPPER_REQUIRED: ${name}`);
    return `\n-- ${name}\n${source.replace(/^begin;\s*/i, "").replace(/\s*commit;$/i, "")}`;
  });
  const fingerprint = createHash("sha256").update(JSON.stringify({ bootstrapVersion: 1, environment, schema, migrations })).digest("hex");
  const sql = `-- Faurio clean installation: ${environment}
-- Fresh Supabase project only. Never use on the existing demonstration database.
-- No seed.sql, user accounts, catalog products or order data are copied.
-- Source fingerprint: ${fingerprint}
begin;
do $fresh$
begin
  if to_regclass('auth.users') is null then raise exception 'bootstrap_requires_supabase_auth'; end if;
  if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p','v','m','f')) then
    raise exception 'bootstrap_existing_database_refused';
  end if;
  if exists(select 1 from auth.users) then raise exception 'bootstrap_existing_users_refused'; end if;
  if to_regclass('storage.buckets') is not null then
    if exists(select 1 from storage.buckets) then raise exception 'bootstrap_existing_storage_refused'; end if;
  end if;
end;
$fresh$;
${schema.trim()}
${bodies.join("\n")}

alter table public.products alter column shop_id drop default;
delete from public.shop_pages where shop_id='00000000-0000-4000-8000-000000000001';
delete from public.shops where id='00000000-0000-4000-8000-000000000001' and is_legacy;
delete from public.promotions where code='POVESTE10';

do $empty$
begin
  if exists(select 1 from public.products) or exists(select 1 from public.shops)
    or exists(select 1 from public.orders) or exists(select 1 from public.profiles)
    or exists(select 1 from public.promotions) or exists(select 1 from auth.users) then
    raise exception 'bootstrap_nonempty_result_refused';
  end if;
end;
$empty$;

create table public.faurio_installation (
  singleton boolean primary key default true check(singleton),
  environment text not null check(environment in ('staging','commercial')),
  source_fingerprint text not null check(source_fingerprint ~ '^[a-f0-9]{64}$'),
  installed_at timestamptz not null default now()
);
alter table public.faurio_installation enable row level security;
revoke all on public.faurio_installation from public,anon,authenticated;
grant select on public.faurio_installation to service_role;
insert into public.faurio_installation(environment,source_fingerprint) values('${environment}','${fingerprint}');
commit;
`;
  return { sql, fingerprint, environment, migrationCount: migrations.length };
}
