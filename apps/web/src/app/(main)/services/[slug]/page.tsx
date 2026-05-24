import type { Service } from "@/app/api/services/route";
import { TopNav } from "@/components/layout/TopNav";
import { ServiceConfigurator } from "@/components/services/ServiceConfigurator";
import { formatVND } from "@/lib/currency";
import { createClient } from "@/lib/supabase/server";
import Image from "next/image";
import { notFound } from "next/navigation";

async function getService(slug: string): Promise<Service | null> {
	const supabase = await createClient();

	const { data } = await supabase
		.from("services")
		.select(
			`
			id, name, slug, description, service_type,
			base_price, thumbnail_url, estimated_days,
			service_options (
				id, label, is_required, display_order,
				service_option_values (
					id, label, price_adjustment, display_order
				)
			)
		`,
		)
		.eq("slug", slug)
		.eq("is_active", true)
		.maybeSingle();

	if (!data) return null;

	return {
		id: data.id,
		name: data.name,
		slug: data.slug,
		description: data.description,
		service_type: data.service_type,
		base_price: data.base_price,
		thumbnail_url: data.thumbnail_url,
		estimated_days: data.estimated_days,
		options: (data.service_options ?? [])
			.sort((a, b) => a.display_order - b.display_order)
			.map((opt) => ({
				id: opt.id,
				label: opt.label,
				is_required: opt.is_required,
				display_order: opt.display_order,
				values: (opt.service_option_values ?? []).sort(
					(a, b) => a.display_order - b.display_order,
				),
			})),
	};
}

const SERVICE_TYPE_LABELS: Record<string, string> = {
	mod: "Mod",
	repair: "Sửa chữa",
	assembly: "Lắp ráp",
	cleaning: "Vệ sinh",
	middleman: "Middleman",
};

export default async function ServiceDetailPage({
	params,
}: {
	params: Promise<{ slug: string }>;
}) {
	const { slug } = await params;
	const service = await getService(slug);

	if (!service) notFound();

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
				{/* Hero */}
				<div className="relative aspect-[4/3] bg-surface-container w-full">
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
						<div className="absolute inset-0 flex items-center justify-center opacity-20">
							<span className="text-7xl">🔧</span>
						</div>
					)}
				</div>

				{/* Header */}
				<div className="px-4 pt-6 pb-4 space-y-1">
					<span className="text-[10px] font-black uppercase tracking-widest text-primary">
						{typeLabel}
					</span>
					<h1 className="text-2xl font-black uppercase text-on-surface leading-tight">
						{service.name}
					</h1>
					<div className="flex items-center gap-3 pt-1">
						<span className="text-lg font-black text-on-surface">
							{formatVND(service.base_price)}
						</span>
						{service.estimated_days && (
							<span className="text-xs text-on-surface-variant">
								Thời gian ~{service.estimated_days} ngày
							</span>
						)}
					</div>
					{service.description && (
						<p className="text-sm text-on-surface-variant pt-2 leading-relaxed">
							{service.description}
						</p>
					)}
				</div>

				<div className="border-t border-base-200 mx-4" />

				{/* Configurator */}
				<div className="px-4 pt-6">
					<ServiceConfigurator service={service} />
				</div>
			</main>
		</>
	);
}
