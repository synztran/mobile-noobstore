"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { NewProductGuideModal } from "@/components/ui/guides";

type VariantDraft = { variant_name: string; price_adjustment: string; initial_stock: string };
const slugify = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/đ/g, "d").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export default function NewWarehouseProductPage() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [initialStock, setInitialStock] = useState("0");
  const [variants, setVariants] = useState<VariantDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  function addVariant() { setVariants((current) => [...current, { variant_name: "", price_adjustment: "0", initial_stock: "0" }]); }
  function updateVariant(index: number, field: keyof VariantDraft, value: string) { setVariants((current) => current.map((variant, i) => i === index ? { ...variant, [field]: value } : variant)); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(null);
    const payload = { product: { name, slug, product_type: "standard", base_price: Number(basePrice), max_quantity: null, is_active: false, brand: null, description: null, thumbnail: null, images: null, attributes: null, category_id: null, is_used: null, is_pre_order: false, initial_stock: Number(initialStock), variants: variants.map((variant) => ({ variant_name: variant.variant_name, price_adjustment: Number(variant.price_adjustment), initial_stock: Number(variant.initial_stock), attributes: null })) } };
    try {
      const response = await fetch("/api/warehouse/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Unable to create draft.");
      window.location.assign(`/products/${body.id}`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to create draft."); }
    finally { setSaving(false); }
  }
  return <main className="w-content"><div className="w-head"><div><div className="w-kicker">Warehouse / New draft</div><h1 className="w-title">Stage a product</h1><p className="w-sub">This creates a warehouse-only record; nothing reaches the storefront until you publish.</p></div><div className="w-actions"><NewProductGuideModal /><Link className="w-btn" href="/">Cancel</Link></div></div><form onSubmit={submit}><section className="w-panel"><h2>Product details</h2><div className="w-form-grid"><label className="w-field">Product name<input required maxLength={200} value={name} onChange={(event) => { setName(event.target.value); setSlug(slugify(event.target.value)); }} /></label><label className="w-field">Slug<input required pattern="[a-z0-9]+(-[a-z0-9]+)*" value={slug} onChange={(event) => setSlug(event.target.value)} /></label><label className="w-field">Base price (VND)<input required type="number" min="0" step="1" value={basePrice} onChange={(event) => setBasePrice(event.target.value)} /></label><label className="w-field">Initial stock (new product only)<input required type="number" min="0" step="1" value={initialStock} onChange={(event) => setInitialStock(event.target.value)} /><span className="w-small">Used only when first published without variants.</span></label></div></section><section className="w-panel"><div className="w-inline" style={{ justifyContent: "space-between" }}><h2>Variants</h2><button className="w-btn" type="button" onClick={addVariant}><Plus size={15} /> Add variant</button></div>{variants.length === 0 ? <p className="w-small">No variants. Add one if this product is sold in selectable options.</p> : variants.map((variant, index) => <div key={index} className="w-form-grid" style={{ padding: "12px 0", borderTop: "1px solid var(--line)" }}><label className="w-field">Variant name<input required maxLength={200} value={variant.variant_name} onChange={(event) => updateVariant(index, "variant_name", event.target.value)} /></label><label className="w-field">Price adjustment<input type="number" step="1" value={variant.price_adjustment} onChange={(event) => updateVariant(index, "price_adjustment", event.target.value)} /></label><label className="w-field">Initial quantity<input type="number" min="0" step="1" value={variant.initial_stock} onChange={(event) => updateVariant(index, "initial_stock", event.target.value)} /></label><div className="w-inline"><button className="w-btn" type="button" aria-label={`Remove ${variant.variant_name || "variant"}`} onClick={() => setVariants((current) => current.filter((_, i) => i !== index))}><Trash2 size={15} /> Remove</button></div></div>)}</section>{error && <div className="w-error" role="alert">{error}</div>}<button className="w-btn w-btn-primary" disabled={saving}>{saving ? "Saving draft…" : "Save warehouse draft"}</button></form></main>;
}
