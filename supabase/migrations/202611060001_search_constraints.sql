begin;

create or replace function public.search_marketplace_catalog(p_intent jsonb,p_filters jsonb default '{}',p_page integer default 1,p_size integer default 24) returns jsonb
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
    and not exists(select 1 from jsonb_array_elements_text(coalesce(p_intent#>'{filters,excludedProductTypes}','[]')) t where p.product_type=t)
    and (case when p_intent#>>'{filters,materialMatch}'='any' then
      jsonb_array_length(coalesce(p_intent#>'{filters,materials}','[]'))=0 or exists(select 1 from jsonb_array_elements_text(p_intent#>'{filters,materials}') m where
        case when m='in' then public.search_normalize(p.material)~'\min\M' else strpos(public.search_normalize(p.material),public.search_normalize(m))>0 end)
      else not exists(select 1 from jsonb_array_elements_text(coalesce(p_intent#>'{filters,materials}','[]')) m where
        case when m='in' then public.search_normalize(p.material)!~'\min\M' else strpos(public.search_normalize(p.material),public.search_normalize(m))=0 end) end)
    and not exists(select 1 from jsonb_array_elements_text(coalesce(p_intent#>'{filters,excludedMaterials}','[]')) m where
      case when m='in' then public.search_normalize(p.material)~'\min\M' else strpos(public.search_normalize(p.material),public.search_normalize(m))>0 end)
    and (case when p_intent#>>'{filters,colorMatch}'='any' then
      jsonb_array_length(coalesce(p_intent#>'{filters,colors}','[]'))=0 or exists(select 1 from jsonb_array_elements_text(p_intent#>'{filters,colors}') c where public.search_normalize(p.color) ~ ('\m'||public.search_normalize(c)||'\M'))
      else not exists(select 1 from jsonb_array_elements_text(coalesce(p_intent#>'{filters,colors}','[]')) c where public.search_normalize(p.color) !~ ('\m'||public.search_normalize(c)||'\M')) end)
    and not exists(select 1 from jsonb_array_elements_text(coalesce(p_intent#>'{filters,excludedColors}','[]')) c where public.search_normalize(p.color) ~ ('\m'||public.search_normalize(c)||'\M'))
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


commit;
