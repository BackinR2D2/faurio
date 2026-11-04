import type { Metadata } from "next";
import { Mail, MessageCircle } from "lucide-react";
import { ContactForm } from "@/components/contact-form";
export const metadata: Metadata = { title: "Contact" };
export default function ContactPage() {
  const support = process.env.SUPPORT_EMAIL;
  const email = support && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(support) ? support : null;
  return <main className="page-main contact-page"><section className="contact-intro"><h1>Cum te putem ajuta?</h1><p>Întrebări despre produse, comenzi sau atelierul tău.</p><div>{email && <span><Mail /><b><a href={`mailto:${email}`}>{email}</a></b><small>Contact suport</small></span>}<span><MessageCircle /><b>Trimite un mesaj</b><small>Folosește formularul alăturat.</small></span></div></section><section className="contact-form-wrap"><h2>Contact</h2><ContactForm /></section></main>;
}
