import type { Metadata } from "next";
import { Clock, Mail, MapPin, MessageCircle } from "lucide-react";
import { ContactForm } from "@/components/contact-form";
export const metadata: Metadata = { title: "Contact" };
export default function ContactPage() { return <main className="page-main contact-page"><section className="contact-intro"><p className="eyebrow">Suntem aici</p><h1>Ai o întrebare? Scrie-ne ca unui om.</h1><p>Îți răspundem clar despre produse, livrare, retur sau o posibilă colaborare.</p><div><span><Mail /><b>hello@firdepoveste.ro</b><small>adresă demonstrativă</small></span><span><Clock /><b>Luni–Vineri</b><small>09:00–17:00</small></span><span><MapPin /><b>Cluj-Napoca</b><small>magazin online</small></span><span><MessageCircle /><b>Răspuns în 1 zi</b><small>în zilele lucrătoare</small></span></div></section><section className="contact-form-wrap"><h2>Spune-ne ce ai nevoie</h2><ContactForm /></section></main>; }
