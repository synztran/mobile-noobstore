"use client";

import type { CommunityPhoto } from "@/app/api/home/community-gallery/route";
import { useQuery } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

const PAGE_SIZE = 5;

export function CommunityGallery() {
	const [limit, setLimit] = useState(PAGE_SIZE);

	const { data, isLoading } = useQuery({
		queryKey: ["home-community-gallery", limit],
		queryFn: async (): Promise<{
			photos: CommunityPhoto[];
			hasMore: boolean;
		}> => {
			const res = await fetch(
				`/api/home/community-gallery?limit=${limit + 1}`,
			);
			if (!res.ok) return { photos: [], hasMore: false };
			const raw = await res.json();
			const all: CommunityPhoto[] = Array.isArray(raw) ? raw : [];
			return { photos: all.slice(0, limit), hasMore: all.length > limit };
		},
		placeholderData: (prev) => prev,
	});

	const photos = data?.photos ?? [];
	const hasMore = data?.hasMore ?? false;

	if (isLoading) {
		return (
			<section className="py-16 px-6">
				<div className="h-8 bg-surface-container rounded-lg mb-8 animate-pulse" />
				<div className="grid grid-cols-2 gap-2">
					<div className="aspect-square bg-surface-container rounded-lg animate-pulse" />
					<div className="row-span-2 bg-surface-container rounded-lg animate-pulse" />
					<div className="aspect-square bg-surface-container rounded-lg animate-pulse" />
				</div>
			</section>
		);
	}

	if (photos.length === 0) {
		return null;
	}

	return (
		<section className="py-16 px-6">
			<div className="mb-8">
				<div className="flex items-center gap-2 mb-2">
					<Heart size={20} className="text-primary" />
					<span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
						Cộng đồng
					</span>
				</div>
				<h2 className="text-3xl font-black tracking-tight uppercase">
					NHẬT KÝ BUILD
				</h2>
				<p className="text-xs text-on-surface-variant mt-2">
					Khám phá những setup độc đáo từ cộng đồng
				</p>
			</div>

			{/* Masonry: 2 columns, images render at their natural aspect ratio */}
			<div className="columns-2 gap-2 space-y-2">
				{photos.map((photo) => (
					<div
						key={photo.id}
						className="break-inside-avoid relative overflow-hidden rounded-lg bg-surface-container-high group cursor-pointer">
						<Image
							src={photo.image_url}
							alt={photo.alt_text}
							width={0}
							height={0}
							sizes="(max-width: 640px) 50vw, 33vw"
							className="w-full h-auto group-hover:scale-105 transition-transform duration-300"
						/>
						{/* Author / build info overlay */}
						<div className="absolute inset-x-0 bottom-0 transition-transform duration-300 backdrop-blur-sm bg-white/20 px-2 py-1 rounded-b-lg">
							{photo.author && (
								<p className="text-white text-[9px] font-black truncate drop-shadow flex items-center leading-1">
									@{photo.author}
								</p>
							)}
							{/* {photo.build_info &&
								Object.keys(photo.build_info).length > 0 && (
									<div className="mt-0.5 space-y-0.5">
										{Object.entries(photo.build_info).map(
											([k, v]) => (
												<p
													key={k}
													className="text-white/70 text-[9px] truncate">
													<span className="text-white/50">
														{k}:
													</span>{" "}
													{v}
												</p>
											),
										)}
									</div>
								)} */}
						</div>
					</div>
				))}
			</div>

			{hasMore && (
				<button
					onClick={() => setLimit((l) => l + PAGE_SIZE)}
					disabled={isLoading}
					className="mt-4 w-full py-2.5 rounded-xl border border-primary/30 text-primary text-xs font-black uppercase tracking-widest transition-all hover:bg-primary/5 active:scale-95 disabled:opacity-50">
					{isLoading ? "Đang tải..." : "Xem thêm"}
				</button>
			)}

			<div className="mt-8 bg-primary/5 border border-primary/20 rounded-xl p-4 text-center">
				<p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">
					✨ TAG @NOOBSTORE ĐỂ ĐƯỢC ĐĂNG LÊN ✨
				</p>
				<p className="text-xs text-on-surface-variant mt-1">
					Hãy chia sẻ setup của bạn trên mạng xã hội
				</p>
			</div>
		</section>
	);
}
