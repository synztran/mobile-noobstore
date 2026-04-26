"use client";

import Icon from "@/components/ui/Icon";
import clsx from "clsx";

interface AddToCartButtonProps {
	isOutOfStock: boolean;
	missingVariantSelection: boolean;
	missingConfiguration: boolean;
	isLoading: boolean;
	onClick: () => void | Promise<void>;
}

export function AddToCartButton({
	isOutOfStock,
	missingVariantSelection,
	missingConfiguration,
	isLoading,
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
		return "Thêm vào giỏ hàng";
	};

	return (
		<button
			type="button"
			onClick={onClick}
			disabled={isDisabled}
			className={clsx(
				"flex-1 h-14 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 active:scale-[0.98] transition-transform bg-gradient-to-r from-primary to-primary-container",
				isDisabled
					? "opacity-50 cursor-not-allowed bg-surface text-on-surface text-white"
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
