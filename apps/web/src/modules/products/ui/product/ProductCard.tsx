"use client";

import type { ShopProduct } from "@/modules/products/types";
import { Package, ShoppingCart } from "lucide-react";
import WishlistButton from "@/modules/user/ui/wishlist/WishlistButton";
import { toast } from "@/lib/toast";
import { useCartStore } from "@/modules/cart/client/hooks/useCartStore";
import { useFlyToCartStore } from "@/modules/cart/client/hooks/useFlyToCart";
import { useAddCartItem } from "@/modules/cart/client/react-query/mutations";
import { trackAddToCart, toGAProduct } from "@/lib/analytics";
import { useAuth } from "@/modules/user/client/AuthProvider";
import {
  LoginRequiredError,
  redirectToLogin,
} from "@/modules/user/client/login-redirect";
import Image from "@/components/ui/AdaptiveImage";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import ProductComponentTags from "./ProductComponentTags";
import { StockIndicator } from "./StockIndicator";
import DiscountBadge from "./DiscountBadge";
import { ProductCardDetails } from "./ProductCardDetails";
import ProductCardPricing from "./ProductCardPricing";
import { ProductSwatches } from "./ProductSwatches";

const QuickPickDrawer = dynamic(
  () =>
    import("./QuickPickDrawer").then((m) => ({ default: m.QuickPickDrawer })),
  { ssr: false }
);

// ─── Skeleton ─────────────────────────────────────────────────────────

export function ProductCardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="mb-3 aspect-[4/5] rounded-xl bg-surface-container" />
      <div className="space-y-1.5">
        <div className="h-2 w-1/3 rounded-full bg-surface-container" />
        <div className="h-3 w-4/5 rounded-full bg-surface-container" />
        <div className="h-3 w-2/5 rounded-full bg-surface-container" />
        <div className="flex gap-1.5 pt-1">
          <div className="h-6 w-6 rounded-full bg-surface-container" />
          <div className="h-6 w-6 rounded-full bg-surface-container" />
          <div className="h-6 w-6 rounded-full bg-surface-container" />
        </div>
      </div>
    </div>
  );
}

// ─── Card ────────────────────────────────────────────────────────────────

interface ProductCardProps {
  product: ShopProduct;
  isBundle?: boolean;
  imagePriority?: boolean;
}

