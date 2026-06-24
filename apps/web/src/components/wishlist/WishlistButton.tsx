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
      aria-label={
        wished ? "Xóa khỏi danh sách yêu thích" : "Thêm vào danh sách yêu thích"
      }
      aria-pressed={wished}
      className={clsx(
        "btn-xs inline-flex items-center justify-center gap-2 rounded-xl font-black tracking-wide transition-all active:scale-100 disabled:cursor-not-allowed disabled:opacity-60",
        sizeClass,
        wished
          ? "border border-green-600"
          : "bg-surface-container text-on-surface",
        className
      )}
    >
      {pending ? (
        <span className="loading loading-spinner loading-xs" />
      ) : (
        <Icon
          name={wished ? "favorite" : "favorite_border"}
          className={`text-[18px] ${wished ? "text-green-600" : "fill-none text-on-surface"}`}
          fill={wished ? "currentColor" : "transparent"}
        />
      )}
    </button>
  );
}

export default WishlistButton;
