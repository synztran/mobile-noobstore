"use client";

import { usePreventScroll } from "@/hooks/usePreventScroll";
import { useDiscountStore } from "@/store";
import type { VoucherRow } from "@/types/voucher";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { VoucherCard } from "./VoucherCard";

interface VoucherDrawerProps {
	drawerOpen: boolean;
	onClose: () => void;
	searchQuery: string;
	setSearchQuery: (query: string) => void;
	validVouchers: VoucherRow[];
	invalidVouchers: VoucherRow[];
	filteredVouchers: VoucherRow[];
	subtotal: number;
}

export function VoucherDrawer({
	drawerOpen,
	onClose,
	searchQuery,
	setSearchQuery,
	validVouchers,
	invalidVouchers,
	filteredVouchers,
	subtotal,
}: VoucherDrawerProps) {
	const { appliedVoucher, applyingVoucher, applyVoucher } =
		useDiscountStore();

	usePreventScroll(drawerOpen);

	return (
		<>
			<div
				className={`fixed inset-0 bg-on-surface/30 backdrop-blur-sm z-[60] transition-opacity duration-300 !mt-0 ${
					drawerOpen
						? "opacity-100 pointer-events-auto"
						: "opacity-0 pointer-events-none"
				}`}
				onClick={onClose}
			/>
			<div
				className={`fixed left-0 right-0 z-[999] bg-surface rounded-t-5xl max-h-[80dvh] h-full flex flex-col transition-all duration-250 ease-out ${
					drawerOpen ? "top-[20vh]" : "top-[110vh]"
				}`}>
				{/* Handle */}
				<div className="flex justify-center pt-3 pb-2">
					<div className="w-10 h-1 bg-outline-variant rounded-full" />
				</div>

				{/* Header */}
				<div className="flex justify-between items-center p-4">
					<h2 className="text-xl font-black tracking-tight text-on-surface">
						Chọn mã giảm giá
					</h2>
					<button
						onClick={onClose}
						className="text-on-surface hover:opacity-70 transition-opacity active:scale-95"></button>
				</div>
				<div className="flex-1 overflow-y-auto px-4 space-y-4 pb-4">
					<div className="menu bg-base-200 w-full max-w-md h-full rounded-t-2xl flex flex-col p-0 overflow-hidden">
						{/* Search Header */}
						<div className="px-4 pt-4 pb-3 border-b border-outline-variant/30">
							<div className="relative">
								<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant pointer-events-none" />
								<input
									type="text"
									placeholder="Tìm kiếm mã giảm giá..."
									className="input input-bordered w-full pl-9 pr-3 text-sm"
									value={searchQuery}
									onChange={(e) =>
										setSearchQuery(e.target.value)
									}
									autoFocus
								/>
							</div>
						</div>

						{/* Voucher List */}
						<div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
							{/* Valid Vouchers Section */}
							{validVouchers.length > 0 && (
								<>
									<p className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant px-1">
										Voucher khả dụng ({validVouchers.length}
										)
									</p>
									{validVouchers.map((voucher) => (
										<motion.div
											key={voucher.id}
											layout
											initial={{
												opacity: 0,
												y: -8,
											}}
											animate={{
												opacity: 1,
												y: 0,
											}}
											transition={{
												duration: 0.22,
											}}>
											<VoucherCard
												voucher={voucher}
												isApplied={
													appliedVoucher?.voucher_id ===
													voucher.id
												}
												isApplying={applyingVoucher}
												isValid={true}
												subtotal={subtotal}
												onApply={() => {
													void applyVoucher(
														voucher.id,
														subtotal,
													);
												}}
											/>
										</motion.div>
									))}
								</>
							)}

							{/* Invalid Vouchers Section */}
							{invalidVouchers.length > 0 && (
								<>
									<p className="text-[10px] font-black uppercase tracking-[0.2em] text-warning px-1 mt-4">
										Voucher không khả dụng (
										{invalidVouchers.length})
									</p>
									{invalidVouchers.map((voucher) => (
										<motion.div
											key={voucher.id}
											layout
											initial={{
												opacity: 0,
												y: -8,
											}}
											animate={{
												opacity: 1,
												y: 0,
											}}
											transition={{
												duration: 0.22,
											}}>
											<VoucherCard
												voucher={voucher}
												isApplied={false}
												isApplying={false}
												isValid={false}
												subtotal={subtotal}
											/>
										</motion.div>
									))}
								</>
							)}

							{/* No Results */}
							{filteredVouchers.length === 0 && (
								<div className="text-center py-8">
									<p className="text-sm text-on-surface-variant">
										Không tìm thấy voucher
									</p>
								</div>
							)}
						</div>
					</div>
				</div>
			</div>
		</>
	);
}
