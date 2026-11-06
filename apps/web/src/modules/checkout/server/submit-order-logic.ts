import type { Json } from "@/lib/supabase/database.types";
import type { VoucherGiftItem } from "@/types/voucher";
import {
  computeVoucherDiscount,
  isShippingReward,
} from "@/lib/voucher-discount";
import {
  isFeePendingShippingMethod,
  sameShippingMethod,
} from "@/lib/shipping-method";
import type { SubmitOrderRequestItem } from "@/modules/checkout/types";
import type { VoucherRewardType, VoucherScopeType } from "@/types/voucher";
import {
  findDisallowedComponentVariant,
  kitPriceOverrides,
  resolveKitUnitPrice,
  rulesByKitProduct,
  type RuleRow,
} from "@/modules/products/kit-pricing";

export function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

export function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
}

export function toJson(value: unknown): Json | null {
  if (value === null || typeof value === "undefined") return null;
  return JSON.parse(JSON.stringify(value)) as Json;
}

export type PriceMaps = {
  productPriceMap: Map<string, number>;
  variantAdjMap: Map<string, number>;
  variantProductMap: Map<string, string | null>;
  rulesByKit: ReturnType<typeof rulesByKitProduct>;
};

export function buildRpcItems(
  items: SubmitOrderRequestItem[],
  maps: PriceMaps
) {
  return items.map((item) => {
    const basePrice = maps.productPriceMap.get(item.product_id);
    if (basePrice === undefined) {
      throw new Error(`Product not found: ${item.product_id}`);
    }
    const rules = maps.rulesByKit.get(item.product_id) ?? [];
    const conditionIds = [
      ...(item.variant_id ? [item.variant_id] : []),
      ...(item.components ?? []).map((component) => component.variant_id),
    ];
    const priced = resolveKitUnitPrice({
      basePrice,
      kitVariant: item.variant_id
        ? { price_adjustment: maps.variantAdjMap.get(item.variant_id) ?? 0 }
        : null,
      components: (item.components ?? []).map((component) => ({
        variant_id: component.variant_id,
        price_adjustment: maps.variantAdjMap.get(component.variant_id) ?? 0,
      })),
      overrides: kitPriceOverrides(rules, conditionIds),
    });
    const contributionByVariant = new Map(
      priced.contributions.map((contribution) => [
        contribution.variant_id,
        contribution.price_adjustment,
      ])
    );

    return {
      product_id: item.product_id,
      variant_id: item.variant_id ?? null,
      product_name: item.product_name,
      unit_price: priced.unitPrice,
      thumbnail: item.thumbnail ?? null,
      quantity: item.quantity,
      components:
        item.components?.map((component) => ({
          variant_id: component.variant_id,
          variant_name: component.variant_name,
          component_group: component.component_group,
          price_adjustment:
            contributionByVariant.get(component.variant_id) ??
            maps.variantAdjMap.get(component.variant_id) ??
            0,
          thumbnail: component.thumbnail,
          quantity: 1,
        })) ?? [],
    };
  });
}

export function findIncompatibleComponent(
  items: SubmitOrderRequestItem[],
  rules: PriceMaps["rulesByKit"],
  variantAdjMap: Map<string, number>,
  variantProductMap: Map<string, string | null>
) {
  for (const item of items) {
    const kitRules = rules.get(item.product_id);
    if (!kitRules?.length) continue;
    const unknown = (item.components ?? []).find(
      (component) => !variantAdjMap.has(component.variant_id)
    );
    if (unknown)
      return { kind: "unknown" as const, variantId: unknown.variant_id };
    const offending = findDisallowedComponentVariant(
      kitRules,
      [
        ...(item.variant_id ? [item.variant_id] : []),
        ...(item.components ?? []).map((component) => component.variant_id),
      ],
      (item.components ?? []).map((component) => ({
        variant_id: component.variant_id,
        product_id: variantProductMap.get(component.variant_id) ?? null,
      }))
    );
    if (offending)
      return { kind: "incompatible" as const, variantId: offending };
  }
  return null;
}

