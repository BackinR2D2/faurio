import {z} from "zod";
import {getSupabaseAdmin} from "@/lib/supabase-server";
import {api,ApiError,databaseError,readJson} from "@/lib/marketplace/http";
import {limitPublicForm} from "@/lib/marketplace/form-limit";
export const POST=api(async(request)=>{
  const body=await readJson(request,z.object({name:z.string().trim().min(2).max(120),email:z.email().max(180),subject:z.string().trim().min(1).max(80),message:z.string().trim().min(10).max(4000),website:z.string().max(200).optional()}).strict());
  if(body.website)throw new ApiError(400,"INVALID_FORM","Formular invalid.");
  const db=getSupabaseAdmin();if(!db)throw new ApiError(503,"DATABASE_UNAVAILABLE","Serviciul nu este configurat.");
  await limitPublicForm(request,db,"contact");
  const {error}=await db.from("contact_messages").insert({name:body.name,email:body.email.toLowerCase(),subject:body.subject,message:body.message});databaseError(error);
  return Response.json({accepted:true,persisted:true});
});
