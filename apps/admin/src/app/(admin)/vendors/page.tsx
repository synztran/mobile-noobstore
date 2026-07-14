import { getAdminClient } from "@/lib/supabase/admin";
import VendorsClient from "./VendorsClient";

export const metadata = {
  title: "Vendors - NoobStore Admin",
};

export default async function VendorsPage() {
  const supabase = getAdminClient();

  const { data: vendors } = await supabase
    .from("vendors")
    .select("*")
    .order("name", { ascending: true });

  return (
    <div className="space-y-6">
      <VendorsClient vendors={vendors ?? []} />
    </div>
  );
}
