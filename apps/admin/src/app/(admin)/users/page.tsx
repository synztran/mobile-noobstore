import { getAdminClient } from "@/lib/supabase/admin";
import EditUserModal from "@/components/users/EditUserModal";
import UsersExportWrapper from "@/components/users/UsersExportWrapper";
import Link from "next/link";

export const metadata = {
  title: "Users - NoobStore Admin",
};

const PAGE_SIZE = 20;

export default async function UsersPage(props: {
  searchParams: Promise<{ search?: string; role?: string; page?: string }>;
}) {
  const searchParams = await props.searchParams;
  const search = (searchParams.search ?? "").trim();
  const roleFilter = searchParams.role ?? "";
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);

  const supabase = getAdminClient();

  let query = supabase
    .from("users")
    .select(
      `
			id,
			email,
			first_name,
			last_name,
			phone_number,
			role,
			created_at,
			user_addresses(
				id,
				full_name,
				address,
				phone_number,
				city,
        ward,
				ward_code,
        district,
        district_code,
				is_default
			),
			wishlists(
				id,
				added_at,
				product:products(
					id,
					name,
					slug,
					thumbnail,
					base_price
				)
			)
			`,
      { count: "exact", head: false }
    )
    .neq("role", "admin")
    .order("created_at", { ascending: false });

  if (search) {
    query = query.or(
      `email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`
    );
  }

  if (roleFilter && roleFilter !== "all") {
    query = query.eq("role", roleFilter);
  }

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  query = query.range(from, to);

  const { data: users, error, count } = await query;

  if (error) {
    console.error("Error fetching users:", error);
  }

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <h1 className="mr-auto text-3xl font-bold text-slate-900">Users</h1>
        <UsersExportWrapper users={users ?? []} />
      </div>

      {/* Search & Filter */}
      <form
        method="GET"
        className="flex flex-wrap items-center gap-3"
      >
        <input
          name="search"
          type="text"
          placeholder="Tìm kiếm tên / email..."
          defaultValue={search}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
        <select
          name="role"
          defaultValue={roleFilter || "all"}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        >
          <option value="all">Tất cả</option>
          <option value="customer">Khách hàng</option>
          <option value="admin">Quản trị</option>
        </select>
        <button
          type="submit"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
        >
          Tìm kiếm
        </button>
        {(search || roleFilter) && (
          <Link
            href="/admin/users"
            className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-200"
          >
            Xoá bộ lọc
          </Link>
        )}
      </form>

      {/* Results summary */}
      <p className="text-sm text-slate-500">
        {count != null ? `${count.toLocaleString("vi-VN")} người dùng` : ""}
      </p>

      {/* Table */}
      <div className="overflow-hidden rounded-lg bg-white shadow">
        <table className="w-full">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                Info
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                Email
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                Phone
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                Role
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                Joined
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">

              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {users && users.length > 0 ? (
              users.map((user: any) => (
                <tr key={user.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">
                    <p className="text-slate-500">{user?.id}</p>
                    <p>
                      {`${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() ||
                        "Chưa thiết lập"}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {user.phone_number || "-"}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
                        user.role === "admin"
                          ? "bg-purple-100 text-purple-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {new Date(user.created_at).toLocaleDateString("vi-VN")}
                  </td>
                  <td className="space-x-2 px-6 py-4 text-sm">
                    <EditUserModal user={user} />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-8 text-center text-slate-500"
                >
                  {search || roleFilter
                    ? "Không tìm thấy người dùng phù hợp"
                    : "No users found"}
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
            href={`/admin/users?${new URLSearchParams({
              ...(search ? { search } : {}),
              ...(roleFilter ? { role: roleFilter } : {}),
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
            href={`/admin/users?${new URLSearchParams({
              ...(search ? { search } : {}),
              ...(roleFilter ? { role: roleFilter } : {}),
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
