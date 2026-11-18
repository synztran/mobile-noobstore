import { requireWarehouseAdmin } from "@/lib/security/admin";
import { listWarehouseProducts, syncHistory } from "@/lib/warehouse/service";
import { HistoryClient } from "@/components/sync/HistoryClient";
import { SyncHistoryGuideModal } from "@/components/ui/guides";
import type { WarehouseProduct, SyncEvent } from "@/modules/warehouse/types";

export const dynamic = "force-dynamic";

export default async function SyncHistoryPage() {
  const auth = await requireWarehouseAdmin();
  if (!auth.ok) return null;
  let events: SyncEvent[] = [];
  let products: WarehouseProduct[] = [];
  let unavailable = false;
  try { [events, products] = await Promise.all([syncHistory(auth.client), listWarehouseProducts(auth.client)]); }
  catch { unavailable = true; }
  return (
    <main className="w-content">
      <div className="w-head">
        <div>
          <div className="w-kicker">Warehouse / Audit trail</div>
          <h1 className="w-title">Sync history</h1>
          <p className="w-sub">Every publish, pull, conflict and failure is recorded per product.</p>
        </div>
        <div className="w-actions">
          <SyncHistoryGuideModal />
        </div>
      </div>
      {unavailable && <div className="w-error">Sync event tables are not available yet. No sync history could be loaded.</div>}
      <HistoryClient initialEvents={events} products={products} />
    </main>
  );
}
