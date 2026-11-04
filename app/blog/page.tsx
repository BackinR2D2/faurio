import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { posts } from "@/lib/blog";

export const metadata: Metadata = { title: "Jurnal", description: "Ghiduri despre obiecte handmade, ateliere locale și cadouri alese cu sens." };

export default function BlogPage() {
  return <main className="page-main blog-page">
    <div className="page-heading"><h1>Jurnal</h1><p>Ghiduri pentru cumpărători și creatori.</p></div>
    <section className="featured-post"><Image src={posts[0].image} alt={posts[0].title} width={1000} height={760} sizes="(max-width: 850px) 100vw, 55vw" priority /><div><span>{posts[0].category} · {posts[0].reading}</span><h2><Link href={`/blog/${posts[0].slug}`}>{posts[0].title}</Link></h2><p>{posts[0].excerpt}</p><Link href={`/blog/${posts[0].slug}`}>Citește articolul <ArrowUpRight /></Link></div></section>
    <section className="post-grid" aria-label="Articole">{posts.slice(1).map((post) => <article key={post.slug}><Link className="post-image" href={`/blog/${post.slug}`} tabIndex={-1} aria-hidden="true"><Image src={post.image} alt="" width={800} height={600} sizes="(max-width: 560px) 100vw, (max-width: 1100px) 50vw, 33vw" /></Link><span>{post.category} · {post.reading}</span><h2><Link href={`/blog/${post.slug}`}>{post.title}</Link></h2><p>{post.excerpt}</p></article>)}</section>
  </main>;
}