export function buildVoucherScopeItems(args: {
  items: SubmitOrderRequestItem[];
  rpcItems: ReturnType<typeof buildRpcItems>;
  ownerByVariant: Map<string, string>;
  categorySlugByProductId: Map<string, string | undefined>;
}) {
  const scopeItems = args.items.map((item) => ({
    product_id: item.product_id,
    quantity: item.quantity,
    unit_price: Number(
      args.rpcItems.find((rpcItem) => rpcItem.product_id === item.product_id)
        ?.unit_price ?? 0
    ),
    category_slug: args.categorySlugByProductId.get(item.product_id) ?? null,
    variant_ids: [
      ...(item.variant_id ? [item.variant_id] : []),
      ...(item.components ?? []).map((component) => component.variant_id),
    ],
  }));

  const ownerLines = new Map<
    string,
    { unit_price: number; quantity: number }
  >();
  for (const item of args.items) {
    for (const variantId of [
      item.variant_id,
      ...(item.components ?? []).map((component) => component.variant_id),
    ]) {
      const owner = variantId ? args.ownerByVariant.get(variantId) : undefined;
      if (!owner) continue;
      const lineSubtotal = Number(
        args.rpcItems.find((rpcItem) => rpcItem.product_id === item.product_id)
          ?.unit_price ?? 0
      );
      const existing = ownerLines.get(owner);
      if (existing) {
        existing.unit_price = Math.max(existing.unit_price, lineSubtotal);
        existing.quantity = Math.max(existing.quantity, item.quantity);
      } else {
        ownerLines.set(owner, {
          unit_price: lineSubtotal,
          quantity: item.quantity,
        });
      }
    }
  }

  for (const [owner, line] of ownerLines) {
    scopeItems.push({
      product_id: owner,
      quantity: line.quantity,
      unit_price: line.unit_price,
      category_slug: args.categorySlugByProductId.get(owner) ?? null,
      variant_ids: [],
    });
  }
  return scopeItems;
}

export interface VoucherValidationRow {
  id: string;
  status: string;
  deleted_at: string | null;
  start_at: string | null;
  end_at: string | null;
  usage_limit_total: number | null;
  usage_limit_per_user: number | null;
  used_count: number;
  customer_ids: string[] | null;
  applies_to_shipping_methods: string[] | null;
  reward_type: string;
  scope_type: string;
  applies_to_product_ids: string[] | null;
  applies_to_category_slugs: string[] | null;
  excluded_product_ids: string[] | null;
  min_order_amount: number;
  amount_off: number | null;
  percent_off: number | null;
  max_discount_amount: number | null;
  gift_product_id: string | null;
  gift_variant_id: string | null;
  gift_quantity: number | null;
}

export interface VoucherScopeItem {
  product_id: string;
  quantity: number;
  unit_price: number;
  category_slug: string | null;
}

