"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import VoucherFormModal from "./VoucherFormModal";

export default function CreateVoucherModal() {
	const [open, setOpen] = useState(false);

	return (
		<>
			<button
				type="button"
				onClick={() => setOpen(true)}
				className="btn btn-primary gap-2">
				<Plus className="w-5 h-5" />
				Add New
			</button>
			<VoucherFormModal
				open={open}
				onClose={() => setOpen(false)}
				mode="create"
			/>
		</>
	);
}
