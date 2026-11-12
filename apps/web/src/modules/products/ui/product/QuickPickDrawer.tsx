"use client";

import type { ShopProduct } from "@/modules/products/types";
import type { CategoryItem } from "@/modules/products/server/ssr";
import { useQuickPickDrawer } from "@/modules/products/ui/product/useQuickPickDrawer";
import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { QuickPickDesktopModal } from "./quick-pick-desktop/QuickPickDesktopModal";
import { QuickPickMobileDrawer } from "./QuickPickMobileDrawer";
import { useReducedMotion } from "motion/react";

const ImageViewer = dynamic(
  () => import("./ImageViewer").then((module) => ({ default: module.ImageViewer })),
  { ssr: false },
);

type QuickPickDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
} & (
  | { mode?: "product"; product: ShopProduct | null; category?: never }
  | { mode: "category"; category: CategoryItem | null; product?: never }
);

export type { QuickPickDrawerProps };

export function QuickPickDrawer(props: QuickPickDrawerProps) {
  const { isOpen, onClose } = props;
  const isCategoryMode = props.mode === "category";
  const propCategory = isCategoryMode ? (props.category ?? null) : null;
  const propProduct = isCategoryMode ? null : (props.product ?? null);
  const [isDesktop, setIsDesktop] = useState(false);
  const reduceMotion = useReducedMotion();

  // Start mobile for SSR/hydration consistency; update to desktop after mount.
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const drawer = useQuickPickDrawer({
    isOpen,
    onClose,
    isCategoryMode,
    propCategory,
    propProduct,
  });

  // Only desktop category mode auto-selects; mobile keeps the original list-first flow.
  useEffect(() => {
    if (!isDesktop || !isOpen || !isCategoryMode || !drawer.products.length) return;
    if (!drawer.selectedProductId) drawer.selectProduct(drawer.products[0].id);
  }, [isDesktop, isOpen, isCategoryMode, drawer.products, drawer.selectedProductId, drawer.selectProduct]);

  const [viewerStart, setViewerStart] = useState<string | null>(null);
  const viewerImages = useMemo(() => {
    const all = [
      viewerStart,
      drawer.activeThumbnail,
      drawer.activeProduct?.thumbnail,
      ...(drawer.activeProduct?.images ?? []),
    ];
    return Array.from(new Set(all.filter(Boolean))) as string[];
  }, [viewerStart, drawer.activeThumbnail, drawer.activeProduct]);

  const openViewerAt = useCallback(
    (image: string) => {
      setViewerStart(image);
      drawer.openViewer();
    },
    [drawer]
  );

  const closeViewer = useCallback(() => {
    setViewerStart(null);
    drawer.closeViewer();
  }, [drawer]);

  const presentationProps = {
    isOpen,
    onClose,
    isCategoryMode,
    drawer,
    onShowImage: openViewerAt,
    reduceMotion: Boolean(reduceMotion),
    viewerImages,
    onCloseViewer: closeViewer,
  };

  return (
    <>
      {isDesktop ? (
        <QuickPickDesktopModal
          isOpen={isOpen}
          onClose={onClose}
          isCategoryMode={isCategoryMode}
          drawer={drawer}
          onShowImage={openViewerAt}
          reduceMotion={Boolean(reduceMotion)}
        />
      ) : (
        <QuickPickMobileDrawer {...presentationProps} />
      )}
      <ImageViewer
        images={viewerImages}
        initialIndex={0}
        isOpen={drawer.imageViewerOpen}
        onClose={closeViewer}
      />
    </>
  );
}
