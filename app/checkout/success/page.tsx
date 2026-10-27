import Link from "next/link";
import { CircleCheck } from "lucide-react";
export default function StripeSuccessPage() { return <main className="page-main order-success"><CircleCheck /><p className="eyebrow">Confirmare Stripe test</p><h1>Plata a fost autorizată.</h1><p>Stripe a întors confirmarea către magazin. Pentru producție, un webhook Stripe ar actualiza automat comanda și stocul.</p><Link className="primary-button" href="/cont/profil">Vezi contul meu</Link><Link href="/catalog">Continuă cumpărăturile</Link></main>; }
