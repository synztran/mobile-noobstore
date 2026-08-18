import { getAdminClient } from "@/lib/supabase/admin";
import CreateVoucherModal from "@/components/vouchers/CreateVoucherModal";
import InactivateVoucherModal from "@/components/vouchers/InactivateVoucherModal";
import UpdateVoucherModal from "@/components/vouchers/UpdateVoucherModal";
import Link from "next/link";

export const metadata = {
  title: "Vouchers - NoobStore Admin",
};

const PAGE_SIZE = 20;

export default async function VouchersPage(props: {
  searchParams: Promise<{ search?: string; status?: string; page?: string }>;
}) {
  const searchParams = await props.searchParams;
  const search = (searchParams.search ?? "").trim();
  const statusFilter = searchParams.status ?? "";
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);

  const supabase = getAdminClient();

  let query = supabase
    .from("vouchers")
    .select(
      `
			id,
			name,
			code,
			description,
			reward_type,
			percent_off,
			amount_off,
			usage_limit_total,
			usage_limit_per_user,
			min_order_amount,
			stackable,
			scope_type,
			applies_to_product_ids,
			applies_to_category_slugs,
			excluded_product_ids,
			applies_to_shipping_methods,
			customer_ids,
			start_at,
			end_at,
			used_count,
			status,
			created_at,
			created_by,
			creator:users!vouchers_created_by_fkey(
				id,
				email,
				first_name,
				last_name
			),
			applied_orders:orders!orders_voucher_id_fkey(
				id,
				order_number,
				status,
				total_price,
				created_at,
				user_id,
				customer:users!orders_user_id_fkey(
					id,
					email,
					first_name,
					last_name
				)
			)
			`,
      { count: "exact", head: false }
    )
    .order("status", { ascending: true })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (search) {
    query = query.or(
      `code.ilike.%${search}%,name.ilike.%${search}%`
    );
  }

  if (statusFilter && statusFilter !== "all") {
    query = query.eq("status", statusFilter as any);
  }

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  query = query.range(from, to);

  const { data: vouchers, error, count } = await query;

  if (error) {
    console.error("Error fetching vouchers:", error);
  }

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900">Vouchers</h1>
        <CreateVoucherModal />
      </div>

      {/* Search & Filter */}
      <form
        method="GET"
        className="flex flex-wrap items-center gap-3"
      >
        <input
          name="search"
          type="text"
          placeholder="Tìm kiếm mã / tên..."
          defaultValue={search}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
        <select
          name="status"
          defaultValue={statusFilter || "all"}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        >
          <option value="all">Tất cả</option>
          <option value="active">Active</option>
          <option value="disabled">Disabled</option>
          <option value="expired">Expired</option>
        </select>
        <button
          type="submit"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
        >
          Tìm kiếm
        </button>
        {(search || statusFilter) && (
          <Link
            href="/admin/vouchers"
            className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-200"
          >
            Xoá bộ lọc
          </Link>
        )}
      </form>

      {/* Results summary */}
      <p className="text-sm text-slate-500">
        {count != null ? `${count.toLocaleString("vi-VN")} voucher` : ""}
      </p>

      <div className="overflow-hidden rounded-lg bg-white shadow">
        <table className="w-full">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                Code
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                Name
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                Discount
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                Usage
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                Status
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                Created
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {vouchers && vouchers.length > 0 ? (
              vouchers.map((voucher: any) => (
                <tr
                  key={voucher.id}
                  className="hover:bg-slate-50"
                >
                  <td className="px-6 py-4 text-sm font-mono font-semibold text-slate-900">
                    {voucher.code}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {voucher.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {voucher.reward_type === "percent_off"
                      ? `${voucher.percent_off}%`
                      : voucher.reward_type === "amount_off"
                        ? `${(voucher.amount_off ?? 0).toLocaleString("vi-VN")}₫`
                        : voucher.reward_type}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {voucher.used_count || 0} /{" "}
                    {voucher.usage_limit_total ?? "∞"}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        voucher.status === "active"
                          ? "bg-green-100 text-green-800"
                          : voucher.status === "expired"
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {voucher.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {new Date(voucher.created_at).toLocaleDateString("vi-VN")}
                  </td>
                  <td className="space-x-2 px-6 py-4 text-sm">
                    <UpdateVoucherModal voucher={voucher} />
                    <InactivateVoucherModal
                      voucherId={voucher.id}
                      voucherCode={voucher.code}
                      currentStatus={voucher.status}
                    />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={7}
                  className="px-6 py-8 text-center text-slate-500"
                >
                  {search || statusFilter
                    ? "Không tìm thấy voucher phù hợp"
                    : "No vouchers found"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <Link
            href={`/admin/vouchers?${new URLSearchParams({
              ...(search ? { search } : {}),
              ...(statusFilter ? { status: statusFilter } : {}),
              page: String(page - 1),
            }).toString()}`}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${
              page <= 1
                ? "pointer-events-none text-slate-300"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            ‹ Trước
          </Link>
          <span className="text-sm text-slate-500">
            Trang {page} / {totalPages}
          </span>
          <Link
            href={`/admin/vouchers?${new URLSearchParams({
              ...(search ? { search } : {}),
              ...(statusFilter ? { status: statusFilter } : {}),
              page: String(page + 1),
            }).toString()}`}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${
              page >= totalPages
                ? "pointer-events-none text-slate-300"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            Sau ›
          </Link>
        </div>
      )}
    </div>
  );
}
