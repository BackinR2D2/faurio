"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useRef, useState, useTransition } from "react";
import { ArrowRight, LoaderCircle, Search } from "lucide-react";

const ArtisanOrbit = dynamic(() => import("@/components/artisan-orbit").then((module) => module.ArtisanOrbit), { ssr: false });
const examples = ["Cadou cald pentru o prietenă, sub 150 lei", "Ceramică minimalistă pentru casă nouă", "Obiect botanic, livrat rapid"];

function resizeSearchField(field: HTMLTextAreaElement) {
  field.style.height = "0px";
  const style = getComputedStyle(field);
  const singleLine = parseFloat(style.lineHeight) + parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
  field.style.height = `${Math.min(Math.max(field.scrollHeight, singleLine), 160)}px`;
}

export function HomeSearch() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const searchField = useRef<HTMLTextAreaElement>(null);
  const [loadScene, setLoadScene] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const [sceneFailed, setSceneFailed] = useState(false);
  const [interactive, setInteractive] = useState(false);
  const onSceneReady = useCallback(() => setSceneReady(true), []);
  const onSceneUnavailable = useCallback(() => setSceneFailed(true), []);
  const onSceneLoading = useCallback(() => { setSceneReady(false); setSceneFailed(false); }, []);
  useEffect(() => {
    const field = searchField.current;
    if (!field) return;
    resizeSearchField(field);
  }, [query]);
  useEffect(() => {
    queueMicrotask(() => setInteractive(true));
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (matchMedia("(max-width: 800px)").matches || connection?.saveData) return;
    if ("requestIdleCallback" in window) {
      const handle = window.requestIdleCallback(() => setLoadScene(true), { timeout: 1800 });
      return () => window.cancelIdleCallback(handle);
    }
    const handle = setTimeout(() => setLoadScene(true), 600);
    return () => clearTimeout(handle);
  }, []);

  const search = (event?: FormEvent, value?: string) => {
    event?.preventDefault();
    const text = (value ?? query).trim();
    if (!text || pending) return;
    startTransition(() => router.push(`/catalog?q=${encodeURIComponent(text)}`));
  };

  return <main className="home-main"><section className={`home-hero${loadScene ? " is-3d-requested" : ""}`}>
    <div className="palette-wash wash-one" /><div className="palette-wash wash-two" />
    <div className="home-copy">
      <h1 className="home-title">Ce cauți <span>astăzi?</span></h1>
      <p className="home-lead">Descrie persoana, ocazia sau starea. Noi găsim piesele potrivite.</p>
      <form className="home-search-box" action="/catalog" method="get" onSubmit={search} aria-busy={pending}>
        <Search />
        <textarea ref={searchField} name="q" rows={1} maxLength={1200} value={query} onChange={(event) => { setQuery(event.target.value); resizeSearchField(event.currentTarget); }} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); search(); } }} placeholder="Un cadou delicat pentru sora mea, iubește plantele, buget 160 lei…" aria-label="Descrie în limbaj natural ce produs cauți" />
        <button aria-label="Găsește produsele potrivite" disabled={pending}>{pending ? <LoaderCircle className="search-spinner" /> : <ArrowRight />}</button>
      </form>
      <div className="home-examples">{examples.map((example) => <button className="home-example" key={example} onClick={() => { setQuery(example); search(undefined, example); }}>{example}</button>)}</div>
      <div className="home-scene-action">{!loadScene && <button type="button" disabled={!interactive} onClick={() => setLoadScene(true)}>Explorează obiectul în 3D <ArrowRight size={14} /></button>}{sceneFailed && <span>Previzualizarea statică rămâne disponibilă pe acest dispozitiv.</span>}</div>
    </div>
    <div className="home-art">
      <div className="art-halo" />
      <div className={`home-art-fallback${sceneReady ? " is-ready" : ""}`} aria-hidden={sceneReady}><Image src="/models/hero-fallback.png" alt="Vază ceramică pictată — previzualizare a unei piese de atelier" fill sizes="(max-width: 800px) 360px, 50vw" priority fetchPriority="high" /></div>
      {loadScene && <ArtisanOrbit onReady={onSceneReady} onUnavailable={onSceneUnavailable} onLoading={onSceneLoading} />}
    </div>
  </section></main>;
}
