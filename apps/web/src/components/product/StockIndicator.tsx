"use client";

interface StockIndicatorProps {
	stockQuantity: number;
}

export function StockIndicator({ stockQuantity }: StockIndicatorProps) {
	// Only show when stock is between 1-10 (not 0, not > 10)
	if (stockQuantity <= 0 || stockQuantity > 10) {
		return null;
	}

	return (
		<div className="text-[9px] font-black uppercase tracking-wide text-warning text-center">
			Còn lại {stockQuantity} sản phẩm
		</div>
	);
}
