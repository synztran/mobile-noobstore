import { getAdminClient } from "@/lib/supabase/admin";
import RankFormModal from "@/components/ranks/RankFormModal";
import RankListClient from "@/components/ranks/RankListClient";

export const metadata = {
  title: "Customer Ranks - NoobStore Admin",
};

export default async function RanksPage() {
  const supabase = getAdminClient();
  const { data: ranks, error } = await supabase
    .from("customer_ranks")
    .select("*")
    .order("level", { ascending: true });

  if (error) {
    console.error("Error fetching ranks:", error);
  }

  const { data: userCounts } = await supabase
    .from("users")
    .select("rank_id, id")
    .not("rank_id", "is", null);

  const countByRankId: Record<string, number> = {};
  for (const u of userCounts ?? []) {
    countByRankId[u.rank_id!] = (countByRankId[u.rank_id!] ?? 0) + 1;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900">Customer Ranks</h1>
        <RankFormModal mode="create" />
      </div>

      <RankListClient
        ranks={(ranks ?? []) as any[]}
        countByRankId={countByRankId}
      />
    </div>
  );
}
