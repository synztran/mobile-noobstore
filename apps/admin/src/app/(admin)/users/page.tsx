import { getAdminClient } from "@/lib/supabase/admin";
import EditUserModal from "@/components/users/EditUserModal";

export const metadata = {
	title: "Users - NoobStore Admin",
};

export default async function UsersPage() {
	const supabase = getAdminClient();

	const { data: users, error } = await supabase
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
				ward_district,
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
		)
		.neq("role", "admin")
		.order("created_at", { ascending: false })
		.limit(50);

	if (error) {
		console.error("Error fetching users:", error);
	}

	return (
		<div className="space-y-6">
			<h1 className="text-3xl font-bold text-slate-900">Users</h1>

			<div className="bg-white rounded-lg shadow overflow-hidden">
				<table className="w-full">
					<thead className="bg-slate-50 border-b border-slate-200">
						<tr>
							<th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
								Name
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
								Actions
							</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-slate-200">
						{users && users.length > 0 ? (
							users.map((user: any) => (
								<tr key={user.id} className="hover:bg-slate-50">
									<td className="px-6 py-4 text-sm text-slate-900 font-medium">
										{`${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() ||
											"Unknown"}
									</td>
									<td className="px-6 py-4 text-sm text-slate-600">
										{user.email}
									</td>
									<td className="px-6 py-4 text-sm text-slate-600">
										{user.phone_number || "-"}
									</td>
									<td className="px-6 py-4 text-sm">
										<span
											className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${
												user.role === "admin"
													? "bg-purple-100 text-purple-800"
													: "bg-gray-100 text-gray-800"
											}`}>
											{user.role}
										</span>
									</td>
									<td className="px-6 py-4 text-sm text-slate-600">
										{new Date(
											user.created_at,
										).toLocaleDateString("vi-VN")}
									</td>
									<td className="px-6 py-4 text-sm space-x-2">
										<EditUserModal user={user} />
									</td>
								</tr>
							))
						) : (
							<tr>
								<td
									colSpan={6}
									className="px-6 py-8 text-center text-slate-500">
									No users found
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
}
