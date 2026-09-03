import type {
  ComponentVariantRule,
  ConfiguratorGroup,
} from "@/app/api/products/[slug]/configurator/route";
import type {
  ProductDetail,
  ShopVariantDetail,
} from "@/app/api/products/[slug]/route";
import type { ShopVariant } from "@/app/api/products/route";
import type { Product, SelectedComponent } from "@/lib/data";
import { cartItemToGA, trackAddToCart } from "@/lib/analytics";
import { useAddCartItem } from "@/lib/react-query/cart/api/useCartMutations";
import { toast } from "@/lib/toast";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useCartStore } from "@/store";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export type UseProductViewDataReturn = {
  variants: ShopVariant[];
  groups: ConfiguratorGroup[];
  selections: Record<string, string[]>;
  select: (group: string, variantId: string) => void;
  selectedVariant: ShopVariant | null;
  selectedPreOrderConfig: ShopVariantDetail["pre_order_config"];
  loadingVariants: boolean;
  loadingConfigurator: boolean;
  missingVariantSelection: boolean;
  missingConfiguration: boolean;
  missingRequiredGroups: string[];
  effectiveStockQuantity: number;
  isOutOfStock: boolean;
  isLowStock: boolean;
  isLoadingAddToCart: boolean;
  handleAddToCart: (quantity?: number) => Promise<void>;
  disabledVariantIds: Set<string>;
  quantity: number;
  setQuantity: (q: number) => void;
};

/**
 * Manages selection state for the product detail page.
 * All product + component group data is server-provided — no client fetches.
 */
