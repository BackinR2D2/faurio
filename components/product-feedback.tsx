"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, MessageSquare, RotateCw, ShieldCheck, Star } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { studioRequest } from "@/lib/marketplace/client";
import type { ReviewEligibility, ReviewPage } from "@/lib/reviews";
import { ReviewAuthor } from "@/components/review-author";

const date = (value: string) => new Intl.DateTimeFormat("ro-RO", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Bucharest" }).format(new Date(value));

export function ProductFeedback({ productId, initial }: { productId: string; initial: ReviewPage }) {
  const { user, loading, accessToken } = useAuth();
  return <ProductFeedbackContent key={`${productId}:${user?.id || "guest"}`} productId={productId} initial={initial} authenticated={Boolean(user)} loading={loading} accessToken={accessToken} />;
}

function ProductFeedbackContent({ productId, initial, authenticated, loading, accessToken }: { productId: string; initial: ReviewPage; authenticated: boolean; loading: boolean; accessToken: string | null }) {
  const router = useRouter();
  const [reviews, setReviews] = useState(initial);
  const [eligibility, setEligibility] = useState<ReviewEligibility | null>(null);
  const [eligibilityError, setEligibilityError] = useState("");
  const [eligibilityRevision, setEligibilityRevision] = useState(0);
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const submitting = useRef(false);
  const reader = useRef<AbortController | null>(null);
  useEffect(() => () => reader.current?.abort(), []);
  useEffect(() => {
    const controller = new AbortController();
    if (accessToken) void studioRequest<ReviewEligibility>(`/api/reviews?${new URLSearchParams({ productId, mode: "eligibility" })}`, accessToken, { signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) { setEligibilityError(""); setEligibility(data); } })
      .catch(() => { if (!controller.signal.aborted) setEligibilityError("Nu am putut verifica achizițiile tale."); });
    return () => controller.abort();
  }, [accessToken, productId, eligibilityRevision]);
  async function readPage(page: number) {
    reader.current?.abort();
    const controller = new AbortController(); reader.current = controller;
    setReading(true); setError("");
    try {
      const response = await fetch(`/api/reviews?${new URLSearchParams({ productId, page: String(page) })}`, { signal: controller.signal, cache: "no-store" });
      if (!response.ok) throw new Error();
      const data = await response.json() as ReviewPage;
      if (!controller.signal.aborted) setReviews(data);
    } catch { if (!controller.signal.aborted) setError("Recenziile nu au putut fi încărcate. Reîncearcă."); }
    finally { if (!controller.signal.aborted) setReading(false); }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || !accessToken || !rating || !eligibility || eligibility.hasReview || eligibility.ownProduct) return;
    submitting.current = true; setBusy(true); setError("");
    try {
      await studioRequest("/api/reviews", accessToken, { method: "POST", body: JSON.stringify({ productId, rating, body: body.trim() }) });
      setSubmitted(true); setDeleted(false); setBody(""); setEligibilityRevision(value => value + 1);
    } catch (caught) { setError((caught as Error).message); }
    finally { submitting.current = false; setBusy(false); }
  }
  async function removeReview() {
    if (submitting.current || !accessToken || !eligibility?.ownReview) return;
    submitting.current = true; setBusy(true); setError("");
    try {
      await studioRequest("/api/reviews", accessToken, { method: "DELETE", body: JSON.stringify({ id: eligibility.ownReview.id }) });
      setConfirmDelete(false); setSubmitted(false); setDeleted(true); setRating(0); setBody(""); setEligibility(null);
      setEligibilityRevision(value => value + 1);
      await readPage(reviews.page); router.refresh();
    } catch (caught) { setError((caught as Error).message); }
    finally { submitting.current = false; setBusy(false); }
  }
  return <section id="recenzii" className="product-feedback" aria-labelledby="product-feedback-title">
    <header className="feedback-heading"><div><h2 id="product-feedback-title">Recenzii și comentarii</h2><p>Experiențe ale cumpărătorilor.</p></div><div className="feedback-heading-actions">{reviews.available && reviews.total > 0 && <div className="feedback-score"><strong>{reviews.rating.toLocaleString("ro-RO", { maximumFractionDigits: 1 })}<span> / 5</span></strong><span className="feedback-stars" aria-label={`${reviews.rating} din 5 stele`}>{[1, 2, 3, 4, 5].map(value => <Star key={value} aria-hidden="true" fill={value <= Math.round(reviews.rating) ? "currentColor" : "none"} size={16} />)}</span><span>{reviews.total} {reviews.total === 1 ? "recenzie" : "recenzii"}</span></div>}<button className="feedback-refresh" aria-label="Actualizează recenziile" title="Actualizează recenziile" disabled={reading} onClick={() => readPage(reviews.page)}><RotateCw size={18} /></button></div></header>
    <div className="feedback-layout">
      <div className="feedback-list" aria-busy={reading}>
        {!reviews.available ? <div className="feedback-empty"><MessageSquare /><h3>Recenzii indisponibile momentan</h3><button className="text-button" onClick={() => readPage(1)} disabled={reading}>Reîncearcă</button></div>
          : reviews.total === 0 ? <div className="feedback-empty"><MessageSquare /><h3>Încă nicio recenzie</h3><p>Fii primul care își spune părerea.</p></div>
          : <>{reviews.reviews.map(review => <article className="feedback-review" key={review.id}><div className="feedback-review-top"><ReviewAuthor author={review.author} /><time dateTime={review.created_at}>{date(review.created_at)}</time></div><span className="feedback-stars" aria-label={`${review.rating} din 5 stele`}>{[1, 2, 3, 4, 5].map(value => <Star key={value} aria-hidden="true" fill={value <= review.rating ? "currentColor" : "none"} size={16} />)}</span><p>{review.body}</p>{review.verified_purchase && <span className="feedback-verified"><ShieldCheck size={14} /> Achiziție verificată</span>}</article>)}
            {reviews.pageCount > 1 && <nav className="feedback-pagination" aria-label="Pagini recenzii"><button aria-label="Recenzii anterioare" disabled={reading || reviews.page <= 1} onClick={() => readPage(reviews.page - 1)}><ChevronLeft size={18} /></button><span>{reviews.page} / {reviews.pageCount}</span><button aria-label="Recenzii următoare" disabled={reading || reviews.page >= reviews.pageCount} onClick={() => readPage(reviews.page + 1)}><ChevronRight size={18} /></button></nav>}</>}
      </div>
      <div className="feedback-compose"><h3>{eligibility?.ownReview ? "Recenzia ta" : "Scrie o recenzie"}</h3>
        {deleted && <p role="status">Recenzia a fost ștearsă.</p>}
        {submitted && <p className="feedback-success" role="status"><Check size={18} /> Recenzia și comentariul au fost trimise la moderare. Mulțumim!</p>}
        {loading ? <p role="status">Se verifică sesiunea…</p> : !authenticated ? <><p>Intră în cont pentru a lăsa o recenzie.</p><Link className="studio-secondary" href={`/cont?next=${encodeURIComponent(`/produs/${productId}#recenzii`)}`}>Autentifică-te</Link></>
          : eligibilityError ? <><p role="alert">{eligibilityError}</p><button className="text-button" onClick={() => { setEligibilityError(""); setEligibility(null); setEligibilityRevision(value => value + 1); }}>Reîncearcă verificarea</button></>
          : eligibility?.ownReview ? <div className="feedback-own-review"><span className="feedback-stars" aria-label={`${eligibility.ownReview.rating} din 5 stele`}>{[1, 2, 3, 4, 5].map(value => <Star key={value} aria-hidden="true" fill={value <= eligibility.ownReview!.rating ? "currentColor" : "none"} size={16} />)}</span><p>{eligibility.ownReview.body}</p><p>{({ pending: "În curs de moderare", approved: "Publicată", rejected: "Nepublicată" })[eligibility.ownReview.status]}</p>
            {confirmDelete ? <div className="feedback-delete-confirm"><p>Ștergi definitiv recenzia?</p><div><button className="studio-secondary" disabled={busy} onClick={() => setConfirmDelete(false)}>Anulează</button><button className="studio-secondary" disabled={busy} onClick={removeReview}>{busy ? "Se șterge…" : "Confirmă ștergerea"}</button></div></div> : <button className="studio-text-button" disabled={busy} onClick={() => setConfirmDelete(true)}>Șterge recenzia</button>}
          </div>
          : submitted ? null
          : !eligibility ? <p role="status">Se verifică achizițiile…</p>
          : eligibility.ownProduct ? <p>Nu poți recenza produsele propriului atelier.</p>
          : eligibility.hasReview ? <p>Ai trimis deja o recenzie. Recenziile aprobate apar aici după moderare.</p>
          : <form className="feedback-form" onSubmit={submit}>
            {eligibility.verifiedPurchase && <span className="feedback-verified"><ShieldCheck size={14} /> Achiziție verificată</span>}
            <fieldset disabled={busy}><legend>Evaluarea ta</legend><div className="feedback-rating-input">{[1, 2, 3, 4, 5].map(value => <label key={value} title={`${value} / 5`}><input type="radio" name={`rating-${productId}`} value={value} checked={rating === value} onChange={() => setRating(value)} required aria-label={`${value} ${value === 1 ? "stea" : "stele"}`} /><Star aria-hidden="true" fill={value <= rating ? "currentColor" : "none"} size={26} /></label>)}</div></fieldset>
            <label>Comentariul tău<textarea value={body} onChange={event => setBody(event.target.value)} minLength={5} maxLength={2000} rows={5} required disabled={busy} placeholder="Ce ți-a plăcut la produs?" /></label>
            <span className="feedback-form-note">Recenzia va fi publicată după moderare.</span><button className="primary-button" disabled={busy || rating === 0 || body.trim().length < 5}>{busy ? "Se trimite…" : "Trimite recenzia"}</button>
          </form>}
      </div>
    </div>
    {error && <p className="form-error" role="alert">{error}</p>}
  </section>;
}
