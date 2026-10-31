import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import type { Product } from "@/lib/catalog";
import type { ShopLayout } from "@/lib/marketplace/contracts";

type Props = { layout: ShopLayout; name: string; location: string; country: string; products: Product[]; total: number; preview?: boolean };

export function MakerStorefront({ layout, name, location, country, products, total, preview = false }: Props) {
  return <div className={`maker-storefront theme-${layout.theme} font-${layout.font}`} data-testid="maker-storefront">
    {layout.blocks.filter((block) => block.visible).map((block) => {
      switch (block.type) {
        case "hero": return <section key={block.type} className="maker-hero">
          <div className="maker-hero-copy"><p className="maker-eyebrow">Un atelier. O perspectivă.</p><h1>{layout.title}</h1><p className="maker-subtitle">{layout.subtitle}</p><span className="maker-location"><MapPin size={15} />{location || country}</span><a className="maker-discover" href={preview ? undefined : "#piese"}>Descoperă piesele <ArrowUpRight size={18} /></a></div>
          <div className="maker-cover"><Image src={layout.cover} alt={`Compoziție de atelier — ${name}`} fill sizes="(max-width: 700px) 100vw, 50vw" priority={!preview} /><span className="maker-cover-note">Făcut cu timp. Păstrat cu drag.</span></div>
        </section>;
        case "products": return <section id={preview ? undefined : "piese"} key={block.type} className="maker-section"><div className="maker-section-heading"><div><p className="maker-eyebrow">Colecția atelierului</p><h2>Obiecte cu semnătură.</h2></div><span>{total} {total === 1 ? "piesă" : "piese"}</span></div>{products.length ? <div className="product-grid">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <div className="maker-empty">{preview ? "Produsele tale vor apărea aici după ce le adaugi în Studio." : "Atelierul își pregătește următoarea colecție."}</div>}</section>;
        case "story": return layout.story ? <section key={block.type} className="maker-story-block maker-section"><p className="maker-eyebrow">Mâinile din spatele obiectelor</p><h2>Povestea noastră.</h2><div className="maker-story-text">{layout.story}</div></section> : null;
        case "gallery": return layout.gallery.length ? <section key={block.type} className="maker-section"><p className="maker-eyebrow">Din universul atelierului</p><div className="maker-gallery">{layout.gallery.map((src, index) => <div key={`${src}-${index}`}><Image src={src} alt={`Compoziție artizanală ${index + 1}`} fill sizes="(max-width: 700px) 100vw, 33vw" /></div>)}</div></section> : null;
        case "faq": return layout.faq.length ? <section key={block.type} className="maker-section maker-faq"><p className="maker-eyebrow">Înainte să alegi</p><h2>Întrebări firești.</h2>{layout.faq.map((faq, index) => <details key={index}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}</section> : null;
        case "announcement": return layout.announcement ? <aside key={block.type} className="maker-announcement"><p className="maker-eyebrow">O notă din atelier</p><p>{layout.announcement}</p></aside> : null;
      }
    })}
    {!preview && <div className="maker-end"><span>{name} · {country}</span><Link href="/makers">Alte ateliere <ArrowUpRight size={16} /></Link></div>}
  </div>;
}
