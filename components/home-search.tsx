"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowRight, Search, Sparkles } from "lucide-react";

const ArtisanOrbit = dynamic(() => import("@/components/artisan-orbit").then((module) => module.ArtisanOrbit), { ssr: false });
const examples = ["Un cadou cald pentru o prietenă, sub 150 lei", "Ceva minimalist din ceramică pentru casă nouă", "Un obiect botanic, livrat în două zile"];

export function HomeSearch() {
  const router = useRouter();
  const rootRef = useRef<HTMLElement>(null);
  const [query, setQuery] = useState("");
  const [enable3d, setEnable3d] = useState(false);

  useEffect(() => {
    const media = matchMedia("(min-width: 850px) and (prefers-reduced-motion: no-preference)");
    const update = () => setEnable3d(media.matches);
    update(); media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useLayoutEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let context: { revert: () => void } | undefined;
    void import("gsap").then(({ gsap }) => {
      if (!rootRef.current) return;
      context = gsap.context(() => {
        const timeline = gsap.timeline({ defaults: { ease: "power3.out" } });
        timeline.from(".home-kicker", { y: 18, opacity: 0, duration: .55 })
          .from(".home-title span", { yPercent: 105, rotate: 2, duration: .9, stagger: .08 }, "-=.25")
          .from(".home-lead", { y: 18, opacity: 0, duration: .65 }, "-=.5")
          .from(".home-search-box", { y: 24, opacity: 0, scale: .98, duration: .75 }, "-=.45")
          .from(".home-example", { y: 10, opacity: 0, duration: .4, stagger: .07 }, "-=.35")
          .from(".home-art", { opacity: 0, scale: .82, rotate: 4, duration: 1.2 }, .15);
        gsap.to(".home-orbit-label", { y: -7, duration: 2.2, repeat: -1, yoyo: true, ease: "sine.inOut" });
      }, rootRef);
    });
    return () => context?.revert();
  }, []);

  const search = (event?: FormEvent, value?: string) => {
    event?.preventDefault();
    const text = (value ?? query).trim();
    if (!text) return;
    router.push(`/catalog?q=${encodeURIComponent(text)}`);
  };

  return <main className="home-main"><section ref={rootRef} className="home-hero">
    <div className="palette-wash wash-one" /><div className="palette-wash wash-two" />
    <div className="home-copy">
      <p className="home-kicker"><Sparkles /> Căutare intuitivă prin obiecte făcute de mână</p>
      <h1 className="home-title"><span>Spune-ne povestea.</span><span>Noi găsim obiectul.</span></h1>
      <p className="home-lead">Poți scrie exact cum ai spune unui prieten: pentru cine este, ce atmosferă vrei, bugetul și cât de repede ai nevoie.</p>
      <form className="home-search-box" onSubmit={search}>
        <Search />
        <textarea rows={2} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="De exemplu: caut un cadou delicat pentru sora mea, iubește plantele, buget 160 lei..." aria-label="Descrie în limbaj natural ce produs cauți" />
        <button aria-label="Găsește produsele potrivite"><ArrowRight /></button>
      </form>
      <div className="home-examples"><span>Încearcă o poveste</span>{examples.map((example) => <button className="home-example" key={example} onClick={() => { setQuery(example); search(undefined, example); }}>{example}</button>)}</div>
    </div>
    <div className="home-art">
      <div className="art-halo" />
      {enable3d ? <ArtisanOrbit /> : <div className="teapot-fallback" aria-hidden="true"><i /><b /><span /></div>}
      <div className="home-orbit-label label-one"><small>modelat</small><strong>01</strong></div>
      <div className="home-orbit-label label-two"><small>potrivit</small><strong>96%</strong></div>
      <p className="art-caption">Un ceainic imaginar construit în timp real · mișcă cursorul</p>
    </div>
  </section></main>;
}
