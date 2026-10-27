import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPost, posts } from "@/lib/blog";
export function generateStaticParams() { return posts.map((post) => ({ slug: post.slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> { const post = getPost((await params).slug); return post ? { title: post.title, description: post.excerpt } : {}; }
export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) { const post = getPost((await params).slug); if (!post) notFound(); return <main className="article-page"><header><p className="eyebrow">{post.category}</p><h1>{post.title}</h1><p>{post.intro}</p><span>{post.date} · {post.reading} de citit</span></header><img className="article-hero" src={post.image} alt="" /><article>{post.sections.map(([title, text]) => <section key={title}><h2>{title}</h2><p>{text}</p></section>)}<blockquote>Obiectele bune nu cer atenție prin zgomot. O câștigă prin felul în care sunt făcute și folosite.</blockquote><Link href="/blog">← Înapoi la jurnal</Link></article></main>; }
