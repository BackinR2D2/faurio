import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Heart, PackageCheck, ShieldCheck, Sparkles } from "lucide-react";
import { chatGPTSignInPath, getChatGPTUser } from "@/app/chatgpt-auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Creează cont" };
export default async function AccountPage() {
  const user = await getChatGPTUser();
  if (user) redirect("/cont/profil");
  const signIn = chatGPTSignInPath("/cont/profil");
  return <main className="account-entry"><section className="account-entry-art"><div className="account-art-object"><i /><b /><span /></div><p>Un loc al tău pentru obiecte cu poveste.</p></section><section className="account-entry-copy"><p className="eyebrow"><Sparkles /> Cont Fir de Poveste</p><h1>Cumpărături mai simple, fără încă o parolă.</h1><p>Contul este creat prin autentificarea securizată a platformei. După primul pas îți completezi profilul de livrare și preferințele.</p><div className="account-benefits"><span><PackageCheck /><b>Comenzi la un loc</b><small>facturi, plăți și status</small></span><span><Heart /><b>Favorite sincronizate</b><small>revii rapid la ce îți place</small></span><span><ShieldCheck /><b>Identitate protejată</b><small>nu stocăm o parolă separată</small></span></div><a className="primary-button account-create" href={signIn} target="_top">Creează cont / Autentifică-te</a><small className="account-terms">Continuând, accepți <Link href="/termeni">termenii</Link> și <Link href="/confidentialitate">politica de confidențialitate</Link>.</small><ol className="account-flow"><li><b>1</b><span><strong>Autentificare securizată</strong><small>confirmi identitatea la nivelul platformei</small></span></li><li><b>2</b><span><strong>Profil de cumpărător</strong><small>adaugi telefonul și adresa implicită</small></span></li><li><b>3</b><span><strong>Prima comandă</strong><small>checkout-ul preia automat datele salvate</small></span></li></ol></section></main>;
}
