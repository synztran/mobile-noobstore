"use client";

import { useState } from "react";
import VoucherFormModal from "./VoucherFormModal";

type VoucherRewardType =
	| "amount_off"
	| "percent_off"
	| "free_shipping"
	| "gift_item";

type VoucherStatus = "draft" | "active" | "scheduled" | "expired" | "disabled";

type VoucherRow = {
	id: string;
	name: string;
	code: string;
	description: string | null;
	reward_type: VoucherRewardType;
	percent_off: number | null;
	amount_off: number | null;
	usage_limit_total: number | null;
	usage_limit_per_user: number | null;
	status: VoucherStatus;
	min_order_amount: number;
	start_at: string | null;
	end_at: string | null;
	stackable: boolean;
	created_by: string | null;
	creator?: {
		id: string;
		email: string;
		first_name: string | null;
		last_name: string | null;
	} | null;
	applied_orders?: {
		id: string;
		order_number: string;
		status: string;
		total_price: number;
		created_at: string | null;
		user_id: string | null;
		customer?: {
			id: string;
			email: string;
			first_name: string | null;
			last_name: string | null;
		} | null;
	}[];
};

type Props = {
	voucher: VoucherRow;
};

export default function UpdateVoucherModal({ voucher }: Props) {
	const [open, setOpen] = useState(false);

	return (
		<>
			<button
				type="button"
				onClick={() => setOpen(true)}
				className="btn btn-outline btn-primary btn-sm text-blue-600 hover:text-blue-800">
				Edit
			</button>
			<VoucherFormModal
				open={open}
				onClose={() => setOpen(false)}
				mode="update"
				voucher={voucher}
			/>
		</>
	);
}
