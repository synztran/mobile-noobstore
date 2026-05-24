import { LucideIcon } from "lucide-react";

interface StatCardProps {
	label: string;
	value: number;
	icon: LucideIcon;
	color: string;
}

export default function StatCard({
	label,
	value,
	icon: Icon,
	color,
}: StatCardProps) {
	return (
		<div className="bg-white rounded-lg shadow p-6">
			<div className="flex items-center justify-between">
				<div>
					<p className="text-sm text-slate-600">{label}</p>
					<p className="text-3xl font-bold text-slate-900 mt-2">
						{value}
					</p>
				</div>
				<div className={`p-3 rounded-full ${color}`}>
					<Icon className="w-6 h-6" />
				</div>
			</div>
		</div>
	);
}
