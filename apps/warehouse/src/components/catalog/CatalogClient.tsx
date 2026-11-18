"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, CloudDownload, RefreshCw, Search } from "lucide-react";
import type { WarehouseProduct } from "@/modules/warehouse/types";
import { CatalogGuideModal } from "@/components/ui/guides";

type Result = { id: string; outcome: string; message?: string; canonicalId?: string };

export function CatalogClient({ products, query }: { products: WarehouseProduct[]; query: string }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [filter, setFilter] = useState(query);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const visible = useMemo(() => products.filter((product) => `${product.name} ${product.slug}`.toLowerCase().includes(filter.toLowerCase())), [products, filter]);

  async function pullAll() {
    setLoading(true);
    setResults([]);
    try {
      const response = await fetch("/api/warehouse/sync/pull-all", {
        method: "POST",
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Pull all failed.");
      window.location.reload();
    } catch (error) {
      setResults([{ id: "all", outcome: "failed", message: error instanceof Error ? error.message : "Pull all failed." }]);
    } finally {
      setLoading(false);
    }
  }

  async function sync(action: "publish" | "pull", ids = selected) {
    if (!ids.length) return;
    setLoading(true);
    setResults([]);
    try {
      const response = await fetch("/api/warehouse/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ids }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Sync request failed.");
      setResults(payload.results ?? []);
      if ((payload.results ?? []).some((result: Result) => ["created", "updated"].includes(result.outcome))) window.location.reload();
    } catch (error) {
      setResults(ids.map((id) => ({ id, outcome: "failed", message: error instanceof Error ? error.message : "Sync failed." })));
    } finally {
      setLoading(false);
    }
  }

  function toggle(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  return <section className="w-panel">
    <div className="w-toolbar">
      <div className="w-inline">
        <Search size={16} color="#657772" />
        <input className="w-input" aria-label="Search staged products" placeholder="Search name or slug…" value={filter} onChange={(event) => setFilter(event.target.value)} />
      </div>
      <div className="w-actions">
        <CatalogGuideModal />
        <button
          className="w-btn"
          disabled={loading}
          onClick={() => void pullAll()}
          title="Kéo toàn bộ sản phẩm và biến thể từ Admin vào Warehouse"
        >
          <CloudDownload size={15} className={loading ? "animate-spin" : ""} /> Kéo toàn bộ từ Admin
        </button>
        <button className="w-btn" disabled={loading || selected.length === 0} onClick={() => sync("pull")}>
          <RefreshCw size={15} /> Pull Admin edits
        </button>
        <button className="w-btn w-btn-primary" disabled={loading || selected.length === 0} onClick={() => sync("publish")}>
          <ArrowUpRight size={15} /> Publish selected
        </button>
      </div>
    </div>
    {results.length > 0 && <div className="w-success" role="status">{results.map((result) => `${products.find((product) => product.id === result.id)?.name ?? result.id}: ${result.outcome}${result.message ? ` — ${result.message}` : ""}`).join(" · ")}</div>}
    <div className="w-table-wrap">
      <table className="w-table">
        <thead>
          <tr>
            <th><input aria-label="Select all visible products" type="checkbox" checked={visible.length > 0 && visible.every((product) => selected.includes(product.id))} onChange={(event) => setSelected(event.target.checked ? visible.map((product) => product.id) : selected.filter((id) => !visible.some((product) => product.id === id)))} /></th>
            <th>Product</th>
            <th>Variants</th>
            <th>Price</th>
            <th>Catalog state</th>
            <th>Updated</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((product) => (
            <tr key={product.id}>
              <td><input aria-label={`Select ${product.name}`} type="checkbox" checked={selected.includes(product.id)} onChange={() => toggle(product.id)} /></td>
              <td><Link href={`/products/${product.id}`} style={{ color: "inherit", textDecoration: "none", fontWeight: 700 }}>{product.name}</Link><div className="w-small">{product.slug}</div></td>
              <td>{product.variants.length ? `${product.variants.length} variants` : "No variants"}</td>
              <td>{product.base_price.toLocaleString("vi-VN")} ₫</td>
              <td><span className={`w-status ${product.admin_product_id ? "w-status-linked" : ""}`}>{product.admin_product_id ? "Linked" : "Staged"}</span></td>
              <td>{new Date(product.updated_at).toLocaleDateString()}</td>
              <td><div className="w-inline"><button className="w-btn" disabled={loading} onClick={() => sync(product.admin_product_id ? "pull" : "publish", [product.id])}>{product.admin_product_id ? "Pull" : "Publish"}</button><Link className="w-btn" href={`/products/${product.id}`}>Edit</Link></div></td>
            </tr>
          ))}
        </tbody>
      </table>
      {visible.length === 0 && (
        <div className="w-empty">
          <h2>{products.length ? "Không tìm thấy sản phẩm phù hợp" : "Chưa có sản phẩm nào trong Warehouse"}</h2>
          <p style={{ maxWidth: 500, margin: "0 auto 16px" }}>
            {products.length
              ? "Thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc."
              : "Nhấn nút bên dưới để đồng bộ và kéo toàn bộ danh mục sản phẩm từ Admin vào Warehouse."}
          </p>
          {!products.length ? (
            <button
              className="w-btn w-btn-primary"
              disabled={loading}
              onClick={() => void pullAll()}
            >
              <CloudDownload size={16} className={loading ? "animate-spin" : ""} /> {loading ? "Đang kéo từ Admin…" : "Kéo toàn bộ danh mục từ Admin"}
            </button>
          ) : (
            <Link className="w-btn w-btn-primary" href="/import">
              Mở trang nhập kho CSV
            </Link>
          )}
        </div>
      )}
    </div>
  </section>;
}