export function validateVoucherRow(args: {
  row: VoucherValidationRow;
  userId: string;
  shippingMethodId: string | null;
  now: Date;
  usageCount: number;
  scopeItems: VoucherScopeItem[];
  shippingCost: number;
}) {
  const {
    row,
    userId,
    shippingMethodId,
    now,
    usageCount,
    scopeItems,
    shippingCost,
  } = args;
  if (row.status !== "active" || row.deleted_at) return null;
  if (
    (row.start_at && new Date(row.start_at) > now) ||
    (row.end_at && new Date(row.end_at) < now)
  )
    return null;
  if (row.usage_limit_total !== null && row.used_count >= row.usage_limit_total)
    return null;
  if (
    row.usage_limit_per_user !== null &&
    row.usage_limit_per_user > 0 &&
    usageCount >= row.usage_limit_per_user
  )
    return null;
  if (row.customer_ids?.length && !row.customer_ids.includes(userId))
    return null;

  const allowedMethods = row.applies_to_shipping_methods ?? [];
  if (
    allowedMethods.length &&
    (!shippingMethodId ||
      !allowedMethods.some((method: string) =>
        sameShippingMethod(method, shippingMethodId)
      ))
  )
    return null;
  if (
    isShippingReward(row.reward_type as VoucherRewardType) &&
    isFeePendingShippingMethod(shippingMethodId)
  )
    return null;

  const excluded = new Set(row.excluded_product_ids ?? []);
  const eligibleScopeItems = scopeItems.filter(
    (item) => !excluded.has(item.product_id)
  );
  let base = scopeItems.reduce(
    (sum, item) => sum + item.unit_price * item.quantity,
    0
  );
  if (row.scope_type === "product") {
    const targets = new Set(row.applies_to_product_ids ?? []);
    const matched = eligibleScopeItems.filter((item) =>
      targets.has(item.product_id)
    );
    if (!matched.length) return null;
    base = matched.reduce(
      (sum, item) => sum + item.unit_price * item.quantity,
      0
    );
  } else if (row.scope_type === "category") {
    const targets = new Set(row.applies_to_category_slugs ?? []);
    const matched = eligibleScopeItems.filter((item) =>
      targets.has(item.category_slug ?? "")
    );
    if (!matched.length) return null;
    base = matched.reduce(
      (sum, item) => sum + item.unit_price * item.quantity,
      0
    );
  }
  if (row.min_order_amount > 0 && base < row.min_order_amount) return null;

  const discount = computeVoucherDiscount(
    {
      reward_type: row.reward_type as VoucherRewardType,
      scope_type: row.scope_type as VoucherScopeType,
      amount_off: row.amount_off,
      percent_off: row.percent_off,
      max_discount_amount: row.max_discount_amount,
    },
    { orderBase: base, shippingCost }
  );
  const voucherGiftItems =
    row.reward_type === "gift_item" &&
    row.gift_product_id &&
    row.gift_quantity !== null &&
    row.gift_quantity > 0
      ? [
          {
            product_id: row.gift_product_id,
            variant_id: row.gift_variant_id,
            quantity: row.gift_quantity,
          } satisfies VoucherGiftItem,
        ]
      : [];
  return {
    orderDiscount: discount.orderDiscount,
    shippingDiscount: discount.shippingDiscount,
    gifts: voucherGiftItems,
  };
}

export function buildVoucherAdjustments(args: {
  vouchers: Array<{
    voucher_id?: string | null;
    voucher_discount_amount?: number;
    shipping_discount_amount?: number;
    [key: string]: unknown;
  }>;
  voucherRows: VoucherValidationRow[];
  usageCounts: Map<string, number>;
  userId: string;
  shippingMethodId: string | null;
  now: Date;
  scopeItems: VoucherScopeItem[];
  shippingCost: number;
}) {
  const validIds = new Set<string>();
  const cappedDiscount = new Map<string, number>();
  const cappedShipping = new Map<string, number>();
  const gifts = new Map<string, VoucherGiftItem[]>();
  for (const row of args.voucherRows) {
    const validated = validateVoucherRow({
      row,
      userId: args.userId,
      shippingMethodId: args.shippingMethodId,
      now: args.now,
      usageCount: args.usageCounts.get(row.id) ?? 0,
      scopeItems: args.scopeItems,
      shippingCost: args.shippingCost,
    });
    if (!validated) continue;
    validIds.add(row.id);
    cappedDiscount.set(row.id, validated.orderDiscount);
    cappedShipping.set(row.id, validated.shippingDiscount);
    gifts.set(row.id, validated.gifts);
  }
  const filteredVouchers = args.vouchers
    .filter((voucher) => voucher.voucher_id && validIds.has(voucher.voucher_id))
    .map((voucher) => {
      const id = voucher.voucher_id!;
      return {
        ...voucher,
        voucher_discount_amount: Math.min(
          toNumber(voucher.voucher_discount_amount, 0),
          cappedDiscount.get(id) ?? 0
        ),
        shipping_discount_amount: Math.min(
          toNumber(voucher.shipping_discount_amount, 0),
          cappedShipping.get(id) ?? 0
        ),
        gift_items_snapshot: gifts.get(id) ?? null,
      };
    });
  return { validIds, cappedDiscount, cappedShipping, gifts, filteredVouchers };
}
