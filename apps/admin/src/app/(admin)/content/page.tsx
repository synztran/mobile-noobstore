import { getAdminClient } from "@/lib/supabase/admin";
import { Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";

export const metadata = {
	title: "Content - NoobStore Admin",
};

export default async function ContentPage() {
	const supabase = getAdminClient();

	const { data: campaigns, error: campaignsError } = await supabase
		.from("hero_campaigns")
		.select(
			"id, title, subtitle, image_url, cta_link, is_active, created_at",
		)
		.order("created_at", { ascending: false })
		.limit(10);

	if (campaignsError)
		console.error("Error fetching campaigns:", campaignsError);

	return (
		<div className="space-y-8">
			{/* Hero Campaigns */}
			<div className="space-y-4">
				<div className="flex items-center justify-between">
					<h2 className="text-2xl font-bold text-slate-900">
						Hero Campaigns
					</h2>
					<Link
						href="/content/campaigns/new"
						className="btn btn-sm btn-primary gap-2">
						<Plus className="w-4 h-4" />
						Add Campaign
					</Link>
				</div>

				<div className="bg-white rounded-lg shadow overflow-hidden">
					<table className="w-full">
						<thead className="bg-slate-50 border-b border-slate-200">
							<tr>
								<th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
									Title
								</th>
								<th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
									Subtitle
								</th>
								<th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
									Image
								</th>
								<th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
									CTA Link
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
							{campaigns && campaigns.length > 0 ? (
								campaigns.map((campaign) => (
									<tr
										key={campaign.id}
										className="hover:bg-slate-50">
										<td className="px-6 py-4 text-sm text-slate-900 font-medium">
											{campaign.title}
										</td>
										<td className="px-6 py-4 text-sm text-slate-600 max-w-xs truncate">
											{campaign.subtitle}
										</td>
										<td className="px-6 py-4 text-sm text-slate-600">
											{campaign.image_url && (
												<img
													src={campaign.image_url}
													alt={campaign.title}
													className="w-16 h-10 object-cover rounded"
												/>
											)}
										</td>
										<td className="px-6 py-4 text-sm text-slate-600 max-w-xs truncate">
											{campaign.cta_link}
										</td>
										<td className="px-6 py-4 text-sm">
											<span
												className={`px-3 py-1 rounded-full text-xs font-medium ${
													campaign.is_active
														? "bg-green-100 text-green-800"
														: "bg-gray-100 text-gray-800"
												}`}>
												{campaign.is_active
													? "Active"
													: "Inactive"}
											</span>
										</td>
										<td className="px-6 py-4 text-sm text-slate-600">
											{new Date(
												campaign.created_at!,
											).toLocaleDateString("vi-VN")}
										</td>
										<td className="px-6 py-4 text-sm">
											<div className="flex items-center gap-2">
												<button className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center transition-colors" title="Edit">
													<Pencil className="w-4 h-4" />
												</button>
												<button className="w-8 h-8 rounded-full bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center transition-colors" title="Delete">
													<Trash2 className="w-4 h-4" />
												</button>
											</div>
										</td>
									</tr>
								))
							) : (
								<tr>
									<td
										colSpan={7}
										className="px-6 py-8 text-center text-slate-500">
										No hero campaigns found
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}
