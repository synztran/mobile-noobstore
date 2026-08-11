"use client";

import { Pencil } from "lucide-react";
import { useState } from "react";
import ServiceConfigModal, {
	type ServiceConfigRow,
} from "./ServiceConfigModal";

interface ServiceConfigButtonProps {
	serviceId: string;
	serviceName: string;
	defaultPrice: number;
	defaultHandlingDays: number;
	config: ServiceConfigRow | null;
}

export default function ServiceConfigButton({
	serviceId,
	serviceName,
	defaultPrice,
	defaultHandlingDays,
	config,
}: ServiceConfigButtonProps) {
	const [open, setOpen] = useState(false);

	return (
		<>
			<button
				onClick={() => setOpen(true)}
				className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50">
				<Pencil className="h-3.5 w-3.5" />
				{config ? "Chỉnh sửa" : "Cấu hình"}
			</button>
			<ServiceConfigModal
				open={open}
				onClose={() => setOpen(false)}
				serviceId={serviceId}
				serviceName={serviceName}
				defaultPrice={defaultPrice}
				defaultHandlingDays={defaultHandlingDays}
				config={config}
			/>
		</>
	);
}