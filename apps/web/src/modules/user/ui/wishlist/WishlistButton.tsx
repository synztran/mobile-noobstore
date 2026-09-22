"use client";

import { Heart } from "lucide-react";
import {
  useWishlist,
  type ProductMeta,
} from "@/modules/user/client/useWishlist";
import { useAuth } from "@/modules/user/client/AuthProvider";
import clsx from "clsx";
import { motion } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import { memo, useCallback } from "react";

interface WishlistButtonProps {
  productId: string;
  product?: ProductMeta;
  className?: string;
  showLabel?: boolean;
  size?: "sm" | "md";
  iconOnly?: boolean;
}

export const WishlistButton = memo(function WishlistButton({
  productId,
  product,
  className,
  showLabel = false,
  size = "md",
  iconOnly = true,
}: WishlistButtonProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const isProductPage = /^\/shop\/.+$/.test(pathname);
  const { isInWishlist, isPendingFor, toggleWishlist } = useWishlist();
  const wished = isInWishlist(productId);
  const pending = isPendingFor(productId);

  const handleClick = useCallback(() => {
    if (!user) {
      const currentPath = window.location.pathname + window.location.search;
      router.push(`/login?next=${encodeURIComponent(currentPath)}`);
      return;
    }
    void toggleWishlist(productId, product);
  }, [user, router, productId, product, toggleWishlist]);

  const sizeClass =
    size === "sm"
      ? "h-8 min-w-8 px-2 text-xs lg:text-sm lg:h-12 lg:min-w-12"
      : "h-12 min-w-12 px-2 text-sm lg:text-base lg:h-14 lg:min-w-14";

  return (
    <motion.button
      type="button"
      onClick={handleClick}
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
          <Heart
            className={`h-5 w-5 ${
              wished ? "fill-current text-green-600" : "text-on-surface-variant"
            }`}
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
