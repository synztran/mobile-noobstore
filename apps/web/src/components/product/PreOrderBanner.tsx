import Icon from "@/components/ui/Icon";

type PreOrderConfig = {
	estimate: string;
	available_date?: string | null;
	notes?: string | null;
};

type PreOrderBannerProps = {
	config: PreOrderConfig;
};

export function PreOrderBanner({ config }: PreOrderBannerProps) {
	const details = [
    { label: "Dự kiến có hàng", value: config.available_date, className: "text-xs text-on-surface-variant" },
		{ label: null, value: config.notes, className: "text-sm" },
		{ label: "Dự kiến", value: config.estimate, className: "text-xs font-bold text-on-surface" },
	];

	return (
		<div className="flex items-start gap-2 bg-primary/10 border border-primary/30 rounded-2xl p-2">
			<Icon
				name="schedule"
				className="text-primary text-xl mt-0.5 shrink-0"
			/>
			<div className="space-y-0.5">
				<p className="text-xs font-black uppercase tracking-widest text-primary">
					Sản phẩm đặt trước
				</p>
				{details.map(
					(item, i) =>
						item.value && (
							<p key={i} className={item.className}>
								{item.label ? `${item.label}: ${item.value}` : item.value}
							</p>
						),
				)}
			</div>
		</div>
	);
}
