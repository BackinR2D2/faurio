import Link from "next/link";

export default function NotFoundPage() {
  return <main className="page-main studio-empty"><h1>Pagina nu mai este aici.</h1><p>Poți continua explorarea în catalog.</p><Link className="primary-button" href="/catalog">Vezi catalogul</Link></main>;
}
