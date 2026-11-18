"use client";

import { useCallback, useEffect, useState } from "react";
import { Minus, Plus, RefreshCw } from "lucide-react";

type Variant = { id: string; variant_name: string; stock_quantity: number | null };

/** Live inventory is deliberately separate from editable catalog drafts. */
export function VariantStockControls({ productId }: { productId: string }) {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const endpoint = `/api/warehouse/products/${encodeURIComponent(productId)}/stock`;
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(endpoint, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Unable to load live stock.");
      setVariants(body.variants);
      return true;
    } catch (cause) {
      setVariants([]);
      setError(cause instanceof Error ? cause.message : "Unable to load live stock.");
      return false;
    } finally { setLoading(false); }
  }, [endpoint]);
  useEffect(() => { void load(); }, [load]);

  async function adjust(variant: Variant, delta: number) {
    if (busy || !reason.trim()) return;
    setBusy(true); setError(null); setNotice(null);
    try {
      const response = await fetch(endpoint, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId: variant.id, expected: variant.stock_quantity, delta, reason }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error ?? "Adjustment failed.");
      setNotice(body?.warning ?? "Live stock updated and adjustment recorded.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to confirm adjustment. Refresh before retrying.");
    } finally { await load(); setBusy(false); }
  }

  return <section className="w-panel">
    <div className="w-inline"><h2>Live variant stock</h2><button type="button" className="w-btn" disabled={busy || loading} onClick={() => { setError(null); void load(); }}><RefreshCw size={15} /> Refresh</button></div>
    <p className="w-small">Existing linked variants only. These controls change sellable stock immediately, not draft initial quantities. Every change is audited.</p>
    <label className="w-field">Adjustment reason<input className="w-input" value={reason} maxLength={300} disabled={busy} onChange={(event) => setReason(event.target.value)} placeholder="e.g. Physical count correction" /></label>
    {loading ? <div className="w-skeleton" aria-label="Loading live stock" /> : variants.length ? <div className="w-table-wrap"><table className="w-table"><thead><tr><th>Variant</th><th>Live quantity</th><th>Adjust</th></tr></thead><tbody>{variants.map((variant) => <tr key={variant.id}><td>{variant.variant_name}</td><td>{variant.stock_quantity ?? "Not tracked"}</td><td><div className="w-actions"><button type="button" className="w-btn" aria-label={`Decrease ${variant.variant_name} stock by 1`} disabled={busy || !reason.trim() || variant.stock_quantity === null || variant.stock_quantity <= 0} onClick={() => void adjust(variant, -1)}><Minus size={15} /> 1</button><button type="button" className="w-btn" aria-label={`Increase ${variant.variant_name} stock by 1`} disabled={busy || !reason.trim() || variant.stock_quantity === null} onClick={() => void adjust(variant, 1)}><Plus size={15} /> 1</button></div></td></tr>)}</tbody></table></div> : <p className="w-small">No existing linked variants available.</p>}
    {error && <div className="w-error" role="alert">{error}</div>}
    {notice && <div className="w-success" role="status">{notice}</div>}
  </section>;
}
