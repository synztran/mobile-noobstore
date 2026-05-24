import { TopNav } from "@/components/layout/TopNav";
import { formatVND } from "@/lib/currency";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

interface MiddlemanService {
	id: string;
	name: string;
	slug: string | null;
	description: string | null;
	base_price: number;
	estimated_days: number | null;
}

async function getMiddlemanServices(): Promise<MiddlemanService[]> {
	const supabase = await createClient();

	const { data } = await supabase
		.from("services")
		.select("id, name, slug, description, base_price, estimated_days")
		.eq("is_active", true)
		.eq("service_type", "middleman")
		.order("name");

	return data ?? [];
}

export default async function MiddlemanPage() {
	const services = await getMiddlemanServices();

	return (
		<>
			<TopNav showBack backHref="/services" title="Middleman" showCart />

			<main className="px-4 py-6 space-y-4 pb-24">
				<div className="rounded-2xl bg-surface-container p-4">
					<p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">
						Noobstore
					</p>
					<h1 className="text-xl font-black uppercase text-on-surface">
						Dịch vụ Middleman
					</h1>
					<p className="text-sm text-on-surface-variant mt-2 leading-relaxed">
						Trang này dành riêng cho dịch vụ mua hộ. Chọn dịch vụ
						bên dưới để cấu hình và tạo đơn.
					</p>
				</div>

				{services.length === 0 ? (
					<p className="text-sm text-on-surface-variant text-center py-12">
						Hiện chưa có dịch vụ middleman khả dụng.
					</p>
				) : (
					<div className="space-y-3">
						{services.map((service) => (
							<Link
								key={service.id}
								href={`/services/${service.slug ?? service.id}`}
								className="block rounded-2xl border border-base-200 bg-base-100 p-4 active:scale-[0.99] transition-transform">
								<p className="text-sm font-black text-on-surface">
									{service.name}
								</p>
								<p className="text-xs text-on-surface-variant mt-1">
									{formatVND(service.base_price)}
									{service.estimated_days
										? ` · ~${service.estimated_days} ngày`
										: ""}
								</p>
								{service.description ? (
									<p className="text-xs text-on-surface-variant mt-2 line-clamp-2">
										{service.description}
									</p>
								) : null}
							</Link>
						))}
					</div>
				)}
			</main>
		</>
	);
}
