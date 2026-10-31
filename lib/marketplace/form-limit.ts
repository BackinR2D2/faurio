import "server-only";
import {createHmac} from "node:crypto";
import type {SupabaseClient} from "@supabase/supabase-js";
import {ApiError,databaseError} from "./http";

export async function limitPublicForm(request:Request,db:SupabaseClient,kind:"contact"|"newsletter"|"checkout"){
  const forwarded=process.env.NETLIFY==="true"?request.headers.get("x-nf-client-connection-ip"):process.env.VERCEL?request.headers.get("x-vercel-forwarded-for"):null;
  const client=forwarded?.split(",")[0].trim().slice(0,100)||"unidentified";
  const key=createHmac("sha256",process.env.SUPABASE_SERVICE_ROLE_KEY||"local-unconfigured").update(`${new Date().toISOString().slice(0,10)}:${client}`).digest("hex");
  const {data,error}=await db.rpc("claim_public_form_slot",{p_kind:kind,p_key:key});databaseError(error);
  if(!data)throw new ApiError(429,"FORM_RATE_LIMIT","Prea multe solicitări. Încearcă mai târziu.");
}
