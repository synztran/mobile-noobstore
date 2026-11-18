"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, Save, ShieldAlert, Upload } from "lucide-react";
import type { WarehouseProduct } from "@/modules/warehouse/types";
import { VariantStockControls } from "@/modules/warehouse/VariantStockControls";
import { ProductDetailGuideModal } from "@/components/ui/guides";

type SyncResult = { outcome: string; message?: string };
type LiveVariant = { id: string; variant_name: string; stock_quantity: number | null };

export default function WarehouseProductPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string | null>(null);
  const [product, setProduct] = useState<WarehouseProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [liveVariants, setLiveVariants] = useState<LiveVariant[]>([]);
  useEffect(() => { void params.then(({ id: productId }) => setId(productId)); }, [params]);

  const loadLiveStock = useCallback(async (productId: string) => {
    try {
      const res = await fetch(`/api/warehouse/products/${encodeURIComponent(productId)}/stock`, { cache: "no-store" });
      if (!res.ok) return;
      const body = await res.json();
      if (Array.isArray(body.variants)) setLiveVariants(body.variants);
    } catch { /* non-fatal — live stock shown in VariantStockControls */ }
  }, []);
  useEffect(() => {
    if (!id) return;
    void fetch(`/api/warehouse/products/${encodeURIComponent(id)}`).then(async (response) => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Unable to load product.");
      setProduct(body);
      if (body.admin_product_id) void loadLiveStock(id);
    }).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Unable to load product.")).finally(() => setLoading(false));
  }, [id, loadLiveStock]);

  function inputFor(productToSave: WarehouseProduct) {
    const { id: _id, sync_baseline: _baseline, admin_version: _version, local_revision: _revision, created_at: _created, updated_at: _updated, ...body } = productToSave;
    return body;
  }

  async function save() {
    if (!product || !id) return;
    setSaving(true); setError(null); setNotice(null);
    try {
      const { admin_product_id: _adminProductId, initial_stock: _initialStock, ...body } = inputFor(product);
      const response = await fetch(`/api/warehouse/products/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, local_revision: product.local_revision }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to save product.");
      const latest = await fetch(`/api/warehouse/products/${encodeURIComponent(id)}`).then((res) => res.json());
      if (latest?.id) setProduct(latest);
      setNotice("Warehouse draft saved. Admin/storefront was not changed.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save product."); }
    finally { setSaving(false); }
  }

  async function sync(action: "publish" | "pull" | "resolve-admin" | "resolve-warehouse") {
    if (!id || !product) return;
    setSaving(true); setError(null); setNotice(null);
    try {
      const response = await fetch("/api/warehouse/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ids: [id], product: inputFor(product) }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Sync failed.");
      const result = body.results?.[0] as SyncResult | undefined;
      setNotice(`${result?.outcome ?? "Sync complete"}${result?.message ? `: ${result.message}` : ""}`);
      const latest = await fetch(`/api/warehouse/products/${encodeURIComponent(id)}`).then((res) => res.json());
      if (latest?.id) setProduct(latest);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Sync failed."); }
    finally { setSaving(false); }
  }

  if (loading) return <main className="w-content"><div className="w-kicker">Warehouse / Product</div><h1 className="w-title">Loading product…</h1><div className="w-skeleton" /></main>;
  if (!product) return <main className="w-content"><div className="w-error">{error ?? "Product not found."}</div><Link href="/" className="w-btn"><ArrowLeft size={15} /> Back to catalog</Link></main>;

  return <main className="w-content"><div className="w-head"><div><div className="w-kicker">Warehouse / Product draft</div><h1 className="w-title">{product.name}</h1><p className="w-sub">{product.admin_product_id ? `Linked Admin product ${product.admin_product_id}` : "Not published to Admin yet"}</p></div><div className="w-actions"><ProductDetailGuideModal /><Link className="w-btn" href="/"><ArrowLeft size={15} /> Catalog</Link><button className="w-btn" disabled={saving} onClick={() => void save()}><Save size={15} /> Save draft</button><button className="w-btn" disabled={saving || !product.admin_product_id} onClick={() => void sync("pull")}><RefreshCw size={15} /> Pull Admin</button><button className="w-btn w-btn-primary" disabled={saving} onClick={() => void sync("publish")}><Upload size={15} /> {product.admin_product_id ? "Publish edits" : "Publish new"}</button></div></div>
    <div className="w-alert"><strong>Inventory is not mirrored.</strong> Initial quantity can be sent only on first publish. Subsequent edits and pulls do not change Admin stock. Use live variant stock controls for existing linked variants.</div>
    {product.admin_product_id && <VariantStockControls productId={product.id} />}
    {product.sync_baseline && <section className="w-panel"><div className="w-inline"><ShieldAlert size={17} color="#b7791f" /><div><strong>Sync baseline exists</strong><p className="w-small">If both Admin and warehouse changed since the last sync, the sync log records a conflict and does not silently overwrite it.</p></div></div><div className="w-actions" style={{ marginTop: 14 }}><button className="w-btn" disabled={saving} onClick={() => void sync("resolve-admin")}>Accept Admin version</button><button className="w-btn" disabled={saving} onClick={() => void sync("resolve-warehouse")}>Keep warehouse version and publish</button></div></section>}
    <section className="w-panel"><h2>Product fields</h2><div className="w-form-grid"><Field label="Name" value={product.name} onChange={(value) => setProduct({ ...product, name: value })} /><Field label="Slug" value={product.slug} onChange={(value) => setProduct({ ...product, slug: value })} /><Field label="Base price (VND)" value={String(product.base_price)} type="number" onChange={(value) => setProduct({ ...product, base_price: Number(value) })} /><Field label="Max per order" value={product.max_quantity === null ? "" : String(product.max_quantity)} type="number" onChange={(value) => setProduct({ ...product, max_quantity: value ? Number(value) : null })} /><Field label="Brand" value={product.brand ?? ""} onChange={(value) => setProduct({ ...product, brand: value || null })} /><Field label="Thumbnail URL" value={product.thumbnail ?? ""} onChange={(value) => setProduct({ ...product, thumbnail: value || null })} /><label className="w-field">Description<textarea value={product.description ?? ""} onChange={(event) => setProduct({ ...product, description: event.target.value || null })} /></label><label className="w-field">Attributes JSON<textarea value={product.attributes === null ? "" : JSON.stringify(product.attributes, null, 2)} onChange={(event) => { try { setProduct({ ...product, attributes: event.target.value ? JSON.parse(event.target.value) : null }); } catch { /* keep last valid JSON until the user finishes typing */ } }} /></label></div></section>
    <section className="w-panel">
      <div className="w-inline" style={{ justifyContent: "space-between" }}>
        <h2>Variants ({product.variants.length})</h2>
        <span className="w-small" style={{ color: "var(--muted)" }}>
          Chỉnh sửa tên &amp; chênh lệch giá nháp → nhấn <strong>Save draft</strong> → <strong>Publish edits</strong> để đẩy lên Storefront
        </span>
      </div>
      {product.variants.length ? (
        <div className="w-table-wrap">
          <table className="w-table">
            <thead>
              <tr>
                <th>Variant</th>
                <th>Price adjustment</th>
                <th>{product.admin_product_id ? "Tồn kho thực tế (Admin)" : "Initial qty. (new product only)"}</th>
                <th>Admin link</th>
              </tr>
            </thead>
            <tbody>
              {product.variants.map((variant, index) => {
                const live = liveVariants.find((v) => v.id === variant.admin_variant_id);
                return (
                  <tr key={`${variant.variant_name}-${index}`}>
                    <td>
                      <input className="w-input" value={variant.variant_name}
                        onChange={(event) => setProduct({ ...product, variants: product.variants.map((item, i) => i === index ? { ...item, variant_name: event.target.value } : item) })} />
                    </td>
                    <td>
                      <input className="w-input" type="number" value={variant.price_adjustment ?? 0}
                        onChange={(event) => setProduct({ ...product, variants: product.variants.map((item, i) => i === index ? { ...item, price_adjustment: Number(event.target.value) } : item) })} />
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {product.admin_product_id
                        ? live
                          ? live.stock_quantity ?? "Not tracked"
                          : <span className="w-small" style={{ color: "var(--muted)" }}>—</span>
                        : variant.initial_stock}
                    </td>
                    <td>{variant.admin_variant_id ? <span className="w-status w-status-linked">Linked</span> : <span className="w-status">New</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {product.admin_product_id && (
            <p className="w-small" style={{ marginTop: 8 }}>
              Tồn kho lấy từ Admin (cột số thực tế). Dùng section <strong>Live variant stock</strong> ở trên để điều chỉnh ±1.
            </p>
          )}
        </div>
      ) : (
        <p className="w-small">No selectable variants. Base initial stock is {product.initial_stock}; it is sent only when publishing this new product.</p>
      )}
    </section>
    {error && <div className="w-error" role="alert">{error}</div>}{notice && <div className="w-success" role="status">{notice}</div>}
  </main>;
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; type?: string; onChange: (value: string) => void }) {
  return <label className="w-field">{label}<input type={type} value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}
