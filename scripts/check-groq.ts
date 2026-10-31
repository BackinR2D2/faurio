import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { extractGroqIntent,mergeAiIntent,type SearchTaxonomy } from "../lib/search/ai.ts";

nextEnv.loadEnvConfig(process.cwd());
const key=process.env.GROQ_API_KEY;
if(!key) throw new Error("Configure GROQ_API_KEY locally; never paste it into chat.");
const db=createClient(process.env.SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});
const sets={productTypes:new Set<string>(),categories:new Set<string>(),materials:new Set<string>(),colors:new Set<string>()};
for(let offset=0;offset<10000;offset+=1000){
  const {data,error}=await db.from("products").select("product_type,category,material,color").eq("active",true).order("id").range(offset,offset+999);
  if(error) throw new Error("Cannot read catalog taxonomy.");
  for(const row of data||[]){sets.productTypes.add(row.product_type);sets.categories.add(row.category);sets.materials.add(row.material);sets.colors.add(row.color);}
  if((data?.length||0)<1000) break;
}
const taxonomy=Object.fromEntries(Object.entries(sets).map(([name,values])=>[name,[...values]])) as SearchTaxonomy;
let passed=0;
const fixtures=["as cauta un tricou maro, am un buget de 100 de lei maxim.","Caut pahare sub 100 lei","Aș dori ceva pentru cineva care adoră ritualul lent al dimineților și mirosul cafelei proaspete"];
for(const query of fixtures){
  try {
    const start=Date.now();const ai=await extractGroqIntent(query,taxonomy,key,process.env.GROQ_MODEL||undefined);const intent=mergeAiIntent(query,ai,taxonomy);
    const valid=query.includes("tricou")?intent.requiredTerms?.includes("tricou")&&intent.filters.maxPrice===100&&intent.filters.colors.includes("maro"):query.includes("pahare")?intent.productTypes.includes("Pahar")&&intent.filters.maxPrice===100:!intent.requiredTerms?.length&&intent.rankingTerms?.some((term)=>["cafea","cană","ceașcă"].includes(term));
    if(valid)passed++;
    console.log(JSON.stringify({fixture:fixtures.indexOf(query)+1,passed:Boolean(valid),durationMs:Date.now()-start,productTypes:intent.productTypes,requiredTerms:intent.requiredTerms,rankingTerms:intent.rankingTerms,maxPrice:intent.filters.maxPrice}));
  }catch(error){console.log(JSON.stringify({fixture:fixtures.indexOf(query)+1,passed:false,code:error instanceof Error&&/^[A-Z_0-9]+$/.test(error.message)?error.message:"AI_RESPONSE_INVALID"}));}
}
console.log(JSON.stringify({passed,total:fixtures.length,actualGroqRequests:true,databaseWrites:false,verifiesWholeCatalogRetrieval:false}));
if(passed!==fixtures.length)process.exitCode=2;
