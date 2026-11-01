"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="page-main studio-empty"><h1>Pagina nu s-a încărcat.</h1><p>Reîncearcă sau revino la catalog.</p><button className="primary-button" onClick={reset}>Reîncearcă</button><Link className="reset-link" href="/catalog">Vezi catalogul</Link></main>;
}
