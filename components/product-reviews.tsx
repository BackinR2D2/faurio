import {getSupabaseAdmin} from "@/lib/supabase-server";

export async function ProductReviews({productId}:{productId:string}){
  const db=getSupabaseAdmin();if(!db)return null;
  const {data,error}=await db.from("public_product_reviews").select("id,rating,body,created_at").eq("product_id",productId).order("created_at",{ascending:false}).limit(12);
  if(error||!data?.length)return null;
  return <section id="recenzii" className="page-main verified-reviews"><h2>Recenzii</h2><div>{data.map(review=><article key={review.id}><strong>{review.rating} / 5 · Achiziție verificată</strong><p>{review.body}</p><time dateTime={review.created_at}>{new Date(review.created_at).toLocaleDateString("ro-RO")}</time></article>)}</div></section>;
}
