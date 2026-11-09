"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";

export function AccountDeletion({ onDeleting }: { onDeleting: () => void }) {
  const { accessToken, signOut } = useAuth();
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (pending || confirmation !== "STERGE" || !password) return;
    setPending(true); setError("");
    try {
      const response = await fetch("/api/account", {
        method: "DELETE", headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ confirmation, password }),
      });
      const result = await response.json();
      setPassword("");
      if (!response.ok || !result.deleted) throw new Error(result.error || "Contul nu a putut fi șters. Încearcă din nou.");
      onDeleting();
      await signOut();
      router.replace("/cont?deleted=1");
      router.refresh();
    } catch (caught) { setPassword(""); setError(caught instanceof Error ? caught.message : "Contul nu a putut fi șters. Încearcă din nou."); }
    finally { setPending(false); }
  };
  return <section className="account-deletion" aria-labelledby="delete-account-heading">
    <h2 id="delete-account-heading">Șterge contul</h2>
    <p>Ștergi definitiv contul, profilul, favoritele și recenziile. Comenzile și documentele de plată rămân în evidențele platformei. Acțiunea nu poate fi anulată.</p>
    {!expanded ? <button type="button" className="account-delete-button" onClick={() => setExpanded(true)}>Șterge contul meu</button> : <form onSubmit={submit} aria-label="Confirmă ștergerea contului" aria-busy={pending}>
      <label>Parola contului<input type="password" autoComplete="current-password" required maxLength={1024} value={password} disabled={pending} onChange={event => setPassword(event.target.value)} /></label>
      <label>Scrie STERGE pentru confirmare<input autoComplete="off" spellCheck={false} required value={confirmation} disabled={pending} onChange={event => setConfirmation(event.target.value)} /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="account-delete-actions"><button type="submit" className="account-delete-button" disabled={pending || !password || confirmation !== "STERGE"}>{pending ? "Se șterge…" : "Șterge definitiv contul"}</button><button type="button" className="reset-link" disabled={pending} onClick={() => { setExpanded(false); setPassword(""); setConfirmation(""); setError(""); }}>Renunță</button></div>
    </form>}
  </section>;
}
