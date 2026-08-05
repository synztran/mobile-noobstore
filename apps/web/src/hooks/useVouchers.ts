"use client";

import { useIsMounted } from "@/hooks/useIsMounted";
import {
  useEligibleVouchers,
  useFeesConfig,
  useVoucherList,
} from "@/lib/react-query/voucher/api/useVoucherQueries";
import { useApplyVouchers } from "@/lib/react-query/voucher/api/useVoucherMutations";
import { useDiscountStore } from "@/store";
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
  const eligibleQuery = useEligibleVouchers(productIds, shippingMethodId);
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
  const loadingVouchers = voucherListQuery.isLoading;
  const error = voucherListQuery.error
    ? voucherListQuery.error.message
    : null;

  const appliedIdsRef = useMemo(
    () => new Set(appliedVouchers.map((v) => v.voucherInfo.voucher_id)),
    [appliedVouchers]
  );

  // Auto-apply eligible scoped + customer vouchers when cart items exist.
  useEffect(() => {
    if (items.length === 0 || eligibleVouchers.length === 0) return;

    // Skip vouchers already applied by the user
    const already = new Set(
      appliedVouchers.map((v) => v.voucherInfo.voucher_id)
    );
    const toApply = eligibleVouchers
      .map((v) => v.id)
      .filter((id) => !already.has(id));

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
          !allowedMethods.includes(shippingMethodId)
        ) {
          return true;
        }

        // Min order amount
        if (rule.min_order_amount > 0 && subtotal < rule.min_order_amount) {
          return true;
        }

        // Product scope: require at least one matching (non-excluded) cart item
        if (scope_type === "product") {
          const targets = new Set(rule.applies_to_product_ids ?? []);
          const excluded = new Set(rule.excluded_product_ids ?? []);
          const matches = items.some(
            (i) => targets.has(i.product_id) && !excluded.has(i.product_id)
          );
          if (!matches) return true;
        }

        // Category scope: require at least one matching (non-excluded) cart item
        if (scope_type === "category") {
          // Wait for the eligible query to resolve product → category slugs
          // before judging category scope, to avoid pruning during hydration.
          if (Object.keys(categorySlugByProductId).length === 0) {
            return false;
          }
          const targets = new Set(rule.applies_to_category_slugs ?? []);
          const excluded = new Set(rule.excluded_product_ids ?? []);
          const matches = items.some((i) => {
            if (excluded.has(i.product_id)) return false;
            const slug = i.category_slug ?? categorySlugByProductId[i.product_id];
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
  }, [shippingMethodId, appliedVouchers, subtotal, items, categorySlugByProductId]);

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
