"use client";

import type { CommunityPhoto } from "@/app/api/home/community-gallery/route";
import { useQuery } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import Image from "next/image";

export function CommunityGallery() {
	const { data: photos = [], isLoading } = useQuery({
		queryKey: ["home-community-gallery"],
		queryFn: async (): Promise<CommunityPhoto[]> => {
			const res = await fetch("/api/home/community-gallery");
			if (!res.ok) return [];
			const data = await res.json();
			return Array.isArray(data) ? data : [];
		},
	});

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

			{/* Bento grid: left col = 2 squares, right col = 1 tall spanning both rows */}
			<div className="grid grid-cols-2 gap-2">
				{photos.map((photo, idx) =>
					idx === 1 ? (
						<div
							key={photo.id}
							className="relative row-span-2 overflow-hidden bg-surface-container-high rounded-lg group cursor-pointer">
							<Image
								src={photo.image_url}
								alt={photo.alt_text}
								fill
								className="object-cover group-hover:scale-105 transition-transform duration-300"
								unoptimized
							/>
							<div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
						</div>
					) : (
						<div
							key={photo.id}
							className="relative aspect-square overflow-hidden bg-surface-container-high rounded-lg group cursor-pointer">
							<Image
								src={photo.image_url}
								alt={photo.alt_text}
								fill
								className="object-cover group-hover:scale-105 transition-transform duration-300"
								unoptimized
							/>
							<div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
						</div>
					),
				)}
			</div>

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
