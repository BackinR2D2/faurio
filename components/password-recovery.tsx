"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/components/auth-provider";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { authErrorMessage } from "@/lib/auth-errors";

export function PasswordRecovery() {
  const { user, loading } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (password !== confirmation) { setError("Parolele nu coincid."); return; }
    const client = getSupabaseBrowser();
    if (!user || !client) return;
    setBusy(true);
    try {
      const { error } = await client.auth.updateUser({ password });
      if (error) { setError(authErrorMessage(error)); return; }
      setPassword(""); setConfirmation(""); setDone(true);
      await client.auth.signOut();
    } catch { setError("Conexiunea a eșuat. Încearcă din nou."); }
    finally { setBusy(false); }
  }
  return <main className="page-main recovery-page"><section className="auth-card"><p className="eyebrow">Contul Faurio</p><h1>{done ? "Parolă actualizată." : "Alege o parolă nouă."}</h1>{loading ? <p role="status">Se verifică linkul…</p> : done ? <><p>Te poți autentifica folosind noua parolă.</p><Link className="primary-button" href="/cont">Autentificare</Link></> : !user ? <><p>Deschide cel mai recent link primit prin email. Dacă a expirat, solicită unul nou din pagina de autentificare.</p><Link className="primary-button" href="/cont">Solicită un link nou</Link></> : <form onSubmit={save}><label>Parolă nouă<input required type="password" autoComplete="new-password" minLength={8} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} /></label><label>Confirmă parola<input required type="password" autoComplete="new-password" minLength={8} maxLength={128} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="primary-button" disabled={busy}>{busy ? "Se salvează…" : "Salvează parola"}</button></form>}</section></main>;
}
