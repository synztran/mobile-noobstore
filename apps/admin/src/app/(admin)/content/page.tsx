"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import CampaignModal from "@/components/content/CampaignModal";

interface CampaignRow {
	id: string;
	title: string;
	subtitle: string | null;
	image_url: string | null;
	cta_text: string | null;
	cta_link: string | null;
	is_active: boolean;
	priority: number;
	created_at: string | null;
}

export default function ContentPage() {
	const router = useRouter();
	const queryClient = useQueryClient();
	const [createOpen, setCreateOpen] = useState(false);
	const [deleting, setDeleting] = useState<string | null>(null);

	const { data: campaigns, isLoading } = useQuery<CampaignRow[]>({
		queryKey: ["campaigns"],
		queryFn: async () => {
			const res = await fetch("/api/content/campaigns");
			if (!res.ok) throw new Error("Failed to fetch campaigns");
			return res.json();
		},
	});

	async function handleDelete(id: string) {
		if (!confirm("Are you sure you want to delete this campaign?")) return;
		setDeleting(id);
		const res = await fetch(`/api/content/campaigns/${id}`, {
			method: "DELETE",
		});
		setDeleting(null);
		if (!res.ok) {
			alert("Failed to delete campaign");
			return;
		}
		queryClient.invalidateQueries({ queryKey: ["campaigns"] });
		router.refresh();
	}

	return (
		<div className="space-y-8">
			<div className="space-y-4">
				<div className="flex items-center justify-between">
					<p className="text-2xl font-bold text-slate-900">
						Hero Campaigns
					</p>
					<button
						onClick={() => setCreateOpen(true)}
						className="btn btn-sm btn-primary gap-2"
					>
						<Plus className="w-4 h-4" />
						Add Campaign
					</button>
				</div>

				{createOpen && (
					<CampaignModal
						mode="create"
						open={createOpen}
						onClose={() => setCreateOpen(false)}
					/>
				)}

				<div className="bg-white rounded-lg shadow overflow-hidden">
					<table className="w-full">
						<thead className="bg-slate-50 border-b border-slate-200">
							<tr>
								<th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
									Priority
								</th>
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
							{isLoading ? (
								<tr>
									<td colSpan={8} className="px-6 py-8 text-center text-slate-500">
										Loading...
									</td>
								</tr>
							) : campaigns && campaigns.length > 0 ? (
								campaigns.map((campaign) => (
									<tr key={campaign.id} className="hover:bg-slate-50">
										<td className="px-6 py-4 text-sm text-slate-900 font-medium">
											{campaign.priority}
										</td>
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
												}`}
											>
												{campaign.is_active ? "Active" : "Inactive"}
											</span>
										</td>
										<td className="px-6 py-4 text-sm text-slate-600">
											{campaign.created_at
												? new Date(campaign.created_at).toLocaleDateString("vi-VN")
												: "—"}
										</td>
										<td className="px-6 py-4 text-sm">
											<div className="flex items-center gap-2">
												<CampaignModal mode="edit" campaign={campaign} />
												<button
													onClick={() => handleDelete(campaign.id)}
													disabled={deleting === campaign.id}
													className="w-8 h-8 rounded-full bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center transition-colors disabled:opacity-50"
													title="Delete"
												>
													{deleting === campaign.id ? (
														<span className="loading loading-spinner loading-xs" />
													) : (
														<Trash2 className="w-4 h-4" />
													)}
												</button>
											</div>
										</td>
									</tr>
								))
							) : (
								<tr>
									<td colSpan={8} className="px-6 py-8 text-center text-slate-500">
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
