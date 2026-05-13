"use client";

import Icon from "@/components/ui/Icon";
import { useWishlist } from "@/hooks/useWishlist";
import clsx from "clsx";

interface WishlistButtonProps {
	productId: string;
	className?: string;
	showLabel?: boolean;
	size?: "sm" | "md";
}

export function WishlistButton({
	productId,
	className,
	showLabel = false,
	size = "md",
}: WishlistButtonProps) {
	const { isInWishlist, isPendingFor, toggleWishlist } = useWishlist();
	const wished = isInWishlist(productId);
	const pending = isPendingFor(productId);

	const sizeClass = size === "sm" ? "h-8 px-2 text-xs" : "h-10 px-3 text-sm";

	return (
		<button
			type="button"
			onClick={() => void toggleWishlist(productId)}
			disabled={pending}
			aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
			aria-pressed={wished}
			className={clsx(
				"inline-flex items-center justify-center gap-2 rounded-xl font-black tracking-wide transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed",
				sizeClass,
				wished
					? "border border-primary"
					: "bg-surface-container text-on-surface",
				className,
			)}>
			{pending ? (
				<span className="loading loading-spinner loading-xs" />
			) : (
				<Icon
					name={wished ? "favorite" : "favorite_border"}
					className={`text-[20px] ${wished ? "text-primary" : "text-on-surface fill-none"}`}
					fill={wished ? "currentColor" : "transparent"}
				/>
			)}
		</button>
	);
}

export default WishlistButton;
