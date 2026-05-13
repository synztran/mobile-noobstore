"use client";

import type { Creator } from "@/app/api/home/creators/route";
import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import Image from "next/image";

const COLOR_CLASSES: Record<string, string> = {
	"bg-primary-container": "from-primary/20 to-primary/5",
	"bg-secondary-container": "from-secondary/20 to-secondary/5",
	"bg-tertiary-container": "from-tertiary/20 to-tertiary/5",
	"bg-error-container": "from-error/20 to-error/5",
};

export function CustomerTestimonial() {
	const { data: creators = [], isLoading } = useQuery({
		queryKey: ["home-creators"],
		queryFn: async (): Promise<Creator[]> => {
			const res = await fetch("/api/home/creators");
			if (!res.ok) return [];
			const data = await res.json();
			return Array.isArray(data) ? data : [];
		},
	});

	if (isLoading) {
		return (
			<section className="px-6 pb-24">
				<div className="bg-surface-container-low p-8 rounded-3xl animate-pulse space-y-6">
					<div className="h-8 bg-surface-container rounded-lg w-1/2" />
					{[1, 2, 3, 4].map((i) => (
						<div key={i} className="flex gap-4 items-center">
							<div className="w-12 h-12 bg-surface-container rounded-full" />
							<div className="flex-1 space-y-2">
								<div className="h-4 bg-surface-container rounded w-3/4" />
								<div className="h-3 bg-surface-container rounded w-1/2" />
							</div>
						</div>
					))}
				</div>
			</section>
		);
	}

	if (creators.length === 0) {
		return null;
	}

	return (
		<section className="px-6 pb-24">
			<div className="bg-gradient-to-br from-surface-container-low to-surface-container p-6 rounded-3xl relative overflow-hidden group">
				{/* Animated background */}
				<div className="absolute -top-20 -right-20 w-60 h-60 bg-primary/5 rounded-full blur-3xl pointer-events-none group-hover:bg-primary/10 transition-colors" />
				<div className="absolute -bottom-20 -left-20 w-52 h-52 bg-secondary/5 rounded-full blur-3xl pointer-events-none group-hover:bg-secondary/10 transition-colors" />

				<div className="relative z-10">
					<div className="flex items-center gap-2 mb-2">
						<Sparkles size={18} className="text-primary" />
						<p className="text-[10px] font-black uppercase tracking-widest text-primary">
							Cộng đồng
						</p>
					</div>

					<h3 className="font-black text-2xl uppercase tracking-tight mb-6">
						Những Người Sáng Tạo
					</h3>

					<div className="grid grid-cols-2 gap-3">
						{creators.map((creator) => (
							<a
								key={creator.id}
								href={`https://instagram.com/${creator.social_handle.replace("@", "")}`}
								target="_blank"
								rel="noopener noreferrer"
								className={`bg-gradient-to-br ${COLOR_CLASSES[creator.color_theme] || "from-primary/20 to-primary/5"} rounded-2xl px-2 py-4 flex flex-col items-center text-center hover:shadow-lg transition-shadow group/card cursor-pointer`}>
								<div className="w-14 h-14 rounded-full overflow-hidden mb-3 ring-2 ring-on-surface/10 group-hover/card:ring-primary/30 transition-all">
									<Image
										src={creator.image_url}
										alt={creator.name}
										width={56}
										height={56}
										className="w-full h-full object-cover"
									/>
								</div>
								<p className="font-bold text-xs uppercase tracking-tight leading-tight">
									{creator.name}
								</p>
								<p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mt-1">
									{creator.role}
								</p>
								{creator.bio && (
									<p className="text-[9px] text-on-surface-variant mt-2 line-clamp-2">
										{creator.bio}
									</p>
								)}
								<p className="text-primary text-[10px] font-bold uppercase mt-auto">
									{creator.social_handle}
								</p>
							</a>
						))}
					</div>
				</div>
			</div>
		</section>
	);
}
