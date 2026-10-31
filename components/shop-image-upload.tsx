"use client";

import { useState } from "react";
import { useStudio } from "@/components/studio-shell";

export function ShopImageUpload({ onUpload, label = "Încarcă fotografia ta" }: { onUpload: (src: string) => void; label?: string }) {
  const { shop, token } = useStudio(); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  return <div className="shop-upload"><label>{busy ? "Se optimizează fotografia…" : label}<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={busy} onChange={async (event) => {
    const input = event.currentTarget; const file = input.files?.[0]; if (!file) return;
    setError(""); if (file.size > 5 * 1024 * 1024) { setError("Maximum 5 MB."); return; }
    setBusy(true);
    try {
      const response = await fetch(`/api/studio/media?shop=${shop.id}`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": file.type || "application/octet-stream" }, body: file });
      const body = await response.json() as { src?: string; error?: string };
      if (!response.ok || !body.src) throw new Error(body.error || "Încărcarea a eșuat.");
      onUpload(body.src);
    } catch (caught) { setError((caught as Error).message); } finally { setBusy(false); input.value = ""; }
  }} /></label><small>Fotografiile încărcate au adrese publice. Folosește doar imagini proprii, fără date personale. Eliminăm metadatele și optimizăm dimensiunea.</small>{error && <p className="form-error" role="alert">{error}</p>}</div>;
}
