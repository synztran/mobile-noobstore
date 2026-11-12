"use client";

import { useState } from "react";
import { toast } from "@/lib/toast";
import { Check, Share2 } from "lucide-react";

interface Props {
  productName: string;
  productSlug: string;
}

export function ShareButton({ productName, productSlug }: Props) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = `${window.location.origin}/shop/${productSlug}`;

    // Desktop/Browser: always prefer clipboard directly.
    // navigator.share on desktop Chrome opens OS dialog which often fails or is unwanted.
    // Only use navigator.share on mobile touch devices where it opens native share sheets (Zalo, Messenger, etc).
    const isMobileDevice =
      typeof navigator !== "undefined" &&
      navigator.maxTouchPoints > 0 &&
      Boolean(navigator.share);

    if (isMobileDevice) {
      try {
        await navigator.share({ title: productName, text: productName, url });
        return;
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        // Fall back to copy if user dismissed or native share failed
      }
    }

    // Direct clipboard copy
    let success = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        success = true;
      }
    } catch {
      // Fallback below
    }

    if (!success) {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = url;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.top = "0";
        textarea.style.left = "0";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        success = document.execCommand("copy");
        document.body.removeChild(textarea);
      } catch {
        success = false;
      }
    }

    if (success) {
      setCopied(true);
      toast.success("Đã sao chép link sản phẩm");
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error("Không thể sao chép link");
    }
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-container text-on-surface transition-transform active:scale-90"
      aria-label="Share product"
      title={copied ? "Đã sao chép" : "Chia sẻ sản phẩm"}
    >
      {copied ? (
        <Check size={18} className="text-primary" />
      ) : (
        <Share2 size={18} />
      )}
    </button>
  );
}
