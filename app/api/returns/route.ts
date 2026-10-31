import {z} from "zod";
import {api,databaseError,readJson,requireAuth} from "@/lib/marketplace/http";
export const POST=api(async(request)=>{
  const auth=await requireAuth(request);
  const body=await readJson(request,z.object({code:z.string().min(1).max(100),message:z.string().trim().min(5).max(2000)}).strict());
  const {error}=await auth.supabase.rpc("request_order_return",{p_code:body.code,p_message:body.message});databaseError(error);
  return Response.json({submitted:true,refundNotAutomatic:true},{status:201});
});
