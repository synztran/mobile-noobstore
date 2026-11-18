import CarriersForm from "@/components/fees/CarriersForm";
import FeesForm from "@/components/fees/FeesForm";
import ListHeader from "@/components/ui/ListHeader";
import { getAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Fees - NoobStore Admin",
};

const DEFAULT_FEES = {
  delivery_immediate_price: 80000,
  delivery_basic_price: 40000,
  insurance_fee: 10000,
  packing_fee: 15000,
  handling_fee: 20000,
  max_vouchers_per_order: 2,
};

type CarrierRow = {
  id: string;
  name: string | null;
  logo: string | null;
  tracking_url_template: string | null;
  is_active: boolean;
  sort_order: number;
};

export default async function FeesPage() {
  const supabase = getAdminClient();

  const [{ data }, { data: carrierRows, error: carriersError }] =
    await Promise.all([
      supabase
        .from("fees")
        .select(
          "delivery_immediate_price, delivery_basic_price, insurance_fee, packing_fee, handling_fee, max_vouchers_per_order",
        )
        .eq("id", 1)
        .maybeSingle(),
      supabase
        .from("carriers")
        .select("id, name, logo, tracking_url_template, is_active, sort_order")
        .order("sort_order", { ascending: true }),
    ]);

  const initial = data ?? DEFAULT_FEES;
  const carriers = (carrierRows ?? []) as CarrierRow[];

  return (
    <div className="space-y-6">
      <ListHeader
        title="Fees"
        subtitle="Configure delivery, carrier, insurance, packing, and handling fees"
      />
      <FeesForm initial={initial} />
      <CarriersForm initial={carriers} loadError={carriersError?.message ?? null} />
    </div>
  );
}
