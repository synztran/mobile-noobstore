import FeesForm from "@/components/fees/FeesForm";
import { getAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function FeesPage() {
  const supabase = getAdminClient();

  const { data } = await supabase
    .from("fees")
    .select("delivery_immediate_price, delivery_basic_price, insurance_fee, packing_fee, handling_fee, max_vouchers_per_order")
    .eq("id", 1)
    .maybeSingle();

  const initial = data ?? {
    delivery_immediate_price: 80000,
    delivery_basic_price: 40000,
    insurance_fee: 10000,
    packing_fee: 15000,
    handling_fee: 20000,
    max_vouchers_per_order: 2,
  };

  return (
    <div>
      <div className="mb-6">
        <p className="text-2xl font-bold text-slate-800">Fees Configuration</p>
        <p className="text-sm text-slate-500">
          Manage delivery, insurance, packing, and handling fees
        </p>
      </div>

      <div className="rounded-xl bg-white p-6 shadow">
        <FeesForm initial={initial} />
      </div>
    </div>
  );
}