export const ProductCard = memo(function ProductCard({
  product,
  isBundle = false,
  imagePriority = false,
}: ProductCardProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeVariantId, setActiveVariantId] = useState<string | null>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const prevDisplayImageRef = useRef<string | null>(null);
  const addCartItem = useAddCartItem();
  const addStandardProduct = useCartStore((s) => s.addStandardProduct);
  const flyToCart = useFlyToCartStore((s) => s.flyToCart);
  const router = useRouter();
  const { user, loading: authLoading, signOut } = useAuth();

  const displayImage = useMemo(() => {
    if (activeVariantId) {
      const v = product.variants.find((vr) => vr.id === activeVariantId);
      if (v?.thumbnail) return v.thumbnail;
    }
    return product.thumbnail;
  }, [activeVariantId, product.variants, product.thumbnail]);

  const hasSwatches = useMemo(
    () => product.variants.some((v) => v.attributes?.color != null),
    [product.variants]
  );

  const buttonLabel = useMemo(() => {
    if (submitting) return "Đang thêm";
    if (product.stock_quantity === 0) return "Hết hàng";
    if (product.is_pre_order) return "Đặt trước";
    return "Thêm vào giỏ";
  }, [submitting, product.stock_quantity, product.is_pre_order]);

  useEffect(() => {
    if (hasSwatches && prevDisplayImageRef.current !== displayImage) {
      prevDisplayImageRef.current = displayImage;
    }
  }, [displayImage, hasSwatches]);

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (product.product_type === "kit") {
      setDrawerOpen(true);
      return;
    }

    addStandardToCart();
  };

  const addStandardToCart = async () => {
    if (authLoading) return;
    if (!user) {
      toast.error("Vui lòng đăng nhập để thêm vào giỏ hàng");
      const currentPath = window.location.pathname + window.location.search;
      router.push(`/login?next=${encodeURIComponent(currentPath)}`);
      return;
    }

    const selectedVariant = activeVariantId
      ? (product.variants.find((v) => v.id === activeVariantId) ??
        product.variants[0] ??
        null)
      : (product.variants[0] ?? null);

    setSubmitting(true);

    try {
      await addCartItem.mutateAsync({
        product_id: product.id,
        variant_id: selectedVariant?.id ?? null,
      });
    } catch (err) {
      if (err instanceof LoginRequiredError) {
        try {
          await signOut();
        } catch {
          // session already dead — still redirect
        }
        redirectToLogin(router);
        setSubmitting(false);
        return;
      }
      toast.error(
        err instanceof Error ? err.message : "Không thể thêm vào giỏ hàng"
      );
      setSubmitting(false);
      return;
    }

    addStandardProduct(
      { ...product, brand: product.brand ?? "" },
      selectedVariant,
      product.gifts
    );
    trackAddToCart(toGAProduct(product, selectedVariant));

    if (displayImage && imageRef.current) {
      flyToCart(displayImage, imageRef.current);
    }

    toast.success(`Đã thêm ${product.name} vào giỏ hàng!`);
    setSubmitting(false);
  };

  return (
    <>
        <div className="group relative flex h-full flex-col justify-between gap-2">
        <div
            ref={imageRef}
            className="relative mb-2 aspect-[1/1] overflow-hidden rounded-xl bg-surface-container"
            style={{
              boxShadow: "0 20px 40px -15px rgba(155,63,28,0.08)",
            }}
          >
            {/* Thumbnail or placeholder */}
            <Link href={`/shop/${product.slug}`} className="absolute inset-0">
            {displayImage ? (
              <>
                <Image
                  src={displayImage}
                  alt={product.name}
                  fill
                  priority={imagePriority}
                  className="object-cover"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                />
                {/* {hasSwatches && imageLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-surface-container/80">
                    <span className="loading loading-spinner loading-sm text-primary" />
                  </div>
                )} */}
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Package className="h-12 w-12 text-outline-variant" />
              </div>
            )}

            {product.stock_quantity > 0 ? (
              <>
                <DiscountBadge
                  discountPercent={product.discount_percentage || 0}
                />
                {product.gifts && product.gifts.length > 0 && (
                  <div className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded bg-rose-500 px-1.5 py-0.5 text-[10px] font-black uppercase text-white shadow-sm">
                    <span className="text-[10px] leading-none">🎁</span>
                    Quà tặng
                  </div>
                )}
                <ProductComponentTags horizontalTags={product?.tags} />
              </>
            ) : null}

            {!product.stock_quantity && (
              <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-surface/70">
                <p className="text-sm font-black uppercase tracking-[0.15em] text-on-surface-variant">
                  Hết hàng
                </p>
              </div>
            )}
            </Link>

            {!isBundle && product.variants.some((variant) => variant.attributes?.color != null) && (
              <div className="pointer-events-none absolute inset-y-0 right-0 z-20 hidden w-10 lg:block">
                <div className="pointer-events-auto relative">
                  <ProductSwatches
                    variants={product.variants}
                    activeVariantId={activeVariantId}
                    onSelect={setActiveVariantId}
                    productThumbnail={product.thumbnail}
                    layout="vertical"
                  />
                </div>
              </div>
            )}
        </div>

        <Link href={`/shop/${product.slug}`} className="block">
          <ProductCardDetails product={product} isBundle={isBundle} />
        </Link>

        <div className="mt-auto flex flex-col gap-0.5 overflow-hidden lg:overflow-visible">
          <ProductCardPricing product={product} />
          {!isBundle ? (
            <ProductSwatches
              variants={product.variants}
              activeVariantId={activeVariantId}
              onSelect={setActiveVariantId}
              productThumbnail={product.thumbnail}
            />
          ) : null}
          <StockIndicator stockQuantity={product.stock_quantity} />
          <div className="mt-2 flex items-center gap-1.5">
            <WishlistButton
              productId={product.id}
              product={product}
              size="sm"
              className="!h-9 !w-9 !min-w-9 shrink-0 rounded-xl lg:!h-10 lg:!w-10 lg:!min-w-10"
            />
            <button
              type="button"
              onClick={handleQuickAdd}
              aria-label={`Quick add ${product.name}`}
              disabled={product.stock_quantity === 0 || submitting}
              className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-2 text-[11px] font-bold text-surface transition-all lg:h-10 lg:px-3 lg:text-xs hover:bg-on-surface/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-on-surface/40 disabled:text-surface/70"
            >
              {submitting ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                <ShoppingCart size={15} className="shrink-0" />
              )}
              <span className="truncate">{buttonLabel}</span>
            </button>
          </div>
        </div>
      </div>

      {product.product_type === "kit" && drawerOpen && (
        <QuickPickDrawer
          product={product}
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
        />
      )}
    </>
  );
});
