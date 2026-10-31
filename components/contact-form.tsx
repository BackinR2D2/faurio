"use client";

import { useState } from "react";
import { Check, Send } from "lucide-react";

export function ContactForm() {
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form);
    try {
      const response = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json() as { error?: string; persisted?: boolean };
      if (!response.ok || !result.persisted) throw new Error(result.error || "Mesajul nu a putut fi înregistrat.");
      setSent(true);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Conexiunea nu este disponibilă. Încearcă din nou."); }
    finally { setSending(false); }
  }
  if (sent) return <div className="contact-success"><Check /><h2>Mesaj înregistrat.</h2><p>Echipa îl poate consulta în centrul de suport Faurio.</p><button onClick={() => setSent(false)}>Trimite alt mesaj</button></div>;
  return <form className="contact-form" onSubmit={submit}>
    <input name="website" type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" hidden />
    <label>Nume<input required name="name" autoComplete="name" minLength={2} maxLength={120} /></label>
    <label>Email<input required type="email" name="email" autoComplete="email" /></label>
    <label>Subiect<select name="subject"><option>Produs</option><option>Comandă și livrare</option><option>Retur</option><option>Colaborare</option></select></label>
    <label>Mesaj<textarea required rows={7} name="message" minLength={10} maxLength={4000} /></label>
    <label className="consent"><input required type="checkbox" /> Sunt de acord cu prelucrarea datelor.</label>
    {error && <span className="form-error">{error}</span>}
    <button className="primary-button" disabled={sending}>{sending ? "Se trimite…" : "Trimite"} <Send /></button>
  </form>;
}
