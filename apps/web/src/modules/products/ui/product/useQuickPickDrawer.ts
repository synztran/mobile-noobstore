"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  ComponentVariantRule,
  ConfiguratorGroup,
  ShopProduct,
  ShopVariant,
} from "@/modules/products/types";
import type { CategoryItem } from "@/modules/products/server/ssr";
import type { SelectedComponent } from "@/lib/data";
import {
  kitPriceOverrides,
  resolveKitUnitPrice,
} from "@/modules/products/kit-pricing";
import { trackAddToCart, toGAProduct } from "@/lib/analytics";
import { usePreventScroll } from "@/hooks/usePreventScroll";
import { toast } from "@/lib/toast";
import { useCartStore } from "@/modules/cart/client/hooks/useCartStore";
import { useAddCartItem } from "@/modules/cart/client/react-query/mutations";
import { useQuickPick } from "@/modules/products/client/queries";
import { useAuth } from "@/modules/user/client/AuthProvider";
import {
  LoginRequiredError,
  redirectToLogin,
} from "@/modules/user/client/login-redirect";

type UseQuickPickDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  isCategoryMode: boolean;
  propCategory: CategoryItem | null;
  propProduct: ShopProduct | null;
};

export function useQuickPickDrawer(props: UseQuickPickDrawerProps) {
  const {
    isOpen,
    onClose,
    isCategoryMode,
    propCategory,
    propProduct,
  } = props;

  // ── State ────────────────────────────────────────────────────────────────
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  // ── External hooks ───────────────────────────────────────────────────────
  const { addItem, openCart, items: cartItems } = useCartStore();
  const router = useRouter();
  const { user, loading: authLoading, signOut } = useAuth();
  const addCartItem = useAddCartItem();

  const requestKey = isCategoryMode
    ? `category:${propCategory?.slug ?? ""}`
    : `product:${propProduct?.id ?? ""}`;

  const quickPickQuery = useQuickPick(
    requestKey,
    isOpen,
    "",
    "",
    isCategoryMode ? selectedProductId ?? "" : propProduct?.id ?? ""
  );
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

  const brandAlternativesQuery = useQuickPick(
    `brand:${activeProduct?.brand ?? ""}`,
    isOpen && isCategoryMode && Boolean(activeProduct?.brand),
    activeProduct?.brand ?? "",
    activeProduct?.id ?? ""
  );
  const brandAlternatives = (
    brandAlternativesQuery.data?.brandAlternatives ?? []
  ).filter((item) => item.id !== activeProduct?.id);

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

// Every component variant currently picked, flattened across groups. Shared by
  // the price preview and the submit payload so the two can never disagree.
  const selectedComponents = useMemo<SelectedComponent[]>(
    () =>
      groups.flatMap((group) =>
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
      ),
    [groups, selections]
  );

// Compute enriched groups with effective price adjustments based on current selections
  const enrichedGroups = useMemo(() => {
    const selectedComponentIds = Object.entries(selections)
      .filter(([g]) => g !== "__variant__")
      .flatMap(([, ids]) => ids);
    const selectedVariantIdEnr = selections["__variant__"]?.[0];
    const conditionIds = [
      ...(selectedVariantIdEnr ? [selectedVariantIdEnr] : []),
      ...selectedComponentIds,
    ];
    const overrides = kitPriceOverrides(productRules, conditionIds);
    return groups.map((g) => ({
      ...g,
      variants: g.variants.map((v) => {
        const ov = Object.prototype.hasOwnProperty.call(overrides, v.id)
          ? overrides[v.id]
          : undefined;
        const effective =
          typeof ov === "number" && Number.isFinite(ov) ? ov : v.price_adjustment;
        return {
          ...v,
          effective_price_adjustment: effective,
        };
      }),
    }));
  }, [groups, productRules, selections]);

// The product's own selected variant. Kits resolve this too now — a kit
  // variant is a real choice (colourway) with its own price that arms the
  // compatibility rules. It is NOT a stock pool for a kit: availability comes
  // from the component variants.
  const selectedSimpleVariant = useMemo(
    () =>
      activeProduct?.variants.find(
        (v) => v.id === selections["__variant__"]?.[0]
      ) ?? null,
    [activeProduct, selections]
  );

  // ── Price ─────────────────────────────────────────────────────────────────
  const hasComponents = groups.length > 0;
  const kitVariantId = selectedSimpleVariant?.id ?? null;
  // A rule's condition may be the kit's own variant or one of its component
  // variants — the live catalogue authors them the second way (e.g. YOK
  // Switches keys off the "Purple" variant of its Version component), so both
  // go into the candidate set.
  const conditionVariantIds = [
    ...(kitVariantId ? [kitVariantId] : []),
    ...selectedComponents.map((c) => c.variant_id),
  ];
  const pricing = resolveKitUnitPrice({
    basePrice: activeProduct?.base_price ?? 0,
    kitVariant: selectedSimpleVariant,
    components: selectedComponents,
    overrides: kitPriceOverrides(productRules, conditionVariantIds),
  });
  const totalPrice = pricing.unitPrice;
  const componentAdjustment = pricing.contributions.reduce(
    (sum, c) => sum + (c.price_adjustment ?? 0),
    0
  );

  // The cart snapshot carries each component's RESOLVED contribution, so the
  // cart header, the cart row and the checkout summary all show the overridden
  // price without needing the rules. Checkout recomputes from the DB anyway.
  const resolvedComponents = useMemo<SelectedComponent[]>(
    () =>
      selectedComponents.map((component, index) => ({
        ...component,
        price_adjustment: pricing.contributions[index]?.price_adjustment ?? 0,
      })),
    [selectedComponents, pricing.contributions]
  );

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

  // Currently selected variant(s) that drive delivery/pickup availability.
  // Simple products contribute a single variant from `__variant__`; kit
  // products contribute every selected component variant. Empty = nothing
  // selected yet (section falls back to the product's variants).
  const selectedVariants = useMemo<ShopVariant[]>(() => {
    if (groups.length === 0) {
      const simpleId = selections["__variant__"]?.[0];
      const v = simpleId
        ? activeProduct?.variants.find((x) => x.id === simpleId)
        : null;
      return v ? [v] : [];
    }
    const out: ShopVariant[] = [];
    for (const group of groups) {
      for (const selectedId of selections[group.component_group] ?? []) {
        const v = group.variants.find((gv) => gv.id === selectedId);
        if (v) out.push(v as ShopVariant);
      }
    }
    return out;
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
  // ── Linked image ──────────────────────────────────────────────────────────
  // Track the option the customer tapped most recently so the header image can
  // reflect it when the variant carries a linked photo.
  const [lastInteractedVariantId, setLastInteractedVariantId] = useState<
    string | null
  >(null);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);

  const activeThumbnail = useMemo(() => {
    if (lastInteractedVariantId && activeProduct) {
      const variant =
        activeProduct.variants.find((v) => v.id === lastInteractedVariantId) ??
        groups
          .flatMap((g) => g.variants)
          .find((v) => v.id === lastInteractedVariantId);
      if (variant?.thumbnail) return variant.thumbnail;
    }
    return activeProduct?.thumbnail ?? null;
  }, [lastInteractedVariantId, activeProduct, groups]);

  const openViewer = useCallback(() => setImageViewerOpen(true), []);
  const closeViewer = useCallback(() => setImageViewerOpen(false), []);

  const onSelect = (group: string, variantId: string) => {
    // Show the tapped option's linked image when it's being added (deselect
    // keeps the previous image until another option is picked).
    const currentlySelected = (selections[group] ?? []).includes(variantId);
    if (!currentlySelected) {
      setLastInteractedVariantId(variantId);
    }

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
    if (authLoading) return;
    if (!user) {
      toast.error("Vui lòng đăng nhập để thêm vào giỏ hàng");
      const currentPath = window.location.pathname + window.location.search;
      router.push(`/login?next=${encodeURIComponent(currentPath)}`);
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
              (cartItem.components ?? []).some(
                (c) => c.variant_id === v.id
              )
                ? sum + cartItem.quantity
                : sum,
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
      if (err instanceof LoginRequiredError) {
        try {
          await signOut();
        } catch {
          // session already dead — still redirect
        }
        redirectToLogin(router);
        return;
      }
      toast.error(
        err instanceof Error ? err.message : "Không thể thêm vào giỏ hàng"
      );
      return;
    }

    addItem(
      { ...activeProduct, brand: activeProduct.brand ?? "" },
      selectedSimpleVariant,
      hasComponents ? resolvedComponents : undefined,
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
    brandAlternatives,
    loadingBrandAlternatives: brandAlternativesQuery.isFetching,
    activeProduct,
    groups: enrichedGroups,
    productRules,
    selections,
    submitting,
    selectedProductId,
    view,
    loadingProducts,
    loadingConfigurator,
    loadingGallery: quickPickQuery.isFetching,
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
    selectedVariants,
    activeThumbnail,
    imageViewerOpen,
    openViewer,
    closeViewer,
    headerCategory,
    headerTitle,
    handleAdd,
    onSelect,
    selectProduct,
    backToList,
  };
}
