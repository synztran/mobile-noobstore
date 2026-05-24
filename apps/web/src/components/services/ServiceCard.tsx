"use client";

import type { Service } from "@/app/api/services/route";
import Icon from "@/components/ui/Icon";
import { formatVND } from "@/lib/currency";
import Image from "next/image";
import Link from "next/link";

const SERVICE_TYPE_LABELS: Record<string, string> = {
	mod: "Mod",
	repair: "Sửa chữa",
	assembly: "Lắp ráp",
	cleaning: "Vệ sinh",
	middleman: "Middleman",
};

export function ServiceCardSkeleton() {
	return (
		<div className="animate-pulse rounded-2xl overflow-hidden bg-surface-container">
			<div className="aspect-[4/3] bg-surface-container-high" />
			<div className="p-4 space-y-2">
				<div className="h-2 w-1/4 bg-surface-container-high rounded-full" />
				<div className="h-4 w-3/4 bg-surface-container-high rounded-full" />
				<div className="h-3 w-1/2 bg-surface-container-high rounded-full" />
			</div>
		</div>
	);
}

export function ServiceCard({ service }: { service: Service }) {
	const typeLabel =
		SERVICE_TYPE_LABELS[service.service_type] ?? service.service_type;

	return (
		<Link
			href={`/services/${service.slug ?? service.id}`}
			className="block group">
			<div className="rounded-2xl overflow-hidden bg-surface-container active:scale-[0.98] transition-transform">
				{/* Thumbnail */}
				<div className="relative aspect-[4/3] bg-surface-container-high">
					{service.thumbnail_url ? (
						<Image
							src={service.thumbnail_url}
							alt={service.name}
							fill
							className="object-cover"
							sizes="(max-width: 768px) 50vw, 33vw"
						/>
					) : (
						<div className="absolute inset-0 flex items-center justify-center">
							<Icon
								name="wrench"
								className="text-4xl text-outline-variant opacity-40"
							/>
						</div>
					)}
				</div>

				{/* Info */}
				<div className="p-4 space-y-1">
					<span className="text-[10px] font-black uppercase tracking-widest text-primary">
						{typeLabel}
					</span>
					<p className="text-sm font-black text-on-surface leading-tight line-clamp-2">
						{service.name}
					</p>
					<div className="flex items-center justify-between pt-1">
						<span className="text-sm font-bold text-on-surface">
							{formatVND(service.base_price)}
						</span>
						{service.estimated_days && (
							<span className="text-[10px] text-on-surface-variant">
								~{service.estimated_days} ngày
							</span>
						)}
					</div>
				</div>
			</div>
		</Link>
	);
}
