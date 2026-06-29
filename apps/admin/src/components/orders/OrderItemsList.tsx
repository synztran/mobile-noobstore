import { Package, Gift } from "lucide-react";
import Image from "next/image";

interface KitComponent {
	id: string;
	component_group: string;
	variant_name: string;
	price_adjustment: number | null;
	product_variant_id: string;
	thumbnail: string | null;
	is_pre_order: boolean;
	pre_order_config: unknown;
}

interface GiftInfo {
	gift_name: string;
	gift_thumbnail: string | null;
	quantity: number;
}

interface OrderItem {
	id: string;
	product_name: string;
	quantity: number;
	unit_price: number;
	thumbnail: string | null;
	order_item_components: KitComponent[];
	gifts?: GiftInfo[];
}

interface Props {
	items: OrderItem[];
}

function KitComponentBadge({ c }: { c: KitComponent }) {
	return (
		<span className="inline-flex items-center gap-1.5 text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full">
			<span className="text-indigo-400">{c.component_group}:</span>
			{c.variant_name}
			{c.price_adjustment !== null && c.price_adjustment !== 0 && (
				<span
					className={
						c.price_adjustment > 0
							? "text-green-600"
							: "text-red-500"
					}>
					{c.price_adjustment > 0 ? "+" : ""}
					{c.price_adjustment.toLocaleString("vi-VN")}₫
				</span>
			)}
		</span>
	);
}

export default function OrderItemsList({ items }: Props) {
	if (items.length === 0) return null;

	return (
		<div className="space-y-4">
			<div>
				<h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
					<Package className="w-4 h-4" />
					Products ({items.length})
				</h3>
				<div className="space-y-2">
					{items.map((item) => {
						const hasPreOrderComponent =
							item.order_item_components.some(
								(c) => c.is_pre_order,
							);

						return (
							<div
								key={item.id}
								className="border border-slate-200 rounded-lg overflow-hidden p-4 space-y-2">
								<div className="flex justify-center items-center gap-3 ">
									<div className="w-16 h-16 rounded-md bg-slate-100 relative">
										{item.thumbnail ? (
											<Image
												src={item.thumbnail}
												alt={item.product_name}
												className="rounded mix-blend-darken"
												layout="fill"
												objectFit="contain"
											/>
										) : (
											<div className="w-16 h-16 rounded bg-slate-200 shrink-0" />
										)}
										<span className="rounded-full w-5 h-5 bg-slate-200 flex items-center justify-center absolute -top-2 -right-2 text-xs font-medium text-slate-600">
											{item.quantity}
										</span>
									</div>
									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-2 text-sm font-medium text-slate-900 truncate">
											{item.product_name}
											{hasPreOrderComponent && (
												<span className="bg-amber-100 text-amber-700 text-[10px] font-semibold px-1.5 py-0.5 rounded-full leading-none shrink-0">
													Pre-order
												</span>
											)}
										</div>
										<div className="text-xs text-slate-500">
											{item.unit_price.toLocaleString(
												"vi-VN",
											)}
											₫
										</div>
										{item.gifts?.map((g) => (
											<div key={g.gift_name} className="flex items-center gap-1 mt-1">
												<Gift className="w-3 h-3 text-rose-500" />
												<span className="text-[11px] font-semibold text-rose-600">
													{g.gift_name}
													{g.quantity > 1 && ` x${g.quantity}`}
												</span>
											</div>
										))}
									</div>
									<div className="text-sm font-semibold text-slate-800 shrink-0">
										{(
											item.unit_price * item.quantity
										).toLocaleString("vi-VN")}
										₫
									</div>
								</div>
								{item.order_item_components.length > 0 && (
									<div className="flex flex-wrap gap-2">
										{item.order_item_components.map((c) => (
											<KitComponentBadge
												key={c.id}
												c={c}
											/>
										))}
									</div>
								)}
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}
