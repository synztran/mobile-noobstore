"use client";

import Icon from "@/components/ui/Icon";
import { useWishlist } from "@/hooks/useWishlist";
import clsx from "clsx";
import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { memo, useMemo } from "react";

interface WishlistButtonProps {
  productId: string;
  className?: string;
  showLabel?: boolean;
  size?: "sm" | "md";
  iconOnly?: boolean;
}

export const WishlistButton = memo(function WishlistButton({
  productId,
  className,
  showLabel = false,
  size = "md",
  iconOnly = true,
}: WishlistButtonProps) {
  const pathname = usePathname();
  const isProductPage = /^\/shop\/.+$/.test(pathname);
  const { isInWishlist, isPendingFor, toggleWishlist } = useWishlist();
  const wished = useMemo(() => isInWishlist(productId), [isInWishlist, productId]);
  const pending = useMemo(() => isPendingFor(productId), [isPendingFor, productId]);

  const sizeClass = size === "sm" ? "h-8 px-2 text-xs" : "h-12 px-2 text-sm";

  return (
    <motion.button
      type="button"
      onClick={() => void toggleWishlist(productId)}
      disabled={pending}
      aria-label={
        wished ? "Xóa khỏi danh sách yêu thích" : "Thêm vào danh sách yêu thích"
      }
      aria-pressed={wished}
      whileTap={{ scale: 0.92 }}
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-2xl font-black tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        sizeClass,
        isProductPage ? "h-12" : "",
        wished
          ? "border border-green-600 text-green-700"
          : "bg-surface-container text-on-surface-variant",
        className
      )}
    >
      {pending ? (
        <span className="loading loading-spinner loading-xs" />
      ) : (
        <motion.div
          key={wished ? "wished" : "not-wished"}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 15 }}
        >
          <Icon
            name={wished ? "favorite" : "favorite_border"}
            className={`text-xl ${wished ? "text-green-600" : "fill-none"}`}
            fill={wished ? "currentColor" : "transparent"}
          />
        </motion.div>
      )}
      {!iconOnly && showLabel && (
        <span className="text-xs font-black uppercase tracking-wider">
          {wished ? "Đã thích" : "Yêu thích"}
        </span>
      )}
    </motion.button>
  );
});

export default WishlistButton;
