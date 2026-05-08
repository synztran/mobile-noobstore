"use client";

export interface OrderStatusTabOption {
	value: string;
	label: string;
	count?: number;
}

interface Props {
	value: string;
	onChange: (value: string) => void;
	options: OrderStatusTabOption[];
}

export function OrderStatusTabs({ value, onChange, options }: Props) {
	return (
		<div
			className="-mx-4 px-4 overflow-x-auto [&::-webkit-scrollbar]:hidden"
			style={{ scrollbarWidth: "none" }}>
			<div className="inline-flex gap-2 min-w-max pb-0.5">
				{options.map((option) => {
					const isActive = value === option.value;
					return (
						<button
							key={option.value}
							type="button"
							onClick={() => onChange(option.value)}
							className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-black uppercase tracking-wider transition-colors ${
								isActive
									? "bg-primary text-primary-content"
									: "bg-surface-container text-on-surface-variant"
							}`}>
							{option.label}
							{option.count !== undefined && (
								<span
									className={`min-w-[18px] h-[18px] rounded-full text-[10px] font-black flex items-center justify-center px-1 ${
										isActive
											? "bg-primary-content/20 text-primary-content"
											: "bg-surface-container-high text-on-surface-variant"
									}`}>
									{option.count}
								</span>
							)}
						</button>
					);
				})}
			</div>
		</div>
	);
}
