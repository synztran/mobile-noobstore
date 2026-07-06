"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, MessageCircle, Search, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface ReviewItem {
	id: string;
	product_id: string;
	user_id: string;
	rating: number;
	title: string | null;
	body: string | null;
	reviewer_name: string;
	is_visible: boolean;
	reply: string | null;
	created_at: string;
	products: { name: string; slug: string } | null;
}

interface ReviewsResponse {
	reviews: ReviewItem[];
	total: number;
	page: number;
	totalPages: number;
}

const PAGE_SIZE = 20;

function StarRating({ rating }: { rating: number }) {
	return (
		<div className="flex gap-0.5">
			{[1, 2, 3, 4, 5].map((s) => (
				<svg
					key={s}
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill={s <= rating ? "#f59e0b" : "#e2e8f0"}
					stroke={s <= rating ? "#f59e0b" : "#cbd5e1"}
					strokeWidth="1.5"
				>
					<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
				</svg>
			))}
		</div>
	);
}

function ReplyModal({
	review,
	onClose,
}: {
	review: ReviewItem;
	onClose: () => void;
}) {
	const queryClient = useQueryClient();
	const router = useRouter();
	const [reply, setReply] = useState(review.reply ?? "");
	const [saving, setSaving] = useState(false);

	async function handleSave() {
		setSaving(true);
		const res = await fetch(`/api/reviews/${review.id}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ reply: reply.trim() || null }),
		});
		setSaving(false);
		if (!res.ok) {
			alert("Failed to save reply");
			return;
		}
		queryClient.invalidateQueries({ queryKey: ["reviews"] });
		router.refresh();
		onClose();
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center">
			<div className="absolute inset-0 bg-black/50" onClick={onClose} />
			<div className="relative mx-4 w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
				<div className="mb-4 flex items-center justify-between">
					<p className="text-lg font-semibold text-slate-900">
						Phản hồi đánh giá
					</p>
					<button
						onClick={onClose}
						className="rounded-lg p-1 transition-colors hover:bg-slate-100"
					>
						<X className="h-5 w-5 text-slate-500" />
					</button>
				</div>

				<div className="mb-4 rounded-lg bg-slate-50 p-3">
					<div className="mb-2 flex items-center gap-2">
						<StarRating rating={review.rating} />
						<span className="text-xs text-slate-500">{review.reviewer_name}</span>
					</div>
					{review.body && (
						<p className="text-sm text-slate-700">{review.body}</p>
					)}
				</div>

				<label className="mb-1 block text-sm font-medium text-slate-700">
					Phản hồi của bạn
				</label>
				<textarea
					value={reply}
					onChange={(e) => setReply(e.target.value)}
					rows={4}
					className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
					placeholder="Nhập phản hồi..."
				/>

				<div className="mt-4 flex justify-end gap-3">
					<button
						onClick={onClose}
						className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200"
					>
						Hủy
					</button>
					<button
						onClick={handleSave}
						disabled={saving}
						className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
					>
						{saving ? "Đang lưu..." : "Lưu"}
					</button>
				</div>
			</div>
		</div>
	);
}

export function ReviewsList() {
	const queryClient = useQueryClient();
	const router = useRouter();
	const [page, setPage] = useState(1);
	const [search, setSearch] = useState("");
	const [replyingTo, setReplyingTo] = useState<ReviewItem | null>(null);
	const [toggling, setToggling] = useState<string | null>(null);

	const { data, isLoading } = useQuery<ReviewsResponse>({
		queryKey: ["reviews", search, page],
		queryFn: async () => {
			const params = new URLSearchParams();
			params.set("page", String(page));
			params.set("limit", String(PAGE_SIZE));
			if (search) params.set("search", search);
			const res = await fetch(`/api/reviews?${params}`);
			if (!res.ok) throw new Error("Failed to fetch reviews");
			return res.json();
		},
	});

	async function toggleVisibility(review: ReviewItem) {
		setToggling(review.id);
		const res = await fetch(`/api/reviews/${review.id}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ is_visible: !review.is_visible }),
		});
		setToggling(null);
		if (!res.ok) {
			alert("Failed to update visibility");
			return;
		}
		queryClient.invalidateQueries({ queryKey: ["reviews"] });
		router.refresh();
	}

	async function handleDelete(id: string) {
		if (!confirm("Xóa đánh giá này?")) return;
		const res = await fetch(`/api/reviews/${id}`, {
			method: "DELETE",
		});
		if (!res.ok) {
			alert("Failed to delete review");
			return;
		}
		queryClient.invalidateQueries({ queryKey: ["reviews"] });
		router.refresh();
	}

	return (
		<div className="space-y-4">
			{/* Search */}
			<div className="relative">
				<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
				<input
					type="text"
					value={search}
					onChange={(e) => {
						setSearch(e.target.value);
						setPage(1);
					}}
					placeholder="Tìm kiếm theo sản phẩm, người đánh giá, nội dung..."
					className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
				/>
			</div>

			<div className="overflow-hidden rounded-lg bg-white shadow">
				<table className="w-full">
					<thead className="border-b border-slate-200 bg-slate-50">
						<tr>
							<th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
								Sản phẩm
							</th>
							<th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
								Đánh giá
							</th>
							<th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
								Người đánh giá
							</th>
							<th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
								Nội dung
							</th>
							<th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
								Ngày
							</th>
							<th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
								Trạng thái
							</th>
							<th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">
								Thao tác
							</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-slate-100">
						{isLoading ? (
							<>
								{[1, 2, 3, 4, 5].map((i) => (
									<tr key={i}>
										{[1, 2, 3, 4, 5, 6, 7].map((j) => (
											<td key={j} className="px-4 py-3">
												<div className="h-4 w-full animate-pulse rounded bg-slate-200" />
											</td>
										))}
									</tr>
								))}
							</>
						) : data && data.reviews.length > 0 ? (
							data.reviews.map((review) => (
								<tr key={review.id} className="hover:bg-slate-50">
									<td className="px-4 py-3 text-sm font-medium text-slate-900 max-w-[180px] truncate">
										{review.products?.name ?? "—"}
									</td>
									<td className="px-4 py-3">
										<StarRating rating={review.rating} />
									</td>
									<td className="px-4 py-3 text-sm text-slate-600">
										{review.reviewer_name}
									</td>
									<td className="px-4 py-3 max-w-[240px]">
										{review.title && (
											<p className="text-sm font-medium text-slate-900 truncate">
												{review.title}
											</p>
										)}
										{review.body && (
											<p className="text-xs text-slate-500 truncate">
												{review.body}
											</p>
										)}
										{review.reply && (
											<p className="mt-1 text-xs text-blue-600 truncate">
												Phản hồi: {review.reply}
											</p>
										)}
									</td>
									<td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
										{new Date(review.created_at).toLocaleDateString("vi-VN")}
									</td>
									<td className="px-4 py-3">
										<span
											className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
												review.is_visible
													? "bg-green-100 text-green-700"
													: "bg-red-100 text-red-700"
											}`}
										>
											{review.is_visible ? (
												<Eye className="h-3 w-3" />
											) : (
												<EyeOff className="h-3 w-3" />
											)}
											{review.is_visible ? "Hiện" : "Ẩn"}
										</span>
									</td>
									<td className="px-4 py-3">
										<div className="flex items-center justify-end gap-1">
											<button
												onClick={() => toggleVisibility(review)}
												disabled={toggling === review.id}
												className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
												title={review.is_visible ? "Ẩn" : "Hiện"}
											>
												{review.is_visible ? (
													<EyeOff className="h-4 w-4" />
												) : (
													<Eye className="h-4 w-4" />
												)}
											</button>
											<button
												onClick={() => setReplyingTo(review)}
												className={`rounded-lg p-1.5 transition-colors hover:bg-slate-100 ${
													review.reply
														? "text-blue-600"
														: "text-slate-400 hover:text-slate-600"
												}`}
												title="Phản hồi"
											>
												<MessageCircle className="h-4 w-4" />
											</button>
											<button
												onClick={() => handleDelete(review.id)}
												className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
												title="Xóa"
											>
												<Trash2 className="h-4 w-4" />
											</button>
										</div>
									</td>
								</tr>
							))
						) : (
							<tr>
								<td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">
									Không tìm thấy đánh giá
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>

			{/* Pagination */}
			{data && data.totalPages > 1 && (
				<div className="flex items-center justify-center gap-2">
					<button
						onClick={() => setPage((p) => Math.max(1, p - 1))}
						disabled={page === 1}
						className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40"
					>
						Trước
					</button>
					<span className="text-sm text-slate-500">
						Trang {page} / {data.totalPages}
					</span>
					<button
						onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
						disabled={page === data.totalPages}
						className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40"
					>
						Sau
					</button>
				</div>
			)}

			{replyingTo && (
				<ReplyModal
					review={replyingTo}
					onClose={() => setReplyingTo(null)}
				/>
			)}
		</div>
	);
}
