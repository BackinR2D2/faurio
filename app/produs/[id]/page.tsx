import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductDetail } from "@/components/product-detail";
import { getProductById, getRelatedProducts } from "@/lib/products";
import { siteUrl } from "@/lib/site-url";
import { ProductReviews } from "@/components/product-reviews";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const product = await getProductById((await params).id);
  return product ? { title: product.name, description: product.description } : {};
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const product = await getProductById((await params).id);
  if (!product) notFound();
  const related = await getRelatedProducts(product);
  const jsonLd = { "@context": "https://schema.org", "@type": "Product", name: product.name, description: product.description, image: `${siteUrl}${product.image}`, brand: { "@type": "Brand", name: product.maker }, offers: { "@type": "Offer", priceCurrency: "RON", price: product.price, availability: product.stock > 0 && product.checkoutEligible !== false ? "https://schema.org/InStock" : "https://schema.org/OutOfStock" }, ...(product.reviews > 0 ? { aggregateRating: { "@type": "AggregateRating", ratingValue: product.rating, reviewCount: product.reviews } } : {}) };
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} /><ProductDetail product={product} related={related}><ProductReviews productId={product.id} /></ProductDetail></>;
}
