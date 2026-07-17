"use client";

import { toast } from "@/lib/toast";
import { Share2 } from "lucide-react";

interface Props {
  productName: string;
  productSlug: string;
}

export function ShareButton({ productName, productSlug }: Props) {
  const handleShare = async () => {
    const url = `${window.location.origin}/shop/${productSlug}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: productName,
          text: productName,
          url,
        });
      } catch {
        // user cancelled
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Đã sao chép link sản phẩm");
      } catch {
        toast.error("Không thể sao chép link");
      }
    }
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-container text-on-surface transition-transform active:scale-90"
      aria-label="Share product"
    >
      <Share2 size={18} />
    </button>
  );
}
