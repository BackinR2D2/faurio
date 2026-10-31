import {z} from "zod";
import {api,ApiError,databaseError,readJson,requireOperator} from "@/lib/marketplace/http";
export const GET=api(async(request)=>{
  const {admin}=await requireOperator(request);
  const requested=new URL(request.url).searchParams.get("kind");
  const kind=requested==="returns"?"return_requests":requested==="contacts"?"contact_messages":"product_reviews";
  const page=Math.max(1,Math.min(10000,Math.trunc(Number(new URL(request.url).searchParams.get("page"))||1)));
  const {data,error,count}=await admin.from(kind).select("*",{count:"exact"}).order("created_at",{ascending:false}).order("id").range((page-1)*20,page*20-1);
  if(error?.code!=="PGRST103")databaseError(error);
  return Response.json({records:data||[],total:count||0,page});
});
export const PATCH=api(async(request)=>{
  const {admin,user}=await requireOperator(request);
  const body=await readJson(request,z.object({kind:z.enum(["reviews","returns"]),id:z.uuid(),status:z.string().max(20),reason:z.string().trim().min(5).max(1000)}).strict());
  const valid=body.kind==="reviews"?["approved","rejected"]:["reviewing","resolved","rejected"];
  if(!valid.includes(body.status))throw new ApiError(400,"INVALID_STATE","Stare invalidă.");
  const {error}=await admin.rpc("moderate_buyer_feedback",{p_actor:user.id,p_kind:body.kind,p_id:body.id,p_status:body.status,p_reason:body.reason});databaseError(error);
  return Response.json({updated:true});
});
