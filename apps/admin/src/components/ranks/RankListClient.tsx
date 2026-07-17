"use client";

import { formatVND } from "@/lib/currency";
import { useRouter } from "next/navigation";
import RankFormModal from "./RankFormModal";

type RankRow = {
  id: string;
  name: string;
  slug: string;
  level: number;
  min_total_spent: number;
  min_order_count: number;
  benefits: any;
  color: string;
  icon_url: string | null;
  icon_label: string | null;
  is_active: boolean;
};

type Props = {
  ranks: RankRow[];
  countByRankId: Record<string, number>;
};

export default function RankListClient({ ranks, countByRankId }: Props) {
  const router = useRouter();

  const handleDeactivate = async (rank: RankRow) => {
    if (!confirm(`Deactivate rank "${rank.name}"?`)) return;
    const res = await fetch(`/api/ranks/${rank.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      alert(data?.error ?? "Failed to deactivate rank");
      return;
    }
    router.refresh();
  };

  return (
    <div className="space-y-4">
      {ranks.length === 0 ? (
        <div className="rounded-lg bg-white p-8 text-center text-slate-500">
          No ranks created yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <table className="w-full">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Rank</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Level</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Thresholds</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Benefits</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Users</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {ranks.map((rank) => {
                const b = rank.benefits ?? {};
                return (
                  <tr key={rank.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {rank.icon_url ? (
                          <img
                            src={rank.icon_url}
                            alt={rank.name}
                            className="h-9 w-9 flex-shrink-0 rounded-full object-cover"
                          />
                        ) : (
                          <div
                            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-black text-white"
                            style={{ backgroundColor: rank.color }}
                          >
                            {rank.icon_label ?? rank.name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{rank.name}</p>
                          <p className="text-xs text-slate-500">{rank.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{rank.level}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      <p>{formatVND(rank.min_total_spent)}</p>
                      <p className="text-xs text-slate-400">{rank.min_order_count} đơn</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        <BenefitChip
                          label={`${b.points_multiplier ?? 1}x`}
                          enabled={b.flags?.points_multiplier_enabled}
                          title="Points multiplier"
                        />
                        <BenefitChip
                          label={`${b.discount_percent ?? 0}%`}
                          enabled={b.flags?.discount_percent_enabled}
                          title="Discount percent"
                        />
                        <BenefitChip
                          label="Ship"
                          enabled={b.flags?.free_shipping_enabled && b.free_shipping}
                          title="Free shipping"
                        />
                        <BenefitChip
                          label="Support"
                          enabled={b.flags?.priority_support_enabled && b.priority_support}
                          title="Priority support"
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {countByRankId[rank.id] ?? 0}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          rank.is_active
                            ? "bg-green-100 text-green-800"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {rank.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="space-x-2 px-6 py-4">
                      <RankFormModal mode="update" rank={rank} />
                      {rank.is_active && (
                        <button
                          type="button"
                          onClick={() => handleDeactivate(rank)}
                          className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-100"
                        >
                          Deactivate
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function BenefitChip({ label, enabled, title }: { label: string; enabled?: boolean; title?: string }) {
  return (
    <span
      title={title}
      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
        enabled
          ? "bg-blue-100 text-blue-700"
          : "bg-slate-100 text-slate-400 line-through"
      }`}
    >
      {label}
    </span>
  );
}
