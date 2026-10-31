import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { posts } from "@/lib/blog";

export const metadata: Metadata = { title: "Jurnal", description: "Ghiduri despre obiecte handmade, ateliere locale și cadouri alese cu sens." };

export default function BlogPage() {
  return <main className="page-main blog-page">
    <div className="page-heading"><p className="eyebrow">Jurnalul Faurio</p><h1>Despre mâini, materiale și alegeri bune.</h1><p>Note din ateliere și ghiduri care te ajută să alegi mai rar, dar mai bine.</p></div>
    <section className="featured-post"><Image src={posts[0].image} alt="Ceramică handmade" width={1000} height={760} priority /><div><span>{posts[0].category} · {posts[0].reading}</span><h2>{posts[0].title}</h2><p>{posts[0].excerpt}</p><Link href={`/blog/${posts[0].slug}`}>Citește articolul <ArrowUpRight /></Link></div></section>
    <section className="post-grid">{posts.slice(1).map((post) => <article key={post.slug}><Image src={post.image} alt="" width={800} height={600} /><span>{post.category} · {post.date}</span><h2>{post.title}</h2><p>{post.excerpt}</p><Link href={`/blog/${post.slug}`}>Citește <ArrowUpRight /></Link></article>)}</section>
  </main>;
}
