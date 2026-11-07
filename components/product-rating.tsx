import { Star } from "lucide-react";

export function ProductRating({ rating, count }: { rating: number; count: number }) {
  const value = count > 0 ? Math.min(5, Math.max(0, rating)) : 0;
  return <span className="product-rating-summary" aria-label={count > 0 ? `${value.toLocaleString("ro-RO", { maximumFractionDigits: 1 })} din 5 stele, ${count} ${count === 1 ? "recenzie" : "recenzii"}` : "Nicio recenzie"}>
    <span className="product-rating-stars" aria-hidden="true">{[0,1,2,3,4].map(index => <span className="product-rating-star" key={index}><Star size={14} /><span style={{ width: `${Math.min(1,Math.max(0,value-index))*100}%` }}><Star size={14} fill="currentColor" /></span></span>)}</span>
    {count > 0 ? <><strong>{value.toLocaleString("ro-RO", { maximumFractionDigits: 1 })}</strong><span>({count})</span></> : <span>0 recenzii</span>}
  </span>;
}
