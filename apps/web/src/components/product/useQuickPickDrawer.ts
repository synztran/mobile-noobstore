"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  ComponentVariantRule,
  ConfiguratorGroup,
} from "@/app/api/products/[slug]/configurator/route";
import type { ShopProduct } from "@/app/api/products/route";
import type { CategoryItem } from "@/lib/products-server";
import type { SelectedComponent } from "@/lib/data";
import { trackAddToCart, toGAProduct } from "@/lib/analytics";
import { usePreventScroll } from "@/hooks/usePreventScroll";
import { toast } from "@/lib/toast";
import { useCartStore } from "@/store";
import { useAddCartItem } from "@/lib/react-query/cart/api/useCartMutations";
import { useQuickPick } from "@/lib/react-query/product/api/useProductQueries";
import { useAuth } from "@/lib/auth/AuthProvider";

type UseQuickPickDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  isCategoryMode: boolean;
  propCategory: CategoryItem | null;
  propProduct: ShopProduct | null;
};

export function useQuickPickDrawer(props: UseQuickPickDrawerProps) {
  const { isOpen, onClose, isCategoryMode, propCategory, propProduct } = props;

  // ── State ────────────────────────────────────────────────────────────────
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  // ── External hooks ───────────────────────────────────────────────────────
  const { addItem, openCart, items: cartItems } = useCartStore();
  const router = useRouter();
  const { user } = useAuth();
  const addCartItem = useAddCartItem();

  const requestKey = isCategoryMode
    ? `category:${propCategory?.slug ?? ""}`
    : `product:${propProduct?.id ?? ""}`;

  const quickPickQuery = useQuickPick(requestKey, isOpen);

  // ── Derived data ─────────────────────────────────────────────────────────
  const view = isCategoryMode
    ? (selectedProductId ? "configurator" : "product-list")
    : "configurator";

  const products = quickPickQuery.data?.products ?? [];
  const configuratorData = quickPickQuery.data?.configuratorByProductId ?? {};
  const rulesData = quickPickQuery.data?.rulesByProductId ?? {};

  const activeProduct = quickPickQuery.data?.activeProduct ?? (
    isCategoryMode
      ? (selectedProductId ? products.find((p) => p.id === selectedProductId) ?? null : null)
      : propProduct
  );

  const groups = configuratorData[activeProduct?.id ?? ""] ?? [];
  const productRules = rulesData[activeProduct?.id ?? ""] ?? [];

  const loadingProducts = isCategoryMode && quickPickQuery.isFetching;
  const loadingConfigurator = !isCategoryMode && quickPickQuery.isFetching;

  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) {
      setSelections({});
      setSubmitting(false);
      setSelectedProductId(null);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelections({});
  }, [activeProduct?.id]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  usePreventScroll(isOpen);

  // ── Disabled variants ─────────────────────────────────────────────────────
  const disabledVariantIds = useMemo(() => {
    const disabled = new Set<string>();
    if (productRules.length === 0) return disabled;
    const selectedIds = new Set(Object.values(selections).flat());
    const variantToProduct = new Map<string, string>();
    for (const group of groups) {
      for (const v of group.variants) {
        if (v.component_product_id)
          variantToProduct.set(v.id, v.component_product_id);
      }
    }
    const productVariants = new Map<string, string[]>();
    for (const [variantId, productId] of variantToProduct) {
      if (!productVariants.has(productId)) productVariants.set(productId, []);
      productVariants.get(productId)!.push(variantId);
    }
    for (const rule of productRules as ComponentVariantRule[]) {
      if (!selectedIds.has(rule.condition_variant_id)) continue;
      const allVariants =
        productVariants.get(rule.target_component_product_id) ?? [];
      const allowed = new Set(rule.allowed_variant_ids);
      for (const vid of allVariants) {
        if (!allowed.has(vid)) disabled.add(vid);
      }
    }
    return disabled;
  }, [productRules, selections, groups]);

  // ── Price ─────────────────────────────────────────────────────────────────
  const componentAdjustment = groups.reduce((sum, group) => {
    const ids = selections[group.component_group] ?? [];
    let groupSum = 0;
    for (const id of ids) {
      const v = group.variants.find((gv) => gv.id === id);
      groupSum += v?.price_adjustment ?? 0;
    }
    return sum + groupSum;
  }, 0);

  const hasComponents = groups.length > 0;
  const totalPrice = (activeProduct?.base_price ?? 0) + componentAdjustment;

  const missingRequired = groups
    .filter(
      (g) => g.is_required && (selections[g.component_group] ?? []).length === 0
    )
    .map((g) => g.component_group);
  const canAdd = missingRequired.length === 0;
  const isSubmittingOrPending = submitting || addCartItem.isPending;
  const isFetchingVariants = quickPickQuery.isFetching || loadingConfigurator;
  const isInvalidPrice = totalPrice <= 0;

  // ── Pre-order config ──────────────────────────────────────────────────────
  const selectedPreOrderConfig = useMemo(() => {
    if (!activeProduct) return null;
    const simpleSelectedId = selections["__variant__"]?.[0];
    if (simpleSelectedId) {
      const v = activeProduct.variants.find((v) => v.id === simpleSelectedId);
      if (v?.is_pre_order && v.pre_order_config) return v.pre_order_config;
    }
    for (const group of groups) {
      for (const selectedId of selections[group.component_group] ?? []) {
        const v = group.variants.find((gv) => gv.id === selectedId);
        if (v?.is_pre_order && v.pre_order_config) return v.pre_order_config;
      }
    }
    return null;
  }, [activeProduct, selections, groups]);

  // ── Header ────────────────────────────────────────────────────────────────
  const headerCategory = isCategoryMode
    ? (propCategory?.name ?? "")
    : (activeProduct?.category ?? "");

  const headerTitle =
    view === "configurator" && activeProduct
      ? activeProduct.name
      : headerCategory;

  // ── Actions ───────────────────────────────────────────────────────────────
  const onSelect = (group: string, variantId: string) => {
    setSelections((prev) => {
      const current = prev[group] ?? [];
      const groupDef = groups.find((g) => g.component_group === group);
      if (group === "__variant__" || groupDef?.is_required) {
        const isSelected = current.includes(variantId);
        return {
          ...prev,
          [group]: isSelected ? [] : [variantId],
        };
      }
      const isSelected = current.includes(variantId);
      if (isSelected) {
        return { ...prev, [group]: current.filter((id) => id !== variantId) };
      }
      const cap =
        groupDef?.max_quantity ?? groupDef?.variants.length ?? Infinity;
      if (cap > 0 && current.length >= cap) return prev;
      return { ...prev, [group]: [...current, variantId] };
    });
  };

  const selectProduct = (id: string) => {
    setSelectedProductId(id);
    setSelections({});
  };

  const backToList = () => {
    setSelectedProductId(null);
    setSelections({});
  };

  const handleAdd = async () => {
    if (!user) {
      toast.error("Vui lòng đăng nhập để thêm vào giỏ hàng");
      router.push("/login");
      return;
    }
    if (isInvalidPrice) {
      toast.error("Sản phẩm chưa được cập nhật giá, vui lòng liên hệ shop");
      return;
    }
    if (!activeProduct) return;
    if (!canAdd) {
      toast.error(`Vui lòng chọn: ${missingRequired.join(", ")}`);
      return;
    }

    const selectedVariantId = selections["__variant__"]?.[0] ?? null;
    const isKit = activeProduct.product_type === "kit";

    const selectedSimpleVariant = !hasComponents
      ? (activeProduct.variants.find((v) => v.id === selectedVariantId) ?? null)
      : null;

    if (isKit) {
      const insufficientComponents: string[] = [];
      for (const group of groups) {
        const selectedIds = selections[group.component_group] ?? [];
        for (const selectedId of selectedIds) {
          const v = group.variants.find((gv) => gv.id === selectedId);
          if (!v) continue;

          const usedQty = cartItems.reduce(
            (sum, cartItem) =>
              sum +
              (cartItem.components ?? []).filter((c) => c.variant_id === v.id)
                .length,
            0
          );

          if (usedQty + 1 > v.stock_quantity) {
            insufficientComponents.push(
              `"${v.variant_name}" (còn ${v.stock_quantity})`
            );
          }
        }
      }
      if (insufficientComponents.length > 0) {
        toast.warning(`Không đủ hàng: ${insufficientComponents.join(", ")}`);
        return;
      }
    } else {
      const availableStock =
        selectedSimpleVariant?.stock_quantity ?? activeProduct.stock_quantity;
      const existingCartItem = cartItems.find(
        (i) =>
          i.product.id === activeProduct.id &&
          (i.variant?.id ?? null) === selectedVariantId
      );
      const currentQty = existingCartItem?.quantity ?? 0;
      if (currentQty + 1 > availableStock) {
        toast.warning(`Chỉ còn ${availableStock} sản phẩm trong kho`);
        return;
      }
    }

    setSubmitting(true);

    const components: SelectedComponent[] = groups.flatMap((group) =>
      (selections[group.component_group] ?? []).flatMap((selectedId) => {
        const v = group.variants.find((gv) => gv.id === selectedId);
        if (!v) return [];
        return [
          {
            variant_id: v.id,
            variant_name: v.variant_name,
            component_group: group.component_group,
            price_adjustment: v.price_adjustment,
            thumbnail: v.thumbnail,
            is_pre_order: v.is_pre_order ?? false,
            pre_order_config: v.pre_order_config ?? null,
          },
        ];
      })
    );

    try {
      const body = {
        product_id: activeProduct.id,
        variant_id: hasComponents ? null : selectedSimpleVariant?.id ?? null,
        components: hasComponents
          ? components.map((c) => ({ variant_id: c.variant_id }))
          : undefined,
      };
      await addCartItem.mutateAsync(body);
    } catch (err) {
      setSubmitting(false);
      toast.error(
        err instanceof Error ? err.message : "Không thể thêm vào giỏ hàng"
      );
      return;
    }

    addItem(
      { ...activeProduct },
      selectedSimpleVariant,
      hasComponents ? components : undefined,
      activeProduct.gifts
    );

    trackAddToCart(toGAProduct(activeProduct, selectedSimpleVariant));

    setSubmitting(false);
    toast.success("Đã thêm vào giỏ hàng!");
    onClose();
    openCart();
  };

  return {
    products,
    activeProduct,
    groups,
    productRules,
    selections,
    submitting,
    selectedProductId,
    view,
    loadingProducts,
    loadingConfigurator,
    isFetchingVariants,
    isSubmittingOrPending,
    disabledVariantIds,
    componentAdjustment,
    hasComponents,
    totalPrice,
    missingRequired,
    canAdd,
    isInvalidPrice,
    selectedPreOrderConfig,
    headerCategory,
    headerTitle,
    handleAdd,
    onSelect,
    selectProduct,
    backToList,
  };
}
