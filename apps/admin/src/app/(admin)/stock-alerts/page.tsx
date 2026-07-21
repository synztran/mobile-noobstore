import StockAlertsClient from "@/components/stock-alerts/StockAlertsClient";
import { Suspense } from "react";

export const metadata = { title: "Stock Alerts - NoobStore Admin" };

export default function StockAlertsPage() {
  return (
    <div className="space-y-6">
      <Suspense>
        <StockAlertsClient />
      </Suspense>
    </div>
  );
}
