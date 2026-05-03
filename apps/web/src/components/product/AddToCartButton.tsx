"use client";

import Icon from "@/components/ui/Icon";
import clsx from "clsx";

interface AddToCartButtonProps {
	isOutOfStock: boolean;
	missingVariantSelection: boolean;
	missingConfiguration: boolean;
	isLoading: boolean;
	isPreOrder?: boolean;
	onClick: () => void | Promise<void>;
}

export function AddToCartButton({
	isOutOfStock,
	missingVariantSelection,
	missingConfiguration,
	isLoading,
	isPreOrder = false,
	onClick,
}: AddToCartButtonProps) {
	const isDisabled =
		isOutOfStock ||
		missingVariantSelection ||
		missingConfiguration ||
		isLoading;

	const getButtonLabel = () => {
		if (isLoading) return "Đang thêm sản phẩm...";
		if (missingVariantSelection || missingConfiguration)
			return "Vui lòng lựa chọn";
		if (isOutOfStock) return "Hết hàng";
		if (isPreOrder) return "ĐẶT TRƯỚC";
		return "Thêm vào giỏ hàng";
	};

	const getIcon = () => {
		if (isLoading) return "hourglass_top";
		if (isPreOrder) return "schedule";
		return "shopping_bag";
	};

	return (
		<button
			type="button"
			onClick={onClick}
			disabled={isDisabled}
			className={clsx(
				"flex-1 h-14 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 active:scale-[0.98] transition-transform bg-gradient-to-r from-primary to-primary-container",
				isDisabled
					? "opacity-50 cursor-not-allowed text-white"
					: "text-white",
			)}>
			{isLoading ? (
				<div className="animate-spin">
					<Icon name="hourglass_top" className="text-xl" />
				</div>
			) : (
				<Icon name="shopping_bag" className="text-xl" />
			)}
			{getButtonLabel()}
		</button>
	);
}
