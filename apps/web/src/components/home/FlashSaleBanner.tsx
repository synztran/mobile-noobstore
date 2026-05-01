"use client";

import type { TrustProp } from "@/app/api/home/trust-props/route";
import { useQuery } from "@tanstack/react-query";
import { Award, ShieldCheck, Truck, Zap } from "lucide-react";

const ICON_MAP: Record<string, React.ElementType> = {
	truck: Truck,
	"shield-check": ShieldCheck,
	award: Award,
	zap: Zap,
};

export function FlashSaleBanner() {
	const { data: props = [], isLoading } = useQuery({
		queryKey: ["home-trust-props"],
		queryFn: async (): Promise<TrustProp[]> => {
			const res = await fetch("/api/home/trust-props");
			if (!res.ok) return [];
			const data = await res.json();
			return Array.isArray(data) ? data : [];
		},
	});

	if (isLoading) {
		return (
			<section className="bg-on-surface text-surface py-12 px-8 animate-pulse space-y-6">
				{[1, 2].map((i) => (
					<div
						key={i}
						className="h-20 bg-surface-container rounded-lg"
					/>
				))}
			</section>
		);
	}

	return (
		<section className="bg-on-surface text-surface py-12 px-8 flex flex-col gap-8 relative overflow-hidden">
			{/* Background accent */}
			<div className="absolute -top-10 -right-10 w-40 h-40 bg-primary-fixed/10 rounded-full blur-3xl pointer-events-none" />
			<div className="absolute -bottom-10 -left-10 w-32 h-32 bg-secondary-fixed/10 rounded-full blur-2xl pointer-events-none" />

			{props.map(({ id, icon: iconName, heading, body }) => {
				const Icon = ICON_MAP[iconName] || Truck;
				return (
					<div
						key={id}
						className="flex items-start gap-4 relative z-10">
						<div className="w-12 h-12 rounded-xl bg-primary-fixed/20 flex items-center justify-center flex-shrink-0">
							<Icon
								size={24}
								className="text-primary-fixed-dim"
							/>
						</div>
						<div className="flex-1">
							<h5 className="text-xs font-black tracking-widest uppercase leading-tight">
								{heading}
							</h5>
							<p className="text-xs text-outline text-gray-200 mt-2 leading-relaxed">
								{body}
							</p>
						</div>
					</div>
				);
			})}
		</section>
	);
}
