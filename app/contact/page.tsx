import type { Metadata } from "next";
import { Mail, MessageCircle } from "lucide-react";
import { ContactForm } from "@/components/contact-form";
export const metadata: Metadata = { title: "Contact" };
export default function ContactPage() {
  const support = process.env.SUPPORT_EMAIL;
  const email = support && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(support) ? support : null;
  return <main className="page-main contact-page"><section className="contact-intro"><p className="eyebrow">Suntem aici</p><h1>Ai o întrebare? Scrie-ne ca unui om.</h1><p>Despre produse, livrare, retur sau o posibilă colaborare.</p><div>{email && <span><Mail /><b><a href={`mailto:${email}`}>{email}</a></b><small>Contact suport</small></span>}<span><MessageCircle /><b>Scrie prin formular</b><small>Mesajul ajunge în centrul de suport.</small></span></div></section><section className="contact-form-wrap"><h2>Spune-ne ce ai nevoie</h2><ContactForm /></section></main>;
}
