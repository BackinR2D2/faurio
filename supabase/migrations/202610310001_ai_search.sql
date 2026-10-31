begin;

create function public.search_normalize(value text) returns text language sql immutable parallel safe set search_path='' as $$
  select translate(lower(coalesce(value,'')),'ăâîșțşţ','aaistst');
$$;

create table public.search_intent_cache(cache_key text primary key check(cache_key ~ '^[a-f0-9]{64}$'),intent jsonb not null,expires_at timestamptz not null);
create table public.search_ai_usage(day date primary key,calls integer not null default 0);
alter table public.search_intent_cache enable row level security;
alter table public.search_ai_usage enable row level security;
revoke all on public.search_intent_cache,public.search_ai_usage from public,anon,authenticated;
grant select,insert,update,delete on public.search_intent_cache to service_role;

create function public.claim_search_ai_slot(p_limit integer default 200) returns boolean language plpgsql security definer set search_path='' as $$
declare taken integer;
begin
  if p_limit not between 1 and 1000 then return false; end if;
  insert into public.search_ai_usage(day,calls) values(current_date,1)
    on conflict(day) do update set calls=public.search_ai_usage.calls+1 where public.search_ai_usage.calls<least(p_limit,1000) returning calls into taken;
  delete from public.search_intent_cache where expires_at<now();
  delete from public.search_ai_usage where day<current_date-7;
  return taken is not null;
end;
$$;

create function public.catalog_search_taxonomy() returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object('productTypes',coalesce(jsonb_agg(distinct product_type),'[]'::jsonb),
    'categories',coalesce(jsonb_agg(distinct category),'[]'::jsonb),'materials',coalesce(jsonb_agg(distinct material),'[]'::jsonb),
    'colors',coalesce(jsonb_agg(distinct color),'[]'::jsonb)) from public.catalog_products;
$$;

create function public.search_marketplace_catalog(p_intent jsonb,p_filters jsonb default '{}',p_page integer default 1,p_size integer default 24) returns jsonb
language sql stable security definer set search_path='' as $$
with matched as (
  select p.*, (
    select coalesce(sum(case when strpos(public.search_normalize(p.name||' '||p.product_type),public.search_normalize(term))>0 then 8 else 0 end
      +case when strpos(public.search_normalize(p.material||' '||p.color),public.search_normalize(term))>0 then 4 else 0 end
      +case when strpos(public.search_normalize(p.description||' '||p.moods::text||' '||p.recipients::text||' '||p.occasion::text),public.search_normalize(term))>0 then 2 else 0 end),0)
      from jsonb_array_elements_text(coalesce(p_intent->'rankingTerms','[]')) term
  ) as relevance
  from public.catalog_products p
  where p.active
    and (coalesce(p_filters->>'shopId','')='' or p.shop_id::text=p_filters->>'shopId')
    and (coalesce(p_filters->>'category','Toate')='Toate' or p.category=p_filters->>'category')
    and (coalesce(p_intent#>>'{filters,category}','')='' or p.category=p_intent#>>'{filters,category}')
    and (coalesce(p_filters->>'material','Toate')='Toate' or strpos(public.search_normalize(p.material),public.search_normalize(p_filters->>'material'))>0)
    and (p_filters->>'maxPrice' is null or p.price<=(p_filters->>'maxPrice')::numeric)
    and (p_intent#>>'{filters,maxPrice}' is null or p.price<=(p_intent#>>'{filters,maxPrice}')::numeric)
    and (p_intent#>>'{filters,minPrice}' is null or p.price>=(p_intent#>>'{filters,minPrice}')::numeric)
    and (coalesce((p_filters->>'minRating')::numeric,0)=0 or (p.rating_source='verified' and p.reviews>0 and p.rating>=(p_filters->>'minRating')::numeric))
    and (not coalesce((p_filters->>'ready')::boolean,false) and not coalesce((p_intent#>>'{filters,ready}')::boolean,false) or p.shipping_days<=2)
    and (not coalesce((p_intent#>>'{filters,inStock}')::boolean,false) or p.stock>0)
    and (not coalesce((p_intent#>>'{filters,personalizable}')::boolean,false) or p.personalizable)
    and (jsonb_array_length(coalesce(p_intent->'productTypes','[]'))=0 or p.product_type in(select jsonb_array_elements_text(p_intent->'productTypes')))
    and not exists(select 1 from jsonb_array_elements_text(coalesce(p_intent#>'{filters,materials}','[]')) m where
      case when m='in' then public.search_normalize(p.material)!~'\min\M' else strpos(public.search_normalize(p.material),public.search_normalize(m))=0 end)
    and not exists(select 1 from jsonb_array_elements_text(coalesce(p_intent#>'{filters,excludedMaterials}','[]')) m where strpos(public.search_normalize(p.material),public.search_normalize(m))>0)
    and not exists(select 1 from jsonb_array_elements_text(coalesce(p_intent#>'{filters,colors}','[]')) c where strpos(public.search_normalize(p.color),public.search_normalize(c))=0)
    and not exists(select 1 from jsonb_array_elements_text(coalesce(p_intent->'requiredTerms','[]')) term where strpos(public.search_normalize(p.name||' '||p.product_type||' '||p.description),public.search_normalize(term))=0)
    and (coalesce(p_intent#>>'{filters,occasion}','')='' or p.occasion @> array[p_intent#>>'{filters,occasion}'])
    and (jsonb_array_length(coalesce(p_intent#>'{filters,recipients}','[]'))=0 or p.recipients && array(select jsonb_array_elements_text(p_intent#>'{filters,recipients}')))
    and (coalesce(p_intent#>>'{filters,mood}','')='' or p.moods @> array[p_intent#>>'{filters,mood}'])
), relevant as (
  select * from matched where jsonb_array_length(coalesce(p_intent->'productTypes','[]'))>0
    or jsonb_array_length(coalesce(p_intent->'requiredTerms','[]'))>0
    or jsonb_array_length(coalesce(p_intent->'rankingTerms','[]'))=0 or relevance>0
), numbered as (
  select *,row_number() over(order by
    case when coalesce(p_filters->>'sort','relevanta')='relevanta' then relevance end desc,
    case when p_filters->>'sort'='pret-mic' then price end asc,
    case when p_filters->>'sort'='pret-mare' then price end desc,
    case when p_filters->>'sort'='nou' then created_at end desc,
    case when p_filters->>'sort'='rating' and rating_source='verified' then rating end desc nulls last,id asc) as rn
  from relevant
), bounds as (
  select count(*)::integer as total,greatest(1,least(10000,p_page,ceil(count(*)::numeric/greatest(1,least(p_size,48)))::integer)) as page,greatest(1,least(p_size,48)) as size from numbered
)
select jsonb_build_object('total',b.total,'page',b.page,'pageSize',b.size,'products',coalesce((select jsonb_agg(to_jsonb(n)-'rn'-'relevance' order by n.rn) from numbered n where n.rn>(b.page-1)*b.size and n.rn<=b.page*b.size),'[]')) from bounds b;
$$;

revoke all on function public.claim_search_ai_slot(integer),public.catalog_search_taxonomy(),public.search_marketplace_catalog(jsonb,jsonb,integer,integer) from public,anon,authenticated;
grant execute on function public.claim_search_ai_slot(integer),public.catalog_search_taxonomy(),public.search_marketplace_catalog(jsonb,jsonb,integer,integer) to service_role;

commit;
