"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Eye, EyeOff, LockKeyhole } from "lucide-react";
import { useAuth } from "@/components/auth-provider";

type View = "login" | "signup" | "reset";

function nextPage() {
  const next = new URLSearchParams(window.location.search).get("next");
  if (!next || !/^\/(?:studio(?:\/[^?#]*)?|sell)(?:\?[^#]*)?$/.test(next)) return "/cont/profil";
  return next;
}

export function AccountEntry() {
  const router = useRouter();
  const { user, loading, mode, signIn, signUp, resetPassword, resendConfirmation } = useAuth();
  const [view, setView] = useState<View>("login");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [canResend, setCanResend] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  useEffect(() => {
    if (!loading && user) router.replace(nextPage());
  }, [loading, router, user]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const result = view === "signup" ? await signUp(form.name, form.email, form.password) : view === "login" ? await signIn(form.email, form.password) : await resetPassword(form.email);
    setBusy(false);
    if (result.error) {
      if (result.needsConfirmation) setCanResend(true);
      setError(result.error);
      return;
    }
    if (view === "reset") {
      setMessage("Dacă există un cont pentru această adresă, vei primi un link securizat de resetare.");
      return;
    }
    if (result.needsConfirmation) {
      setCanResend(true);
      setMessage("Verifică emailul, apoi revino pentru autentificare.");
      return;
    }
    router.push(nextPage());
  };

  return <main className="auth-page">
    <section className="auth-visual"><div className="auth-vessel"><i /><b /><span /></div><p>Obiecte păstrate.<br />Comenzi urmărite.</p></section>
    <section className="auth-panel"><div className="auth-card">
      <p className="eyebrow"><LockKeyhole /> Contul tău</p>
      <h1>{view === "signup" ? "Creează cont" : view === "reset" ? "Resetează parola" : "Bine ai revenit"}</h1>
      <p>{view === "signup" ? "Un singur loc pentru comenzi și favorite." : view === "reset" ? "Introdu emailul asociat contului." : "Continuă de unde ai rămas."}</p>
      <form onSubmit={submit}>
        {view === "signup" && <label>Nume<input required autoComplete="name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>}
        <label>Email<input required type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
        {view !== "reset" && <label>Parolă<span className="password-input"><input required minLength={8} type={showPassword ? "text" : "password"} autoComplete={view === "login" ? "current-password" : "new-password"} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label="Arată parola">{showPassword ? <EyeOff /> : <Eye />}</button></span></label>}
        {error && <p className="form-error">{error}</p>}
        {message && <p className="form-success">{message}</p>}
        <button className="primary-button" disabled={busy}>{busy ? "Se verifică…" : <>{view === "signup" ? "Creează cont" : view === "reset" ? "Trimite linkul" : "Intră în cont"}<ArrowRight /></>}</button>
      </form>
      {canResend && <button className="auth-link" disabled={busy} onClick={async () => { setBusy(true); setError(""); const result = await resendConfirmation(form.email); setBusy(false); if (result.error) setError(result.error); else setMessage("Am solicitat un nou email de confirmare. Verifică și folderul spam."); }}>Retrimite confirmarea</button>}
      {view === "login" && <button className="auth-link" onClick={() => setView("reset")}>Ai uitat parola?</button>}
      <div className="auth-switch">{view === "signup" ? "Ai deja cont?" : "Nu ai cont?"}<button onClick={() => { setError(""); setMessage(""); setView(view === "signup" ? "login" : "signup"); }}>{view === "signup" ? "Autentifică-te" : "Creează unul"}</button></div>
      {mode === "unconfigured" && <small className="local-mode">Autentificarea necesită configurarea Supabase.</small>}
      <small className="account-terms">Continuând, accepți <Link href="/termeni">termenii</Link> și <Link href="/confidentialitate">politica de confidențialitate</Link>.</small>
    </div></section>
  </main>;
}
