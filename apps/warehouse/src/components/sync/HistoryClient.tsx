"use client";

import { useMemo, useState } from "react";
import type { SyncEvent, WarehouseProduct } from "@/modules/warehouse/types";

export function HistoryClient({ initialEvents, products }: { initialEvents: SyncEvent[]; products: WarehouseProduct[] }) {
  const [productId, setProductId] = useState("");
  const [direction, setDirection] = useState("");
  const [outcome, setOutcome] = useState("");
  const visible = useMemo(() => initialEvents.filter((event) => (!productId || event.warehouse_product_id === productId) && (!direction || event.direction === direction) && (!outcome || event.outcome === outcome)), [initialEvents, productId, direction, outcome]);
  return <section className="w-panel"><div className="w-toolbar"><select className="w-input" aria-label="Filter by product" value={productId} onChange={(event) => setProductId(event.target.value)}><option value="">All products</option>{products.map((product) => <option value={product.id} key={product.id}>{product.name}</option>)}</select><select className="w-input" aria-label="Filter by direction" value={direction} onChange={(event) => setDirection(event.target.value)}><option value="">All directions</option><option value="publish">Publish</option><option value="pull">Pull</option></select><select className="w-input" aria-label="Filter by outcome" value={outcome} onChange={(event) => setOutcome(event.target.value)}><option value="">All outcomes</option>{["created", "updated", "unchanged", "conflict", "failed"].map((value) => <option key={value} value={value}>{value}</option>)}</select></div><div className="w-table-wrap"><table className="w-table"><thead><tr><th>Timestamp</th><th>Product</th><th>Direction</th><th>Outcome</th><th>Actor</th><th>Details</th></tr></thead><tbody>{visible.map((event) => <tr key={event.id}><td>{new Date(event.occurred_at).toLocaleString()}</td><td>{products.find((product) => product.id === event.warehouse_product_id)?.name ?? event.admin_product_id ?? "Removed product"}</td><td>{event.direction}</td><td><span className={`w-status w-status-${event.outcome}`}>{event.outcome}</span></td><td>{event.actor_id}</td><td>{event.safe_message ?? "—"}</td></tr>)}</tbody></table>{visible.length === 0 && <div className="w-empty"><h2>No matching sync events</h2><p>Run a publish or pull from the catalog to create the first audit event.</p></div>}</div></section>;
}
