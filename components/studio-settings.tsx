"use client";

import { useState, type FormEvent } from "react";
import { useStudio } from "@/components/studio-shell";
import { studioRequest } from "@/lib/marketplace/client";

export function StudioSettings() {
  const { shop, token, refresh } = useStudio();
  const [confirmation, setConfirmation] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function close(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      await studioRequest("/api/shops", token, { method: "DELETE", body: JSON.stringify({ shopId: shop.id, confirmation }) });
      await refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Atelierul nu a putut fi închis."); setBusy(false); }
  }
  if (shop.role !== "owner" || shop.is_legacy || shop.status === "closed") return null;
  return <details className="studio-settings"><summary>Setările atelierului</summary><form onSubmit={close}><h2>Închide atelierul</h2><p>Pagina și produsele nu vor mai fi publice. Comenzile și istoricul plăților se păstrează. Comenzile și retururile deschise trebuie soluționate înainte.</p><label>Scrie <strong>{shop.slug}</strong> pentru confirmare<input aria-label="Confirmă adresa atelierului" required autoComplete="off" value={confirmation} onChange={event => setConfirmation(event.target.value)} /></label><label className="studio-check"><input type="checkbox" required checked={accepted} onChange={event => setAccepted(event.target.checked)} /><span>Înțeleg că atelierul nu va mai putea primi comenzi.</span></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="studio-danger" disabled={busy || !accepted || confirmation.trim() !== shop.slug}>{busy ? "Se închide…" : "Închide atelierul"}</button></form></details>;
}
