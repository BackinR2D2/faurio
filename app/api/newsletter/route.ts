import {z} from "zod";
import {getSupabaseAdmin} from "@/lib/supabase-server";
import {api,ApiError,databaseError,readJson} from "@/lib/marketplace/http";
import {limitPublicForm} from "@/lib/marketplace/form-limit";
export const POST=api(async(request)=>{
  const body=await readJson(request,z.object({email:z.email().max(180)}).strict());
  const db=getSupabaseAdmin();if(!db)throw new ApiError(503,"DATABASE_UNAVAILABLE","Serviciul nu este configurat.");
  await limitPublicForm(request,db,"newsletter");
  const {error}=await db.from("newsletter_subscribers").upsert({email:body.email.toLowerCase()},{onConflict:"email"});databaseError(error);
  return Response.json({accepted:true,persisted:true});
});