export function useProductViewData(
  product: ProductDetail,
  initialGroups: ConfiguratorGroup[] = [],
  initialRules: ComponentVariantRule[] = []
): UseProductViewDataReturn {
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [isLoadingAddToCart, setIsLoadingAddToCart] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const { addItem, openCart, items } = useCartStore();
  const addCartItem = useAddCartItem();
  const router = useRouter();
  const { user } = useAuth();

  // Auto-select when there is only one variant
  useEffect(() => {
    if (product.variants.length === 1) {
      setSelections({ __variant__: [product.variants[0].id] });
    }
  }, [product.variants]);

  // Reset selections when navigating to a different product
  useEffect(() => {
    setSelections({});
  }, [product.id]);

  const select = (group: string, variantId: string) => {
    setSelections((prev) => {
      const current = prev[group] ?? [];
      const groupDef = initialGroups.find((g) => g.component_group === group);
      // Required groups (and the simple-variant bucket) are single-select.
      if (group === "__variant__" || groupDef?.is_required) {
        const isSelected = current.includes(variantId);
        return {
          ...prev,
          [group]: isSelected ? [] : [variantId],
        };
      }
      // Optional groups allow multiple, bounded by max_quantity (null = unlimited).
      const isSelected = current.includes(variantId);
      if (isSelected) {
        return { ...prev, [group]: current.filter((id) => id !== variantId) };
      }
      const cap = groupDef?.max_quantity ?? groupDef?.variants.length ?? Infinity;
      if (cap > 0 && current.length >= cap) return prev;
      return { ...prev, [group]: [...current, variantId] };
    });
  };

  // All component group variants mapped to ShopVariant shape (with computed effective_price)
  const groupVariants = useMemo<ShopVariant[]>(
    () =>
      initialGroups.flatMap((g) =>
        g.variants.map((v) => ({
          id: v.id,
          variant_name: v.variant_name,
          price_adjustment: v.price_adjustment,
          effective_price: product.base_price + v.price_adjustment,
          thumbnail: v.thumbnail,
          stock_quantity: v.stock_quantity,
          is_pre_order: v.is_pre_order,
          pre_order_config: v.pre_order_config,
          attributes: v.attributes ?? null,
        }))
      ),
    [initialGroups, product.base_price]
  );

  // Resolve pre-order config for the currently selected variant
  const selectedPreOrderConfig = useMemo<
    ShopVariantDetail["pre_order_config"]
  >(() => {
    // Simple variant path
    const simpleId = selections["__variant__"]?.[0];
    if (simpleId) {
      const v = product.variants.find((v) => v.id === simpleId);
      if (v?.is_pre_order && v.pre_order_config) return v.pre_order_config;
    }
    // Component group path — first pre-order selected variant wins
    for (const group of initialGroups) {
      for (const selectedId of selections[group.component_group] ?? []) {
        const v = group.variants.find((gv) => gv.id === selectedId);
        if (v?.is_pre_order && v.pre_order_config) return v.pre_order_config;
      }
    }
    return null;
  }, [product.variants, initialGroups, selections]);

  // Derive selectedVariant only for simple variant products (not component-group kits)
  const selectedVariant = useMemo<ShopVariant | null>(() => {
    if (initialGroups.length > 0) return null;
    const simpleId = selections["__variant__"]?.[0];
    return (
      (product.variants.find((v) => v.id === simpleId) as ShopVariant) ?? null
    );
  }, [product.variants, selections, initialGroups]);

  const variants =
    product.variants.length > 0
      ? (product.variants as ShopVariant[])
      : groupVariants;

  const missingRequiredGroups = initialGroups
    .filter(
      (g) => g.is_required && (selections[g.component_group] ?? []).length === 0
    )
    .map((g) => g.component_group);
  const missingConfiguration = missingRequiredGroups.length > 0;
  const missingVariantSelection =
    product.variants.length > 0 && !selectedVariant;

  // For kit products, stock is the minimum across all selected component variants.
  // For simple variant products, use the selected variant's stock (inventory may
  // live on the variant rather than the product row). Falls back to
  // product.stock_quantity when nothing is resolved yet.
  const effectiveStockQuantity = useMemo(() => {
    if (initialGroups.length === 0) {
      return selectedVariant?.stock_quantity ?? product.stock_quantity;
    }
    const selectedVariants = initialGroups
      .flatMap((g) => selections[g.component_group] ?? [])
      .map((id) =>
        initialGroups
          .flatMap((g) => g.variants)
          .find((v) => v.id === id)
      )
      .filter((v): v is NonNullable<typeof v> => v !== undefined);
    if (selectedVariants.length === 0) return product.stock_quantity;
    return Math.min(...selectedVariants.map((v) => v.stock_quantity));
  }, [initialGroups, selections, product.stock_quantity, selectedVariant]);

  const isOutOfStock = effectiveStockQuantity === 0;
  const isLowStock = effectiveStockQuantity > 0 && effectiveStockQuantity <= 5;

  // Compute variant IDs disabled by conditional rules
  const disabledVariantIds = useMemo(() => {
    const disabled = new Set<string>();
    if (initialRules.length === 0) return disabled;
    const selectedIds = new Set(Object.values(selections).flat());
    // Build variant → component_product_id lookup
    const variantToProduct = new Map<string, string>();
    for (const group of initialGroups) {
      for (const v of group.variants) {
        if (v.component_product_id)
          variantToProduct.set(v.id, v.component_product_id);
      }
    }
    // Build component_product_id → all variant IDs
    const productVariants = new Map<string, string[]>();
    for (const [variantId, productId] of variantToProduct) {
      if (!productVariants.has(productId)) productVariants.set(productId, []);
      productVariants.get(productId)!.push(variantId);
    }
    for (const rule of initialRules) {
      if (!selectedIds.has(rule.condition_variant_id)) continue;
      const allVariants =
        productVariants.get(rule.target_component_product_id) ?? [];
      const allowed = new Set(rule.allowed_variant_ids);
      for (const vid of allVariants) {
        if (!allowed.has(vid)) disabled.add(vid);
      }
    }
    return disabled;
  }, [initialRules, initialGroups, selections]);

  const handleAddToCart = async (qty?: number) => {
    if (!user) {
      toast.error("Vui lòng đăng nhập để thêm vào giỏ hàng");
      router.push("/login");
      return;
    }
    if (product.variants.length > 0 && !selectedVariant) {
      toast.error("Please select a variant");
      return;
    }
    if (missingConfiguration) {
      toast.error(`Vui lòng chọn: ${missingRequiredGroups.join(", ")}`);
      return;
    }
    if (isOutOfStock) {
      toast.error("Out of stock");
      return;
    }

    const addQty = qty ?? 1;

    // Client-side pre-check against the cart before hitting the server, so the
    // stock/max limit is surfaced immediately. The server remains the
    // authoritative gate; this only improves UX.
    if (initialGroups.length > 0) {
      for (const group of initialGroups) {
        for (const selectedId of selections[group.component_group] ?? []) {
          const v = group.variants.find((gv) => gv.id === selectedId);
          if (!v) continue;
          const used = items.reduce(
            (sum, i) =>
              (i.components ?? []).some((c) => c.variant_id === v.id)
                ? sum + i.quantity
                : sum,
            0,
          );
          if (used + addQty > v.stock_quantity) {
            toast.error(`Chỉ còn ${v.stock_quantity} sản phẩm ${v.variant_name} trong kho`);
            return;
          }
        }
      }
    } else if (selectedVariant) {
      const used = items.reduce(
        (sum, i) => (i.variant?.id === selectedVariant.id ? sum + i.quantity : sum),
        0,
      );
      if (selectedVariant.stock_quantity != null && used + addQty > selectedVariant.stock_quantity) {
        toast.error(`Chỉ còn ${selectedVariant.stock_quantity} sản phẩm này trong kho`);
        return;
      }
    }

    setIsLoadingAddToCart(true);

    const components: SelectedComponent[] = initialGroups.flatMap((group) =>
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
            is_pre_order: v.is_pre_order,
            pre_order_config: v.pre_order_config,
          },
        ];
      })
    );

    try {
      if (initialGroups.length > 0) {
        await addCartItem.mutateAsync({
          product_id: product.id,
          components: components.map((c) => ({ variant_id: c.variant_id })),
        });
      } else if (selectedVariant) {
        await addCartItem.mutateAsync({
          product_id: product.id,
          variant_id: selectedVariant.id,
        });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể thêm vào giỏ hàng");
      setIsLoadingAddToCart(false);
      return;
    }

    const cartProduct: Product = {
      id: product.id,
      name: product.name,
      category: product.category,
      base_price: product.base_price,
      stock_quantity: product.stock_quantity,
      thumbnail: product.thumbnail,
      is_pre_order: product.is_pre_order,
      brand: product.brand ?? "",
    };

    addItem(
      cartProduct,
      initialGroups.length > 0 ? null : selectedVariant,
      components,
      product.gifts
    );
    trackAddToCart(
      cartItemToGA({
        product: cartProduct,
        variant: initialGroups.length > 0 ? null : selectedVariant,
        components,
        quantity: addQty,
      })
    );
    toast.success("Added to cart!");
    openCart();
    setIsLoadingAddToCart(false);
  };

  return {
    variants,
    groups: initialGroups,
    selections,
    select,
    selectedVariant,
    selectedPreOrderConfig,
    loadingVariants: false,
    loadingConfigurator: false,
    missingVariantSelection,
    missingConfiguration,
    missingRequiredGroups,
    effectiveStockQuantity,
    isOutOfStock,
    isLowStock,
    isLoadingAddToCart,
    handleAddToCart,
    disabledVariantIds,
    quantity,
    setQuantity,
  };
}
