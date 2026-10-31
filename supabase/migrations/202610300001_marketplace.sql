begin;

create table public.shops (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{2,58}[a-z0-9]$'),
  name text not null check (char_length(name) between 2 and 100),
  country text not null default 'RO' check (country ~ '^[A-Z]{2}$'),
  location text not null default '' check (char_length(location) <= 100),
  status text not null default 'pending_review' check (status in ('draft','pending_review','active','restricted','suspended','closed')),
  is_legacy boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.shop_memberships (
  shop_id uuid not null references public.shops(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  role text not null check (role in ('owner','editor')),
  revoked_at timestamptz,
  primary key(shop_id,user_id)
);
create index shop_memberships_user_idx on public.shop_memberships(user_id) where revoked_at is null;

create table public.seller_applications (
  shop_id uuid primary key references public.shops(id) on delete restrict,
  applicant_id uuid not null references auth.users(id) on delete restrict,
  terms_version text not null,
  accepted_at timestamptz not null default now(),
  review_reason text not null default '',
  reviewed_at timestamptz
);

create table public.shop_pages (
  shop_id uuid primary key references public.shops(id) on delete restrict,
  draft jsonb not null,
  published jsonb,
  revision integer not null default 1 check (revision > 0),
  published_at timestamptz,
  updated_at timestamptz not null default now()
);

create table public.shop_page_versions (
  id bigint generated always as identity primary key,
  shop_id uuid not null references public.shops(id) on delete restrict,
  revision integer not null,
  content jsonb not null,
  actor_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(shop_id,revision)
);

create table public.marketplace_audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  shop_id uuid references public.shops(id) on delete restrict,
  action text not null,
  subject_id text,
  reason text not null default '',
  created_at timestamptz not null default now()
);

alter table public.products add column shop_id uuid references public.shops(id) on delete restrict;
alter table public.products add column listing_status text not null default 'draft' check (listing_status in ('draft','pending_review','published','archived'));
alter table public.products add column rating_source text not null default 'legacy_demo' check (rating_source in ('legacy_demo','verified'));
alter table public.products add column personalizable boolean not null default false;
create index products_shop_idx on public.products(shop_id,listing_status,active);

create function public.default_shop_layout(p_name text) returns jsonb language sql immutable set search_path = '' as $$
  select jsonb_build_object('theme','paper','font','sans','title',p_name,'subtitle','Obiecte făcute cu răbdare.','story','','announcement','','cover','/products/ceramica-luna.avif','gallery','[]'::jsonb,'faq','[]'::jsonb,'blocks',jsonb_build_array(jsonb_build_object('type','hero','visible',true),jsonb_build_object('type','products','visible',true),jsonb_build_object('type','story','visible',true),jsonb_build_object('type','gallery','visible',false),jsonb_build_object('type','faq','visible',false),jsonb_build_object('type','announcement','visible',false)));
$$;

insert into public.shops(id,slug,name,status,is_legacy,location)
values ('00000000-0000-4000-8000-000000000001','fir-de-poveste','Fir de Poveste','active',true,'România');
insert into public.shop_pages(shop_id,draft,published,published_at)
select id,public.default_shop_layout(name),public.default_shop_layout(name),now() from public.shops where is_legacy;
update public.products set shop_id='00000000-0000-4000-8000-000000000001',listing_status=case when active then 'published' else 'archived' end;
alter table public.products alter column shop_id set not null;
alter table public.products alter column shop_id set default '00000000-0000-4000-8000-000000000001';

create function public.is_shop_member(p_shop_id uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.shop_memberships where shop_id=p_shop_id and user_id=(select auth.uid()) and revoked_at is null);
$$;
create function public.can_edit_shop(p_shop_id uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_shop_member(p_shop_id) and exists(select 1 from public.shops where id=p_shop_id and status not in ('suspended','closed'));
$$;
create function public.is_public_shop(p_shop_id uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.shops s join public.shop_pages p on p.shop_id=s.id where s.id=p_shop_id and s.status='active' and p.published is not null);
$$;

create function public.valid_shop_layout(p jsonb) returns boolean language plpgsql immutable set search_path = '' as $$
declare b jsonb; f jsonb; g jsonb;
begin
  if jsonb_typeof(p) is distinct from 'object' or octet_length(p::text)>30000 then return false; end if;
  if exists(select 1 from jsonb_object_keys(p) k where k not in ('theme','font','title','subtitle','story','announcement','cover','gallery','faq','blocks')) then return false; end if;
  if exists(select 1 from unnest(array['theme','font','title','subtitle','story','announcement','cover']) k where jsonb_typeof(p->k) is distinct from 'string') then return false; end if;
  if coalesce(p->>'theme','') not in ('paper','clay','botanical','gallery','playful') or coalesce(p->>'font','') not in ('sans','serif','oswald') then return false; end if;
  if coalesce(char_length(p->>'title'),0) not between 2 and 100 or coalesce(char_length(p->>'subtitle'),0)>240 or coalesce(char_length(p->>'story'),0)>6000 or coalesce(char_length(p->>'announcement'),0)>400 then return false; end if;
  if coalesce(p->>'cover','') not in ('/products/ceramica-luna.avif','/products/broderie-camp.avif','/products/lumanare-terrazzo.avif') then return false; end if;
  if jsonb_typeof(p->'blocks') is distinct from 'array' or jsonb_array_length(p->'blocks')<>6 then return false; end if;
  if (select count(distinct x->>'type') from jsonb_array_elements(p->'blocks') x)<>6 then return false; end if;
  for b in select * from jsonb_array_elements(p->'blocks') loop
    if coalesce(b->>'type','') not in ('hero','products','story','gallery','faq','announcement') or jsonb_typeof(b->'visible') is distinct from 'boolean' then return false; end if;
  end loop;
  if not exists(select 1 from jsonb_array_elements(p->'blocks') x where x->>'type'='products' and x->>'visible'='true') then return false; end if;
  if jsonb_typeof(p->'gallery') is distinct from 'array' or jsonb_array_length(p->'gallery')>3 then return false; end if;
  for g in select * from jsonb_array_elements(p->'gallery') loop
    if g#>>'{}' not in ('/products/ceramica-luna.avif','/products/broderie-camp.avif','/products/lumanare-terrazzo.avif') then return false; end if;
  end loop;
  if jsonb_typeof(p->'faq') is distinct from 'array' or jsonb_array_length(p->'faq')>5 then return false; end if;
  for f in select * from jsonb_array_elements(p->'faq') loop
    if coalesce(char_length(f->>'question'),0) not between 1 and 160 or coalesce(char_length(f->>'answer'),0) not between 1 and 800 then return false; end if;
  end loop;
  return true;
end;
$$;
alter table public.shop_pages add constraint shop_pages_draft_valid check(public.valid_shop_layout(draft));
alter table public.shop_pages add constraint shop_pages_published_valid check(published is null or public.valid_shop_layout(published));

create function public.apply_for_shop(p_name text,p_slug text,p_country text,p_location text,p_terms_version text) returns uuid language plpgsql security definer set search_path = '' as $$
declare shop uuid; who uuid := auth.uid();
begin
  if who is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if p_terms_version<>'seller-2026-10' then raise exception 'seller_terms_required' using errcode='22023'; end if;
  if p_slug in ('admin','studio','api','account','catalog','makers','sell','checkout','fir-de-poveste') then raise exception 'reserved_slug' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtext(who::text));
  if (select count(*) from public.shop_memberships where user_id=who and role='owner')>=3 then raise exception 'shop_limit_reached' using errcode='22023'; end if;
  insert into public.shops(name,slug,country,location) values(p_name,p_slug,p_country,p_location) returning id into shop;
  insert into public.shop_memberships(shop_id,user_id,role) values(shop,who,'owner');
  insert into public.shop_pages(shop_id,draft) values(shop,public.default_shop_layout(p_name));
  insert into public.seller_applications(shop_id,applicant_id,terms_version) values(shop,who,p_terms_version);
  insert into public.marketplace_audit_log(actor_id,shop_id,action) values(who,shop,'shop.applied');
  return shop;
end;
$$;

create function public.save_shop_page(p_shop_id uuid,p_draft jsonb,p_revision integer) returns integer language plpgsql security definer set search_path = '' as $$
declare next_revision integer;
begin
  if not public.can_edit_shop(p_shop_id) then raise exception 'shop_access_denied' using errcode='42501'; end if;
  if not public.valid_shop_layout(p_draft) then raise exception 'invalid_shop_layout' using errcode='22023'; end if;
  update public.shop_pages set draft=p_draft,revision=revision+1,updated_at=now() where shop_id=p_shop_id and revision=p_revision returning revision into next_revision;
  if next_revision is null then raise exception 'draft_conflict' using errcode='40001'; end if;
  return next_revision;
end;
$$;

create function public.publish_shop_page(p_shop_id uuid,p_revision integer,p_publish boolean default true) returns integer language plpgsql security definer set search_path = '' as $$
declare current_page public.shop_pages%rowtype;
begin
  if not public.can_edit_shop(p_shop_id) then raise exception 'shop_access_denied' using errcode='42501'; end if;
  if p_publish and not exists(select 1 from public.shops where id=p_shop_id and status='active') then raise exception 'shop_approval_required' using errcode='22023'; end if;
  select * into current_page from public.shop_pages where shop_id=p_shop_id for update;
  if current_page.revision<>p_revision then raise exception 'draft_conflict' using errcode='40001'; end if;
  if p_publish then
    insert into public.shop_page_versions(shop_id,revision,content,actor_id) values(p_shop_id,current_page.revision,current_page.draft,auth.uid());
  end if;
  update public.shop_pages set published=case when p_publish then draft else null end,published_at=case when p_publish then now() else null end,revision=revision+1,updated_at=now() where shop_id=p_shop_id;
  insert into public.marketplace_audit_log(actor_id,shop_id,action) values(auth.uid(),p_shop_id,case when p_publish then 'page.published' else 'page.unpublished' end);
  return p_revision+1;
end;
$$;

create function public.save_shop_product(p_shop_id uuid,p_product_id text,p_data jsonb,p_submit boolean default false) returns text language plpgsql security definer set search_path = '' as $$
declare product text := coalesce(p_product_id,gen_random_uuid()::text); author_name text; author_location text;
begin
  if not public.can_edit_shop(p_shop_id) then raise exception 'shop_access_denied' using errcode='42501'; end if;
  if p_product_id is not null and not exists(select 1 from public.products where id=p_product_id and shop_id=p_shop_id) then raise exception 'product_access_denied' using errcode='42501'; end if;
  if octet_length(p_data::text)>20000 or coalesce(char_length(p_data->>'name'),0) not between 2 and 140 or coalesce(char_length(p_data->>'description'),0) not between 20 and 4000 then raise exception 'invalid_product' using errcode='22023'; end if;
  if (p_data->>'price')::integer not between 1 and 100000 or (p_data->>'stock')::integer not between 0 and 9999 or (p_data->>'shipping_days')::integer not between 1 and 90 then raise exception 'invalid_product_numbers' using errcode='22023'; end if;
  if coalesce(p_data->>'category','') not in ('Ceramică','Sticlărie','Textile','Lumânări','Bijuterii','Lemn','Decorațiuni','Papetărie') then raise exception 'invalid_category' using errcode='22023'; end if;
  if coalesce(p_data->>'image','') not in ('/products/ceramica-luna.avif','/products/broderie-camp.avif','/products/lumanare-terrazzo.avif') then raise exception 'invalid_product_image' using errcode='22023'; end if;
  select name,location into author_name,author_location from public.shops where id=p_shop_id;
  insert into public.products(id,shop_id,name,product_type,category,price,stock,maker,maker_location,material,color,image,description,shipping_days,active,listing_status,rating,reviews,rating_source)
  values(product,p_shop_id,p_data->>'name',coalesce(p_data->>'product_type','Produs'),p_data->>'category',(p_data->>'price')::integer,(p_data->>'stock')::integer,author_name,author_location,coalesce(p_data->>'material',''),coalesce(p_data->>'color',''),p_data->>'image',p_data->>'description',(p_data->>'shipping_days')::integer,false,case when p_submit then 'pending_review' else 'draft' end,0,0,'verified')
  on conflict(id) do update set name=excluded.name,product_type=excluded.product_type,category=excluded.category,price=excluded.price,stock=excluded.stock,material=excluded.material,color=excluded.color,image=excluded.image,description=excluded.description,shipping_days=excluded.shipping_days,active=false,listing_status=excluded.listing_status,updated_at=now();
  insert into public.marketplace_audit_log(actor_id,shop_id,action,subject_id) values(auth.uid(),p_shop_id,case when p_submit then 'product.submitted' else 'product.saved' end,product);
  return product;
end;
$$;

create function public.archive_shop_product(p_shop_id uuid,p_product_id text) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.can_edit_shop(p_shop_id) then raise exception 'shop_access_denied' using errcode='42501'; end if;
  update public.products set active=false,listing_status='archived',updated_at=now() where id=p_product_id and shop_id=p_shop_id;
  if not found then raise exception 'product_access_denied' using errcode='42501'; end if;
  insert into public.marketplace_audit_log(actor_id,shop_id,action,subject_id) values(auth.uid(),p_shop_id,'product.archived',p_product_id);
end;
$$;

create function public.moderate_marketplace(p_actor uuid,p_kind text,p_id text,p_status text,p_reason text) returns void language plpgsql security definer set search_path = '' as $$
declare target_shop uuid;
begin
  if char_length(trim(p_reason)) not between 5 and 1000 then raise exception 'moderation_reason_required' using errcode='22023'; end if;
  if p_kind='shop' then
    if p_status not in ('active','restricted','suspended') then raise exception 'invalid_status'; end if;
    update public.shops set status=p_status,updated_at=now() where id=p_id::uuid and not is_legacy returning id into target_shop;
    update public.seller_applications set review_reason=p_reason,reviewed_at=now() where shop_id=target_shop;
  elsif p_kind='product' then
    if p_status not in ('published','draft','archived') then raise exception 'invalid_status'; end if;
    update public.products set listing_status=p_status,active=(p_status='published'),updated_at=now() where id=p_id returning shop_id into target_shop;
  else raise exception 'invalid_subject'; end if;
  if target_shop is null then raise exception 'subject_not_found' using errcode='P0002'; end if;
  insert into public.marketplace_audit_log(actor_id,shop_id,action,subject_id,reason) values(p_actor,target_shop,p_kind||'.'||p_status,p_id,p_reason);
end;
$$;

create view public.public_shops with(security_barrier=true) as
select s.id,s.slug,s.country,s.location,s.is_legacy,s.created_at,p.published as layout,p.published_at,coalesce(p.published->>'title',s.name) as name
from public.shops s join public.shop_pages p on p.shop_id=s.id where s.status='active' and p.published is not null;

create view public.catalog_products with(security_barrier=true) as
select p.id,p.name,p.product_type,p.category,p.price,p.old_price,p.stock,p.maker,p.maker_location,p.material,p.color,
  p.occasion,p.recipients,p.moods,p.image,p.image_position,p.rating,p.reviews,p.shipping_days,p.badge,p.description,
  p.details,p.care,p.story,p.active,p.created_at,p.updated_at,p.search_vector,p.shop_id,p.listing_status,p.rating_source,p.personalizable,
  s.slug as shop_slug,s.name as shop_name,s.is_legacy as checkout_eligible
from public.products p join public.shops s on s.id=p.shop_id join public.shop_pages sp on sp.shop_id=s.id
where p.active and p.listing_status='published' and s.status='active' and sp.published is not null;

create function public.guard_legacy_checkout() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if jsonb_typeof(new.items) is distinct from 'array' or jsonb_array_length(new.items)=0 then raise exception 'empty_order' using errcode='22023'; end if;
  if exists(
    select 1 from jsonb_array_elements(new.items) line
    left join public.products p on p.id=line->>'id'
    left join public.shops s on s.id=p.shop_id
    left join public.shop_pages sp on sp.shop_id=s.id
    where p.id is null or not p.active or p.listing_status<>'published' or not s.is_legacy or s.status<>'active' or sp.published is null
  ) then raise exception 'seller_payments_not_enabled' using errcode='22023'; end if;
  return new;
end;
$$;
revoke all on function public.guard_legacy_checkout() from public,anon,authenticated;
create trigger orders_guard_legacy_checkout before insert on public.orders for each row execute function public.guard_legacy_checkout();

alter table public.shops enable row level security;
alter table public.shop_memberships enable row level security;
alter table public.shop_pages enable row level security;
alter table public.shop_page_versions enable row level security;
alter table public.seller_applications enable row level security;
alter table public.marketplace_audit_log enable row level security;
create policy shops_member_read on public.shops for select to authenticated using(public.is_shop_member(id));
create policy memberships_self_read on public.shop_memberships for select to authenticated using(user_id=(select auth.uid()) and revoked_at is null);
create policy pages_member_read on public.shop_pages for select to authenticated using(public.is_shop_member(shop_id));
create policy versions_member_read on public.shop_page_versions for select to authenticated using(public.is_shop_member(shop_id));
create policy applications_own_read on public.seller_applications for select to authenticated using(applicant_id=(select auth.uid()));
drop policy if exists products_public_read on public.products;
create policy products_public_read on public.products for select using(active and listing_status='published' and public.is_public_shop(shop_id));
create policy products_member_read on public.products for select to authenticated using(public.is_shop_member(shop_id));

revoke all on public.shops,public.shop_memberships,public.shop_pages,public.shop_page_versions,public.seller_applications,public.marketplace_audit_log from anon,authenticated;
grant select on public.shops,public.shop_memberships,public.shop_pages,public.shop_page_versions,public.seller_applications to authenticated;
grant select on public.public_shops,public.catalog_products to anon,authenticated;
revoke insert,update,delete on public.products from anon,authenticated;
grant all on public.shops,public.shop_memberships,public.shop_pages,public.shop_page_versions,public.seller_applications,public.marketplace_audit_log to service_role;
grant select on public.public_shops,public.catalog_products to service_role;
grant usage,select on sequence public.shop_page_versions_id_seq,public.marketplace_audit_log_id_seq to service_role;

revoke all on function public.default_shop_layout(text),public.is_shop_member(uuid),public.can_edit_shop(uuid),public.is_public_shop(uuid),public.valid_shop_layout(jsonb),public.apply_for_shop(text,text,text,text,text),public.save_shop_page(uuid,jsonb,integer),public.publish_shop_page(uuid,integer,boolean),public.save_shop_product(uuid,text,jsonb,boolean),public.archive_shop_product(uuid,text),public.moderate_marketplace(uuid,text,text,text,text) from public,anon,authenticated;
grant execute on function public.is_shop_member(uuid),public.is_public_shop(uuid) to anon,authenticated,service_role;
grant execute on function public.can_edit_shop(uuid),public.apply_for_shop(text,text,text,text,text),public.save_shop_page(uuid,jsonb,integer),public.publish_shop_page(uuid,integer,boolean),public.save_shop_product(uuid,text,jsonb,boolean),public.archive_shop_product(uuid,text) to authenticated;
grant execute on function public.moderate_marketplace(uuid,text,text,text,text) to service_role;

commit;
