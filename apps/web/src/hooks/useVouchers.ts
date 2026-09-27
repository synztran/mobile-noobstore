"use client";

import { useIsMounted } from "@/hooks/useIsMounted";
import {
  useEligibleVouchers,
  useFeesConfig,
  useVoucherList,
} from "@/lib/react-query/voucher/api/useVoucherQueries";
import { useApplyVouchers } from "@/lib/react-query/voucher/api/useVoucherMutations";
import { useDiscountStore } from "@/store";
import { sameShippingMethod } from "@/lib/shipping-method";
import {
  computeVoucherDiscount,
  totalVoucherDiscount,
} from "@/lib/voucher-discount";
import type { VoucherApplyItem, VoucherRow } from "@/types/voucher";
import { useEffect, useMemo, useState } from "react";

type UseVouchersParams = {
  initialVouchers?: VoucherRow[];
  subtotal?: number;
  shippingCost?: number;
  shippingMethodId?: string;
  items?: VoucherApplyItem[];
};

export function useVouchers({
  initialVouchers = [],
  subtotal = 0,
  shippingCost = 0,
  shippingMethodId,
  items = [],
}: UseVouchersParams) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const appliedVouchers = useDiscountStore((s) => s.appliedVouchers);
  const totalDiscountAmount = useDiscountStore((s) => s.totalDiscountAmount);
  const totalShippingDiscountAmount = useDiscountStore(
    (s) => s.totalShippingDiscountAmount
  );
  const maxVouchersPerOrder = useDiscountStore((s) => s.maxVouchersPerOrder);
  const setMaxVouchersPerOrder = useDiscountStore(
    (s) => s.setMaxVouchersPerOrder
  );

  const voucherListQuery = useVoucherList(initialVouchers);
  const feesQuery = useFeesConfig();
  const productIds = useMemo(
    () => [...new Set(items.map((i) => i.product_id))],
    [items]
  );
  const variantIds = useMemo(
    () => [...new Set(items.flatMap((i) => i.variant_ids ?? []))],
    [items]
  );
  const eligibleQuery = useEligibleVouchers(
    productIds,
    variantIds,
    shippingMethodId
  );
  const applyVouchersMutation = useApplyVouchers();
  // Sync store-level max vouchers config from the fees query.
  useEffect(() => {
    const max = feesQuery.data?.maxVouchersPerOrder;
    if (max && max > 0) {
      setMaxVouchersPerOrder(max);
    }
  }, [feesQuery.data?.maxVouchersPerOrder, setMaxVouchersPerOrder]);

  const vouchers = voucherListQuery.data ?? [];
  const eligibleVouchers = eligibleQuery.data?.vouchers ?? [];
  const categorySlugByProductId =
    eligibleQuery.data?.categorySlugByProductId ?? {};
  // Server-resolved scope pool (includes kit component variant owners).
  const ownedProductIds = eligibleQuery.data?.ownedProductIds ?? productIds;
  const loadingVouchers = voucherListQuery.isLoading;
  const error = voucherListQuery.error
    ? voucherListQuery.error.message
    : null;

  const appliedIdsRef = useMemo(
    () => new Set(appliedVouchers.map((v) => v.voucherInfo.voucher_id)),
    [appliedVouchers]
  );

  // Rough item base for a product/category voucher, used only to RANK
  // auto-apply candidates. It deliberately skips the kit component
  // variant-owner resolution the server does in computeScopeBase, so kit lines
  // can be slightly under-counted here. Ordering only — the real number is
  // recomputed authoritatively by /api/vouchers/apply.
  const estimateOrderBase = (v: VoucherRow): number => {
    const excluded = new Set(v.excluded_product_ids ?? []);

    if (v.scope_type === 'product') {
      const targets = new Set(v.applies_to_product_ids ?? []);
      if (targets.size === 0) return 0;
      return items
        .filter((i) => targets.has(i.product_id) && !excluded.has(i.product_id))
        .reduce((sum, i) => sum + i.unit_price * i.quantity, 0);
    }

    if (v.scope_type === 'category') {
      const targets = new Set(v.applies_to_category_slugs ?? []);
      if (targets.size === 0) return 0;
      return items
        .filter((i) => {
          const slug = i.category_slug ?? categorySlugByProductId[i.product_id];
          return slug != null && targets.has(slug) && !excluded.has(i.product_id);
        })
        .reduce((sum, i) => sum + i.unit_price * i.quantity, 0);
    }

    return subtotal;
  };

  // Real saving in VND, so a 50%-of-shipping voucher outranks a flat 20,000₫
  // order voucher when they compete for the same slot. Comparing the raw
  // amount_off against a raw percent_off (as this did before) ranked any
  // percentage voucher below any VND amount.
  const estimatedSaving = (v: VoucherRow): number =>
    totalVoucherDiscount(
      computeVoucherDiscount(v, {
        orderBase: estimateOrderBase(v),
        shippingCost,
      })
    );

  // Auto-apply eligible scoped + customer vouchers when cart items exist.
  // Sorted by real discount (highest first) so the best voucher is picked.
  useEffect(() => {
    if (items.length === 0 || eligibleVouchers.length === 0) return;

    // Skip vouchers already applied by the user
    const already = new Set(
      appliedVouchers.map((v) => v.voucherInfo.voucher_id)
    );
    const candidates = eligibleVouchers
      .filter((v) => !already.has(v.id));

    // Sort by estimated discount descending — highest discount first
    const sorted = [...candidates].sort(
      (a, b) => estimatedSaving(b) - estimatedSaving(a)
    );

    const toApply = sorted.map((v) => v.id);

    const remainingSlots = Math.max(
      0,
      maxVouchersPerOrder - appliedVouchers.length
    );
    if (toApply.length === 0 || remainingSlots <= 0) return;

    applyVouchersMutation.mutate({
      voucherIds: [
        ...appliedVouchers.map((v) => v.voucherInfo.voucher_id),
        ...toApply.slice(0, remainingSlots),
      ],
      subtotal,
      shippingCost,
      shippingMethodId,
      items,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    items,
    subtotal,
    shippingCost,
    shippingMethodId,
    eligibleVouchers,
    appliedVouchers,
    maxVouchersPerOrder,
  ]);

  // Prune applied vouchers that are no longer valid for the current checkout
  // context (shipping method, min order, scope). Only runs on /checkout/summary
  // where a shippingMethodId is provided.
  useEffect(() => {
    if (!shippingMethodId) return;
    if (appliedVouchers.length === 0) return;

    const invalidIds = appliedVouchers
      .filter((entry) => {
        const { scope_type } = entry.voucherInfo;
        const rule = entry.voucherInfo.rule;

        // Shipping-method restriction (empty list = unrestricted)
        const allowedMethods = rule.applies_to_shipping_methods ?? [];
        if (
          allowedMethods.length > 0 &&
          !allowedMethods.some((m) => sameShippingMethod(m, shippingMethodId))
        ) {
          return true;
        }

        // Min order amount
        if (rule.min_order_amount > 0 && subtotal < rule.min_order_amount) {
          return true;
        }

        // Product scope: require at least one matching (non-excluded) item
        // in the scope pool (which also covers kit component variant owners)
        if (scope_type === "product") {
          const targets = new Set(rule.applies_to_product_ids ?? []);
          const excluded = new Set(rule.excluded_product_ids ?? []);
          const matches = ownedProductIds.some(
            (pid) => targets.has(pid) && !excluded.has(pid)
          );
          if (!matches) return true;
        }

        // Category scope: require at least one matching (non-excluded) item
        // in the scope pool (also covers kit component variant owners)
        if (scope_type === "category") {
          // Wait for the eligible query to resolve product → category slugs
          // before judging category scope, to avoid pruning during hydration.
          if (Object.keys(categorySlugByProductId).length === 0) {
            return false;
          }
          const targets = new Set(rule.applies_to_category_slugs ?? []);
          const excluded = new Set(rule.excluded_product_ids ?? []);
          const matches = ownedProductIds.some((pid) => {
            if (excluded.has(pid)) return false;
            const slug = categorySlugByProductId[pid];
            return targets.has(slug ?? "");
          });
          if (!matches) return true;
        }

        return false;
      })
      .map((entry) => entry.voucherInfo.voucher_id);

    if (invalidIds.length > 0) {
      useDiscountStore.getState().pruneAppliedVouchers(invalidIds);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shippingMethodId, appliedVouchers, subtotal, items, categorySlugByProductId, ownedProductIds]);

  // Include auto-applied scoped/customer vouchers so they show in the drawer.
  const autoAppliedRows = eligibleVouchers.filter((v) =>
    appliedIdsRef.has(v.id)
  );

  const displayVouchers = useMemo(() => {
    const merged = [...vouchers, ...autoAppliedRows];
    const seen = new Set<string>();
    return merged.filter((v) => {
      if (seen.has(v.id)) return false;
      seen.add(v.id);
      return true;
    });
  }, [vouchers, autoAppliedRows]);

  const isVoucherValid = (voucher: VoucherRow): boolean => {
    if (voucher.status !== "active" || voucher.deleted_at) {
      return false;
    }

    const now = new Date();
    if (voucher.start_at) {
      const startDate = new Date(voucher.start_at);
      if (now < startDate) return false;
    }
    if (voucher.end_at) {
      const endDate = new Date(voucher.end_at);
      if (now > endDate) return false;
    }

    if (voucher.min_order_amount > 0 && subtotal < voucher.min_order_amount) {
      return false;
    }

    return true;
  };

  const filteredVouchers = useMemo(() => {
    if (!searchQuery.trim()) return displayVouchers;

    const query = searchQuery.toLowerCase();
    return displayVouchers.filter(
      (v) =>
        v.code?.toLowerCase().includes(query) ||
        v.description?.toLowerCase().includes(query)
    );
  }, [searchQuery, displayVouchers]);

  const isMounted = useIsMounted();

  const validVouchers = isMounted
    ? filteredVouchers.filter(isVoucherValid)
    : filteredVouchers;
  const invalidVouchers = isMounted
    ? filteredVouchers.filter((v) => !isVoucherValid(v))
    : [];

  return {
    drawerOpen,
    setDrawerOpen,
    searchQuery,
    setSearchQuery,
    appliedVouchers,
    totalDiscountAmount,
    totalShippingDiscountAmount,
    maxVouchersPerOrder,
    loadingVouchers,
    error,
    displayVouchers,
    filteredVouchers,
    validVouchers,
    invalidVouchers,
    applyingVoucher: applyVouchersMutation.isPending,
    removeAppliedVoucher: (voucherId: string) =>
      useDiscountStore.getState().removeAppliedVoucher(voucherId),
    subtotal,
    shippingCost,
    items,
  };
}
