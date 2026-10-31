import {z} from "zod";
import {api,databaseError,readJson,requireAuth} from "@/lib/marketplace/http";
export const POST=api(async(request)=>{
  const auth=await requireAuth(request);
  const body=await readJson(request,z.object({code:z.string().min(1).max(100),productId:z.string().min(1).max(200),rating:z.number().int().min(1).max(5),body:z.string().trim().min(5).max(2000)}).strict());
  const {error}=await auth.supabase.rpc("submit_product_review",{p_code:body.code,p_product:body.productId,p_rating:body.rating,p_body:body.body});databaseError(error);
  return Response.json({submitted:true,moderationRequired:true},{status:201});
});
