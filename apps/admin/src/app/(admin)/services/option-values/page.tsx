import { getAdminClient } from "@/lib/supabase/admin";

export const metadata = {
	title: "Service Option Values - Huy Store Admin",
};

export default async function ServiceOptionValuesPage() {
	const supabase = getAdminClient();

	const { data: values, error } = await supabase
		.from("service_option_values")
		.select(
			`
			id,
			label,
			price_adjustment,
			display_order,
			service_options(
				id,
				label,
				services(id, name)
			)
		`,
		)
		.order("display_order", { ascending: true });

	if (error) {
		console.error("Error fetching service option values:", error);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-3xl font-bold text-slate-900">
					Service Option Values
				</h1>
				<span className="text-sm text-slate-500">
					{values?.length ?? 0} value(s)
				</span>
			</div>

			{error && (
				<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
					Failed to load service option values.
				</div>
			)}

			<div className="bg-white rounded-lg shadow overflow-hidden">
				<table className="w-full">
					<thead className="bg-slate-50 border-b border-slate-200">
						<tr>
							<th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
								Value
							</th>
							<th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
								Option
							</th>
							<th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
								Service
							</th>
							<th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
								Price Adjustment
							</th>
							<th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
								Order
							</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-slate-200">
						{values && values.length > 0 ? (
							values.map((val) => {
								const option = val.service_options as {
									label: string;
									services: { name: string } | null;
								} | null;
								return (
									<tr
										key={val.id}
										className="hover:bg-slate-50">
										<td className="px-6 py-4 text-sm font-medium text-slate-900">
											{val.label}
										</td>
										<td className="px-6 py-4 text-sm text-slate-600">
											{option?.label ?? "—"}
										</td>
										<td className="px-6 py-4 text-sm text-slate-600">
											{option?.services?.name ?? "—"}
										</td>
										<td className="px-6 py-4 text-sm font-medium">
											{val.price_adjustment === 0 ? (
												<span className="text-slate-400">
													—
												</span>
											) : (
												<span
													className={
														val.price_adjustment > 0
															? "text-green-600"
															: "text-red-600"
													}>
													{val.price_adjustment > 0
														? "+"
														: ""}
													{val.price_adjustment.toLocaleString(
														"vi-VN",
													)}
													₫
												</span>
											)}
										</td>
										<td className="px-6 py-4 text-sm text-slate-600">
											{val.display_order}
										</td>
									</tr>
								);
							})
						) : (
							<tr>
								<td
									colSpan={5}
									className="px-6 py-8 text-center text-slate-500">
									No service option values found
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
}
