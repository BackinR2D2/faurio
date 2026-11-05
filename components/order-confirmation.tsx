import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check, FileText, ShoppingBag } from "lucide-react";
import { money } from "@/lib/catalog";

export type OrderReceipt = {
  code: string;
  total: number;
  invoiceUrl?: string;
  customer: { name: string };
};

export function OrderConfirmation({ receipt }: { receipt: OrderReceipt }) {
  const firstName = receipt.customer.name.trim().split(/\s+/)[0];

  return <main className="order-confirmation">
    <section className="confirmation-card" aria-labelledby="confirmation-title">
      <div className="confirmation-copy">
        <span className="confirmation-icon"><Check aria-hidden="true" /></span>
        <p className="confirmation-status">Plată confirmată</p>
        <h1 id="confirmation-title">Comanda este înregistrată.</h1>
        <p className="confirmation-lead">{firstName ? `Mulțumim, ${firstName}!` : "Mulțumim pentru comandă!"} Păstrează numărul comenzii pentru orice întrebare.</p>
        <div className="confirmation-actions">
          <Link className="primary-button" href="/cont/profil"><ShoppingBag aria-hidden="true" />Vezi comenzile</Link>
          <Link className="confirmation-catalog" href="/catalog">Înapoi la catalog<ArrowRight aria-hidden="true" /></Link>
        </div>
      </div>
      <aside className="confirmation-summary" aria-label="Rezumatul comenzii">
        <h2>Comanda ta</h2>
        <dl>
          <div><dt>Număr comandă</dt><dd className="confirmation-code">{receipt.code}</dd></div>
          <div className="confirmation-total"><dt>Total achitat</dt><dd>{money.format(receipt.total)}</dd></div>
        </dl>
        {receipt.invoiceUrl && <a className="confirmation-document" href={receipt.invoiceUrl} target="_blank" rel="noreferrer"><FileText aria-hidden="true" />Detalii plată<ArrowUpRight aria-hidden="true" /></a>}
        <p className="confirmation-test-note">Comandă de test. Nu s-au debitat bani reali.</p>
      </aside>
    </section>
    <p className="confirmation-help">Ai nevoie de ajutor? <Link href="/contact">Contactează-ne</Link></p>
  </main>;
}

export function OrderUnconfirmed() {
  return <main className="order-confirmation">
    <section className="confirmation-card confirmation-unconfirmed" aria-labelledby="confirmation-title">
      <span className="confirmation-icon"><ShoppingBag aria-hidden="true" /></span>
      <p className="confirmation-status">Plată neconfirmată</p>
      <h1 id="confirmation-title">Verifică starea comenzii.</h1>
      <p className="confirmation-lead">Nu putem confirma plata acum. Verifică comenzile înainte de a încerca din nou.</p>
      <div className="confirmation-actions">
        <Link className="primary-button" href="/cont/profil">Vezi comenzile<ArrowRight aria-hidden="true" /></Link>
        <Link className="confirmation-catalog" href="/checkout">Înapoi la comandă</Link>
      </div>
    </section>
    <p className="confirmation-help">Ai nevoie de ajutor? <Link href="/contact">Contactează-ne</Link></p>
  </main>;
}
