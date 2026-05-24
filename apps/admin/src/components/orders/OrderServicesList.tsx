import { Tag, Wrench } from "lucide-react";

interface OrderService {
	id: string;
	service_id: string | null;
	service_name: string | null;
	price: number;
	quantity: number;
	selected_options: Record<
		string,
		{ option_value_id: number; price_adjustment: number }
	>;
	customer_note: string | null;
	services: { base_price: number } | null;
}

interface OptionInfo {
	optionLabel: string;
	valueLabel: string;
}

interface Props {
	services: OrderService[];
	optionValueMap: Record<string, OptionInfo>;
}

function ServiceOptionBadge({
	opt,
	info,
}: {
	opt: { option_value_id: number; price_adjustment: number };
	info: OptionInfo | undefined;
}) {
	return (
		<span className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
			<Tag className="w-3 h-3 text-slate-400" />
			{info ? (
				<>
					<span className="text-slate-400">{info.optionLabel}:</span>
					{info.valueLabel}
					{opt.price_adjustment !== 0 && (
						<span
							className={
								opt.price_adjustment > 0
									? "text-green-600"
									: "text-red-500"
							}>
							{opt.price_adjustment > 0 ? "+" : ""}
							{opt.price_adjustment.toLocaleString("vi-VN")}₫
						</span>
					)}
				</>
			) : (
				<span className="text-slate-400 italic">
					Option #{opt.option_value_id}
				</span>
			)}
		</span>
	);
}

export default function OrderServicesList({ services, optionValueMap }: Props) {
	if (services.length === 0) return null;

	return (
		<div>
			<h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
				<Wrench className="w-4 h-4" />
				Services ({services.length})
			</h3>
			<div className="space-y-2">
				{services.map((svc) => (
					<div
						key={svc.id}
						className="border border-slate-200 rounded-lg px-4 py-3">
						<div className="flex items-center justify-between gap-2">
							<span className="text-sm font-medium text-slate-900">
								{svc.service_name ?? "—"}
							</span>
							<div className="text-right shrink-0">
								<div className="text-sm font-semibold text-slate-800">
									{(svc.price * svc.quantity).toLocaleString(
										"vi-VN",
									)}
									₫
								</div>
								{svc.services?.base_price !== undefined &&
									svc.services.base_price !== svc.price && (
										<div className="text-xs text-slate-400 line-through">
											{svc.services.base_price.toLocaleString(
												"vi-VN",
											)}
											₫
										</div>
									)}
							</div>
						</div>
						{Object.keys(svc.selected_options ?? {}).length > 0 && (
							<div className="mt-2 flex flex-wrap gap-1.5">
								{Object.values(svc.selected_options).map(
									(opt, i) => (
										<ServiceOptionBadge
											key={i}
											opt={opt}
											info={
												optionValueMap[
													String(opt.option_value_id)
												]
											}
										/>
									),
								)}
							</div>
						)}
						{svc.customer_note && (
							<p className="mt-1.5 text-xs text-slate-500 italic">
								Note: {svc.customer_note}
							</p>
						)}
					</div>
				))}
			</div>
		</div>
	);
}
