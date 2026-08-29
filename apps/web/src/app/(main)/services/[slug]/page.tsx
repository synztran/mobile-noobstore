"use client";

import { withAuthRedirect } from "@/components/auth/withAuthRedirect";
import { TopNav } from "@/components/layout/TopNav";
import { ServiceConfigurator } from "@/components/services/ServiceConfigurator";
import { formatVND } from "@/lib/currency";
import { useServiceDetail } from "@/lib/react-query/service/api/useServiceQueries";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import Image from "@/components/ui/AdaptiveImage";
import { useParams } from "next/navigation";

const SERVICE_TYPE_LABELS: Record<string, string> = {
	mod: "Mod",
	repair: "Sửa chữa",
	assembly: "Lắp ráp",
	cleaning: "Vệ sinh",
	middleman: "Middleman",
};

function ServiceDetailSkeleton() {
	return (
		<>
			<TopNav showBack backHref="/services" showCart />
			<main className="pb-40 animate-pulse">
				<div className="relative aspect-[4/3] w-full bg-surface-container-high" />
				<div className="px-4 pt-6 pb-4 space-y-3">
					<div className="h-3 w-16 bg-surface-container-high rounded-full" />
					<div className="h-6 w-3/4 bg-surface-container-high rounded" />
					<div className="h-5 w-24 bg-surface-container-high rounded" />
					<div className="h-4 w-full bg-surface-container-high rounded mt-3" />
				</div>
			</main>
		</>
	);
}

function ServiceDetailContent() {
	const params = useParams();
	const slug = params.slug as string;

	const { data: service, isLoading, isError, error, refetch } = useServiceDetail(slug);

	if (isLoading) {
		return <ServiceDetailSkeleton />;
	}

	if (isError) {
		const is404 = error?.message === "NOT_FOUND";
		return (
			<>
				<TopNav showBack backHref="/services" showCart />
				<main className="pb-40">
					<div className="flex flex-col items-center justify-center gap-4 px-4 pt-20 text-center">
						<AlertTriangle className="h-12 w-12 text-outline" />
						<p className="text-sm font-bold text-on-surface">
							{is404
								? "Dịch vụ không tồn tại"
								: "Không thể tải dịch vụ"}
						</p>
						{!is404 ? (
							<button
								type="button"
								onClick={() => refetch()}
								className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant/30 bg-surface-container px-4 py-2 text-xs font-black uppercase tracking-widest text-on-surface transition-colors hover:bg-surface-container-high"
							>
								<RefreshCcw size={14} />
								Thử lại
							</button>
						) : null}
					</div>
				</main>
			</>
		);
	}

	if (!service) return null;

	const typeLabel =
		SERVICE_TYPE_LABELS[service.service_type] ?? service.service_type;

	return (
		<>
			<TopNav
				showBack
				backHref="/services"
				title={service.name}
				showCart
			/>

			<main className="pb-40">
				<div className="relative aspect-[4/3] w-full bg-surface-container-high">
					{service.thumbnail_url ? (
						<Image
							src={service.thumbnail_url}
							alt={service.name}
							fill
							className="object-cover"
							sizes="100vw"
							priority
						/>
					) : (
						<div className="absolute inset-0 flex items-center justify-center">
							<span className="text-6xl opacity-20 select-none">🔧</span>
						</div>
					)}
				</div>

				<div className="px-4 pt-6 pb-4 space-y-1.5">
					<span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
						{typeLabel}
					</span>
					<p className="text-2xl font-black uppercase text-on-surface leading-tight">
						{service.name}
					</p>
					<div className="flex items-center gap-3 pt-1">
						<span className="text-lg font-black text-on-surface">
							{formatVND(service.base_price)}
						</span>
						{service.estimated_days && (
							<span className="text-xs text-on-surface-variant">
								~{service.estimated_days} ngày
							</span>
						)}
					</div>
					{service.description && (
						<p className="text-sm text-on-surface-variant pt-2 leading-relaxed">
							{service.description}
						</p>
					)}
				</div>

				<div className="border-t border-outline-variant/20 mx-4" />

				<div className="px-4 pt-6">
					<ServiceConfigurator service={service} />
				</div>
			</main>
		</>
	);
}

export default withAuthRedirect(ServiceDetailContent);
