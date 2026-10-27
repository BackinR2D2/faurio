import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductDetail } from "@/components/product-detail";
import { getProduct, products } from "@/lib/catalog";

export function generateStaticParams() { return products.map((product) => ({ id: product.id })); }
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const product = getProduct((await params).id);
  return product ? { title: product.name, description: product.description } : {};
}
export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const product = getProduct((await params).id);
  if (!product) notFound();
  const related = products.filter((item) => item.id !== product.id).sort((a, b) => Number(b.category === product.category) - Number(a.category === product.category)).slice(0, 3);
  const jsonLd = { "@context": "https://schema.org", "@type": "Product", name: product.name, description: product.description, image: `https://fir-de-poveste-handmade.elatedpine3.chatgpt.site${product.image}`, brand: { "@type": "Brand", name: product.maker }, offers: { "@type": "Offer", priceCurrency: "RON", price: product.price, availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock" }, aggregateRating: { "@type": "AggregateRating", ratingValue: product.rating, reviewCount: product.reviews } };
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} /><ProductDetail product={product} related={related} /></>;
}
