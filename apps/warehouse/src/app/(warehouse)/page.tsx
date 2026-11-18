import Link from "next/link";
import { PackagePlus, Upload, Download, RefreshCw, Package, Link2, AlertTriangle, Clock3 } from "lucide-react";
import { requireWarehouseAdmin } from "@/lib/security/admin";
import { listWarehouseProducts, syncHistory } from "@/lib/warehouse/service";
import { CatalogClient } from "@/components/catalog/CatalogClient";
import type { WarehouseProduct, SyncEvent } from "@/modules/warehouse/types";

export const dynamic = "force-dynamic";

export default async function WarehouseCatalogPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const auth = await requireWarehouseAdmin();
  if (!auth.ok) return null;
  const { q = "" } = await searchParams;
  let products: WarehouseProduct[] = [];
  let history: SyncEvent[] = [];
  let unavailable = false;
  try {
    [products, history] = await Promise.all([listWarehouseProducts(auth.client, q), syncHistory(auth.client)]);
  } catch {
    unavailable = true;
  }
  const linked = products.filter((product) => product.admin_product_id).length;
  const needsSync = products.length - linked;
  const conflicts = history.filter((event) => event.outcome === "conflict").length;

  return (
    <main className="w-content">
      <div className="w-head">
        <div><div className="w-kicker">Warehouse / Staging catalog</div><h1 className="w-title">Product staging</h1><p className="w-sub">Prepare product data separately. Publish explicitly when it is ready.</p></div>
        <div className="w-actions"><Link className="w-btn" href="/import"><Upload size={16} /> Import / export</Link><Link className="w-btn w-btn-primary" href="/products/new"><PackagePlus size={16} /> New product</Link></div>
      </div>
      <div className="w-alert"><strong>Stock safety:</strong> this is a staging catalog. Only a new product’s initial quantity can be sent on first publish; Admin/storefront stock stays canonical afterward.</div>
      {unavailable && <div className="w-error" role="alert">Warehouse schema is not available in this Supabase project yet. Review/apply the warehouse migration in a safe test environment first; no product data was changed.</div>}
      <section className="w-grid-metrics" aria-label="Catalog summary">
        <Metric icon={<Package size={16} />} label="Staged products" value={products.length} />
        <Metric icon={<Link2 size={16} />} label="Linked to Admin" value={linked} />
        <Metric icon={<RefreshCw size={16} />} label="Not yet published" value={needsSync} />
        <Metric icon={<AlertTriangle size={16} />} label="Conflict events" value={conflicts} />
      </section>
      <CatalogClient products={products} query={q} />
      <section className="w-panel" style={{ marginTop: 18 }}><div className="w-inline" style={{ justifyContent: "space-between" }}><h2>Recent sync activity</h2><Link className="w-btn" href="/sync"><Clock3 size={15} /> View history</Link></div>{history.length ? <div className="w-table-wrap"><table className="w-table"><thead><tr><th>When</th><th>Direction</th><th>Product</th><th>Result</th><th>Message</th></tr></thead><tbody>{history.slice(0, 5).map((event) => <tr key={event.id}><td>{new Date(event.occurred_at).toLocaleString()}</td><td>{event.direction}</td><td>{products.find((product) => product.id === event.warehouse_product_id)?.name ?? event.admin_product_id ?? "Removed product"}</td><td><span className={`w-status w-status-${event.outcome}`}>{event.outcome}</span></td><td>{event.safe_message ?? "—"}</td></tr>)}</tbody></table></div> : <p className="w-small">No sync operations yet.</p>}</section>
    </main>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return <div className="w-card"><div className="w-inline w-metric-label">{icon}{label}</div><div className="w-metric-value">{value}</div></div>;
}
