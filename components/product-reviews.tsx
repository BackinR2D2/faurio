import {getSupabaseAdmin} from "@/lib/supabase-server";

export async function ProductReviews({productId}:{productId:string}){
  const db=getSupabaseAdmin();if(!db)return null;
  const {data,error}=await db.from("public_product_reviews").select("id,rating,body,created_at").eq("product_id",productId).order("created_at",{ascending:false}).limit(12);
  if(error||!data?.length)return null;
  return <section id="recenzii" className="page-main verified-reviews"><p className="eyebrow">Experiențe reale</p><h2>Din mâinile creatorului, în viața lor.</h2><p>Recenzii ale cumpărătorilor cu o comandă achitată și marcată livrată, publicate după moderare.</p><div>{data.map(review=><article key={review.id}><strong>{review.rating} / 5 · Achiziție verificată</strong><p>{review.body}</p><time dateTime={review.created_at}>{new Date(review.created_at).toLocaleDateString("ro-RO")}</time></article>)}</div></section>;
}
