import { getAdminClient } from "@/lib/supabase/admin";

export const metadata = {
	title: "Cart Monitoring - NoobStore Admin",
};

export default async function CartsPage() {
	const supabase = getAdminClient();

	const { data: carts, error } = await supabase
		.from("carts")
		.select(
			`
			id,
			user_id,
			users!carts_user_id_fkey (
				id,
				email,
				first_name,
				last_name,
				created_at
			),
			cart_items (
				id,
				quantity,
				products (
					id,
					name,
					base_price,
					thumbnail
				)
			)
		`,
		)
		.not("user_id", "is", null)
		.order("user_id");

	if (error) {
		console.error("Error fetching carts:", error);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold text-slate-900">
						Cart Monitoring
					</h1>
					<p className="mt-1 text-sm text-slate-500">
						Theo dõi giỏ hàng của người dùng
					</p>
				</div>
				<div className="rounded-lg bg-white px-4 py-2 shadow text-sm text-slate-600">
					{carts ? carts.length : 0} carts with items
				</div>
			</div>

			<div className="overflow-hidden rounded-lg bg-white shadow">
				<table className="w-full">
					<thead className="border-b border-slate-200 bg-slate-50">
						<tr>
							<th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
								User
							</th>
							<th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
								Email
							</th>
							<th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
								Items
							</th>
							<th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
								Products
							</th>
							<th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
								Cart ID
							</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-slate-200">
						{carts && carts.length > 0 ? (
							carts.map((cart: any) => {
								const user = cart.users;
								const items = cart.cart_items ?? [];
								const fullName =
									`${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim() ||
									"—";
								return (
									<tr key={cart.id} className="hover:bg-slate-50">
										<td className="px-6 py-4 text-sm font-medium text-slate-900">
											{fullName}
										</td>
										<td className="px-6 py-4 text-sm text-slate-600">
											{user?.email ?? "—"}
										</td>
										<td className="px-6 py-4 text-sm text-slate-900 font-medium">
											{items.length}
										</td>
										<td className="px-6 py-4 text-sm text-slate-600 max-w-xs">
											<div className="flex flex-wrap gap-1.5">
												{items.map((item: any) => (
													<span
														key={item.id}
														className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-700"
													>
														{item.products?.name ?? "Unknown"}
														{item.quantity > 1 && (
															<span className="font-semibold text-slate-400">
																x{item.quantity}
															</span>
														)}
													</span>
												))}
												{items.length === 0 && (
													<span className="text-xs text-slate-400">(empty)</span>
												)}
											</div>
										</td>
										<td className="px-6 py-4 text-sm text-slate-400 font-mono truncate max-w-[160px]">
											{cart.id.slice(0, 12)}...
										</td>
									</tr>
								);
							})
						) : (
							<tr>
								<td
									colSpan={5}
									className="px-6 py-8 text-center text-slate-500"
								>
									{carts
										? "No carts with items found"
										: "Error loading carts"}
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
}
