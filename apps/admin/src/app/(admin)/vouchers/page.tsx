import { getAdminClient } from "@/lib/supabase/admin";
import CreateVoucherModal from "@/components/vouchers/CreateVoucherModal";
import InactivateVoucherModal from "@/components/vouchers/InactivateVoucherModal";
import UpdateVoucherModal from "@/components/vouchers/UpdateVoucherModal";

export const metadata = {
	title: "Vouchers - Huy Store Admin",
};

export default async function VouchersPage() {
	const supabase = getAdminClient();

	const { data: vouchers, error } = await supabase
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
		)
		.order("created_at", { ascending: false })
		.order("id", { ascending: false })
		.limit(50);

	if (error) {
		console.error("Error fetching vouchers:", error);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-3xl font-bold text-slate-900">Vouchers</h1>
				<CreateVoucherModal />
			</div>

			<div className="bg-white rounded-lg shadow overflow-hidden">
				<table className="w-full">
					<thead className="bg-slate-50 border-b border-slate-200">
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
									className="hover:bg-slate-50">
									<td className="px-6 py-4 text-sm font-mono font-semibold text-slate-900">
										{voucher.code}
									</td>
									<td className="px-6 py-4 text-sm text-slate-600">
										{voucher.name}
									</td>
									<td className="px-6 py-4 text-sm text-slate-600">
										{voucher.reward_type === "percent_off"
											? `${voucher.percent_off}%`
											: voucher.reward_type ===
												  "amount_off"
												? `${(voucher.amount_off ?? 0).toLocaleString("vi-VN")}₫`
												: voucher.reward_type}
									</td>
									<td className="px-6 py-4 text-sm text-slate-600">
										{voucher.used_count || 0} /{" "}
										{voucher.usage_limit_total ?? "∞"}
									</td>
									<td className="px-6 py-4 text-sm">
										<span
											className={`px-3 py-1 rounded-full text-xs font-medium ${
												voucher.status === "active"
													? "bg-green-100 text-green-800"
													: voucher.status ===
														  "expired"
														? "bg-red-100 text-red-800"
														: "bg-gray-100 text-gray-800"
											}`}>
											{voucher.status}
										</span>
									</td>
									<td className="px-6 py-4 text-sm text-slate-600">
										{new Date(
											voucher.created_at,
										).toLocaleDateString("vi-VN")}
									</td>
									<td className="px-6 py-4 text-sm space-x-2">
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
									className="px-6 py-8 text-center text-slate-500">
									No vouchers found
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
}
