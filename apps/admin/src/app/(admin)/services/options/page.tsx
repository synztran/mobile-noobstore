import { getAdminClient } from "@/lib/supabase/admin";

export const metadata = {
	title: "Service Options - NoobStore Admin",
};

export default async function ServiceOptionsPage() {
	const supabase = getAdminClient();

	const { data: options, error } = await supabase
		.from("service_options")
		.select(
			`
			id,
			label,
			is_required,
			display_order,
			created_at,
			services(id, name)
		`,
		)
		.order("display_order", { ascending: true });

	if (error) {
		console.error("Error fetching service options:", error);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-3xl font-bold text-slate-900">
					Service Options
				</h1>
				<span className="text-sm text-slate-500">
					{options?.length ?? 0} option(s)
				</span>
			</div>

			{error && (
				<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
					Failed to load service options.
				</div>
			)}

			<div className="bg-white rounded-lg shadow overflow-hidden">
				<table className="w-full">
					<thead className="bg-slate-50 border-b border-slate-200">
						<tr>
							<th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
								Label
							</th>
							<th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
								Service
							</th>
							<th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
								Required
							</th>
							<th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
								Order
							</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-slate-200">
						{options && options.length > 0 ? (
							options.map((opt) => (
								<tr key={opt.id} className="hover:bg-slate-50">
									<td className="px-6 py-4 text-sm font-medium text-slate-900">
										{opt.label}
									</td>
									<td className="px-6 py-4 text-sm text-slate-600">
										{(
											opt.services as {
												name: string;
											} | null
										)?.name ?? "—"}
									</td>
									<td className="px-6 py-4 text-sm">
										{opt.is_required ? (
											<span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700 font-medium">
												Yes
											</span>
										) : (
											<span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-500">
												No
											</span>
										)}
									</td>
									<td className="px-6 py-4 text-sm text-slate-600">
										{opt.display_order}
									</td>
								</tr>
							))
						) : (
							<tr>
								<td
									colSpan={4}
									className="px-6 py-8 text-center text-slate-500">
									No service options found
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
}
