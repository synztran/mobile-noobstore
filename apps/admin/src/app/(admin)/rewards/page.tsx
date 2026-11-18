import { getAdminClient } from "@/lib/supabase/admin";
import CreateRewardModal from "@/components/rewards/CreateRewardModal";
import UpdateRewardModal from "@/components/rewards/UpdateRewardModal";

export const metadata = {
  title: "Phần thưởng - NoobStore Admin",
};

function formatPoints(value: number) {
  return value.toLocaleString("vi-VN") + " điểm";
}

function getTypeLabel(type: string) {
  const labels: Record<string, string> = {
    voucher: "Voucher",
    product: "Sản phẩm",
    point: "Điểm thưởng",
  };
  return labels[type] ?? type;
}

export default async function RewardsPage() {
  const supabase = getAdminClient();

  const { data: rewards, error } = await (supabase as any)
    .from("reward_items")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900 ">
          Phần thưởng
        </h1>
        <CreateRewardModal />
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Lỗi tải dữ liệu: {error.message}
        </div>
      )}

      <div className="overflow-hidden rounded-lg bg-white shadow ">
        <table className="w-full">
          <thead className="border-b border-slate-200 bg-slate-50  ">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 ">
                Tên
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 ">
                Loại
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 ">
                Chi phí điểm
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 ">
                Kho
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 ">
                Đã đổi
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 ">
                Trạng thái
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 ">
                Ngày tạo
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 ">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 ">
            {rewards && rewards.length > 0 ? (
              rewards.map((reward: any) => (
                <tr
                  key={reward.id}
                  className="hover:bg-slate-50 "
                >
                  <td className="px-6 py-4 text-sm font-semibold text-slate-900 ">
                    {reward.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 ">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        reward.reward_type === "voucher"
                          ? "bg-blue-100 text-blue-800"
                          : reward.reward_type === "product"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {getTypeLabel(reward.reward_type)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-mono font-semibold text-slate-900 ">
                    {formatPoints(reward.points_cost)} <span className="font-sans text-xs text-slate-500">{reward.points_currency === "daily_checkin" ? "Chuyên cần" : "NSP"}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 ">
                    {reward.stock != null ? reward.stock : "∞"}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 ">
                    {reward.claimed_count}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        reward.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {reward.is_active ? "Hoạt động" : "Tắt"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500 ">
                    {new Date(reward.created_at).toLocaleDateString("vi-VN")}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <UpdateRewardModal reward={reward} />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={8}
                  className="px-6 py-8 text-center text-slate-500"
                >
                  {error ? "Lỗi tải dữ liệu" : "Chưa có phần thưởng nào"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
