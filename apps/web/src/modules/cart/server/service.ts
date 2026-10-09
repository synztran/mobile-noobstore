import "server-only";

import {
  assertQuantityAvailable,
  loadAvailabilitySnapshot,
  type AvailabilityResult,
} from "@/modules/cart/server/availability";
import type { Database } from "@/lib/supabase/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CartApiItem, UpsertCartInput } from "@/modules/cart/types";
import {
  kitPriceOverrides,
  toRulesByProductId,
} from "@/modules/products/kit-pricing";
import type { RuleRow } from "@/modules/products/kit-pricing";

type Supabase = SupabaseClient<Database>;

export class StockExceededError extends Error {
  available: number;
  constructor(available: number) {
    super("Số lượng vượt quá tồn kho");
    this.available = available;
  }
}

export class MaxLimitExceededError extends Error {
  max: number;
  constructor(max: number) {
    super("Giới hạn sản phẩm cho mỗi đơn hàng");
    this.max = max;
  }
}

export class KitNotConfiguredError extends Error {
  constructor() {
    super("Sản phẩm chưa được cấu hình");
  }
}

function throwIfUnavailable(result: AvailabilityResult): void {
  if (result.ok) return;
  if (result.kind === "max") throw new MaxLimitExceededError(result.max);
  if (result.kind === "not_configured") throw new KitNotConfiguredError();
  throw new StockExceededError(result.available);
}

/**
 * The one, true lookup for "the user's active cart".
 *
 * Uses `order().limit(1)` instead of `.maybeSingle()`: PostgREST's
 * `maybeSingle()` *errors* (">1 result") when a user somehow has more than one
 * active cart, and callers previously mistook that error for "no cart" — which
 * made GET return an empty cart and getOrCreateCart mint yet another active
 * cart each time (see migration 135). The unique partial index
 * `carts_one_active_per_user` keeps this invariant true, but the lookup must
 * stay a plain single-row read so a stray duplicate can never wedge it again.
 * Listed first is the oldest cart (created_at asc) — the one holding the
 * accumulated items.
 */
export async function getActiveCartId(
  supabase: Supabase,
  userId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("carts")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1);

  return data?.[0]?.id ?? null;
}

export async function getOrCreateCart(
  supabase: Supabase,
  options: { userId: string }
): Promise<{ cartId: string; isNew: boolean }> {
  const existingCartId = await getActiveCartId(supabase, options.userId);
  if (existingCartId) {
    return { cartId: existingCartId, isNew: false };
  }

  const cartId = crypto.randomUUID();
  const { error } = await supabase
    .from("carts")
    .insert({ id: cartId, user_id: options.userId, status: "active" });

  if (error) {
    // Two concurrent requests both found no cart and raced the insert; the
    // partial index turns the loser into 23505 — re-read and reuse the winner.
    if (error.code === "23505") {
      return getOrCreateCart(supabase, options);
    }
    throw new Error(error.message);
  }
  return { cartId, isNew: true };
}

async function fetchProducts(supabase: Supabase, productIds: string[]) {
  if (productIds.length === 0) return new Map();

  const { data } = (await supabase
    .from("products")
    .select(
      "id, name, base_price, stock_quantity, thumbnail, is_pre_order, brand"
    )
    .in("id", productIds)) as unknown as { data: any[] | null };

  const map = new Map<string, NonNullable<typeof data>[number]>();
  for (const p of data ?? []) {
    map.set(p.id, p);
  }
  return map;
}

async function fetchVariants(supabase: Supabase, variantIds: string[]) {
  if (variantIds.length === 0) return new Map();

  const { data } = (await supabase
    .from("product_variants")
    .select(
      "id, variant_name, price_adjustment, thumbnail, is_pre_order, pre_order_config"
    )
    .in("id", variantIds)) as unknown as { data: any[] | null };

  const map = new Map<string, NonNullable<typeof data>[number]>();
  for (const v of data ?? []) {
    map.set(v.id, v);
  }
  return map;
}

/**
 * Re-apply per-pairing price overrides to hydrated kit lines.
 *
 * A child row only stores a component `variant_id`, so the raw
 * `product_variants.price_adjustment` it loads with is the generic price, not
 * the contribution for this specific kit variant. Without this the cart would
 * show a different total right after a reload than it did at add-to-cart time.
 * Checkout still recomputes authoritatively; this only keeps the display honest.
 */
async function applyKitPriceOverrides(
  supabase: Supabase,
  items: CartApiItem[]
): Promise<void> {
  const kitProductIds = [
    ...new Set(
      items
        .filter((i) => (i.children?.length ?? 0) > 0 && i.product_id)
        .map((i) => i.product_id as string)
    ),
  ];
  if (kitProductIds.length === 0) return;

  const { data: ruleRows } = await supabase
    .from("component_variant_rules")
    .select(
      `id, kit_product_id, condition_variant_id, target_component_product_id,
       component_variant_rule_allowed(variant_id, price_override)`
    )
    .in("kit_product_id", kitProductIds);

  if (!ruleRows || ruleRows.length === 0) return;

  const rulesByProduct = toRulesByProductId(
    (ruleRows ?? []) as unknown as RuleRow[]
  );

  for (const item of items) {
    const rules = item.product_id ? rulesByProduct[item.product_id] : undefined;
    if (!rules || rules.length === 0) continue;

    // A rule's condition may be the kit's own variant OR one of its component
    // variants (the live catalogue authors them the second way), so build the
    // candidate set from the line's own variant plus its selected components.
    const conditionIds = new Set<string>();
    if (item.variant_id) conditionIds.add(item.variant_id);
    for (const child of item.children ?? []) {
      if (child.variant_id) conditionIds.add(child.variant_id);
    }

    // Merge the contributions of every applicable rule into one lookup.
    const perComponent = new Map<string, number>();
    for (const [variantId, override] of Object.entries(
      kitPriceOverrides(rules, [...conditionIds])
    )) {
      perComponent.set(variantId, override);
    }
    if (perComponent.size === 0) continue;

    for (const child of item.children ?? []) {
      const contribution = child.variant_id
        ? perComponent.get(child.variant_id)
        : undefined;
      if (contribution === undefined || !child.variant) continue;
      child.variant.price_adjustment = contribution;
    }
  }
}

export async function getCartItems(
  supabase: Supabase,
  cartId: string
): Promise<CartApiItem[]> {
  const { data: rows, error } = await supabase
    .from("cart_items")
    .select(
      "id, cart_id, product_id, variant_id, parent_cart_item_id, quantity"
    )
    .eq("cart_id", cartId)
    .order("created_at");

  if (error) throw new Error(error.message);
  if (!rows?.length) return [];

  const allProductIds = [
    ...new Set(rows.map((r) => r.product_id).filter(Boolean)),
  ] as string[];
  const allVariantIds = [
    ...new Set(rows.map((r) => r.variant_id).filter(Boolean)),
  ] as string[];

  const parentRows = rows.filter((r) => !r.parent_cart_item_id);
  const childRows = rows.filter((r) => r.parent_cart_item_id);

  // Fetch component_group for child variants from kit_component_variants view
  const childVariantIds = [
    ...new Set(childRows.map((r) => r.variant_id).filter(Boolean)),
  ] as string[];

  // All three lookups depend only on the cart_items rows — fire them in
  // parallel instead of the component-group query running after products/variants.
  const [productMap, variantMap, componentGroupMap] = await Promise.all([
    fetchProducts(supabase, allProductIds),
    fetchVariants(supabase, allVariantIds),
    (async () => {
      const map = new Map<string, string>();
      if (childVariantIds.length === 0) return map;
      const { data: compData } = await supabase
        .from("kit_component_variants")
        .select("product_variant_id, component_group, kit_product_id")
        .in("product_variant_id", childVariantIds);
      for (const row of compData ?? []) {
        if (
          row.product_variant_id &&
          row.component_group &&
          row.kit_product_id
        ) {
          map.set(
            `${row.product_variant_id}::${row.kit_product_id}`,
            row.component_group
          );
        }
      }
      return map;
    })(),
  ]);

  const childrenByParent = new Map<string, CartApiItem[]>();
  for (const child of childRows) {
    if (!child.parent_cart_item_id) continue;
    const pid = child.parent_cart_item_id;
    if (!childrenByParent.has(pid)) childrenByParent.set(pid, []);
    const prod = child.product_id
      ? (productMap.get(child.product_id) ?? null)
      : null;
    const varInfo = child.variant_id
      ? (variantMap.get(child.variant_id) ?? null)
      : null;
    childrenByParent.get(pid)!.push({
      id: child.id,
      cart_id: child.cart_id,
      product_id: child.product_id,
      variant_id: child.variant_id,
      parent_cart_item_id: child.parent_cart_item_id,
      quantity: child.quantity,
      product: prod
        ? {
            id: prod.id,
            name: prod.name,
            base_price: Number(prod.base_price),
            stock_quantity: prod.stock_quantity,
            thumbnail: prod.thumbnail,
            is_pre_order: (prod as any).is_pre_order ?? false,
            brand: prod.brand ?? null,
          }
        : null,
      variant: varInfo
        ? {
            id: varInfo.id,
            variant_name: varInfo.variant_name,
            price_adjustment: Number(varInfo.price_adjustment),
            thumbnail: varInfo.thumbnail,
            is_pre_order: (varInfo as any).is_pre_order ?? false,
            pre_order_config: (varInfo as any).pre_order_config ?? null,
          }
        : null,
      component_group:
        componentGroupMap.get(`${child.variant_id}::${child.product_id}`) ??
        null,
      children: [],
    });
  }

  const items: CartApiItem[] = parentRows.map((r) => {
    const prod = r.product_id ? (productMap.get(r.product_id) ?? null) : null;
    const varInfo = r.variant_id
      ? (variantMap.get(r.variant_id) ?? null)
      : null;
    return {
      id: r.id,
      cart_id: r.cart_id,
      product_id: r.product_id,
      variant_id: r.variant_id,
      parent_cart_item_id: r.parent_cart_item_id,
      quantity: r.quantity,
      product: prod
        ? {
            id: prod.id,
            name: prod.name,
            base_price: Number(prod.base_price),
            stock_quantity: prod.stock_quantity,
            thumbnail: prod.thumbnail,
            is_pre_order: (prod as any).is_pre_order ?? false,
            brand: prod.brand ?? null,
          }
        : null,
      variant: varInfo
        ? {
            id: varInfo.id,
            variant_name: varInfo.variant_name,
            price_adjustment: Number(varInfo.price_adjustment),
            thumbnail: varInfo.thumbnail,
            is_pre_order: (varInfo as any).is_pre_order ?? false,
            pre_order_config: (varInfo as any).pre_order_config ?? null,
          }
        : null,
      children: childrenByParent.get(r.id) ?? [],
    };
  });

  await applyKitPriceOverrides(supabase, items);

  return items;
}

async function findExistingParentMatch(
  supabase: Supabase,
  cartId: string,
  productId: string,
  incomingVariantIds: string[],
  incomingVariantId: string | null
): Promise<{ id: string; quantity: number } | null> {
  const { data: parents } = await supabase
    .from("cart_items")
    .select("id, quantity, variant_id")
    .eq("cart_id", cartId)
    .eq("product_id", productId)
    .is("parent_cart_item_id", null)
    .limit(10);

  // A cart can legitimately hold several kit lines for the same product (one
  // per kit variant), so filter in JS instead of maybeSingle(), which throws
  // when more than one parent row matches.
  const parent = (parents ?? []).find(
    (p) => (p.variant_id ?? null) === incomingVariantId
  );

  if (!parent) return null;

  const { data: children } = await supabase
    .from("cart_items")
    .select("variant_id")
    .eq("parent_cart_item_id", parent.id)
    .not("variant_id", "is", null)
    .order("variant_id");

  const existingIds = (children ?? []).map((c) => c.variant_id).sort();
  const incomingSorted = [...incomingVariantIds].sort();

  const isMatch =
    existingIds.length === incomingSorted.length &&
    existingIds.every((v, i) => v === incomingSorted[i]);

  if (!isMatch) return null;

  return { id: parent.id, quantity: parent.quantity };
}

export async function upsertCartItem(
  supabase: Supabase,
  cartId: string,
  input: UpsertCartInput
): Promise<{ parentItemId: string }> {
  const components = input.components ?? [];
  const isKit = components.length > 0;

  if (isKit) {
    const existing = await findExistingParentMatch(
      supabase,
      cartId,
      input.product_id,
      components.map((c) => c.variant_id),
      input.variant_id ?? null
    );

    const proposedQty = (existing?.quantity ?? 0) + (input.quantity ?? 1);

    const snapshot = await loadAvailabilitySnapshot(supabase, {
      cartId,
      productId: input.product_id,
      childVariantIds: components.map((c) => c.variant_id),
      excludeLineId: existing?.id ?? null,
      currentQty: existing?.quantity ?? 0,
    });
    throwIfUnavailable(assertQuantityAvailable(snapshot, proposedQty));

    if (existing) {
      const { error: updateErr } = await supabase
        .from("cart_items")
        .update({ quantity: proposedQty })
        .eq("id", existing.id);

      if (updateErr) throw new Error(updateErr.message);

      return { parentItemId: existing.id };
    }

    const parentId = crypto.randomUUID();
    const { error: parentErr } = await supabase.from("cart_items").insert({
      id: parentId,
      cart_id: cartId,
      product_id: input.product_id,
      // Persist the kit variant so distinct kit variants form distinct cart
      // lines. The kit variant is identity only — availability still comes from
      // the component child rows below.
      variant_id: input.variant_id ?? null,
      quantity: input.quantity ?? 1,
      parent_cart_item_id: null,
    });

    if (parentErr) throw new Error(parentErr.message);

    if (components.length > 0) {
      const childRows = components.map((c) => ({
        id: crypto.randomUUID(),
        cart_id: cartId,
        product_id: input.product_id,
        variant_id: c.variant_id,
        quantity: 1,
        parent_cart_item_id: parentId,
      }));

      const { error: childErr } = await supabase
        .from("cart_items")
        .insert(childRows);

      if (childErr) {
        console.error("[cart-service] child insert error:", childErr);
        throw new Error(childErr.message);
      }
    }

    return { parentItemId: parentId };
  }

  let query = supabase
    .from("cart_items")
    .select("id, quantity")
    .eq("cart_id", cartId)
    .eq("product_id", input.product_id)
    .is("parent_cart_item_id", null);

  if (input.variant_id) {
    query = query.eq("variant_id", input.variant_id);
  } else {
    query = query.is("variant_id", null);
  }

  const { data: existing } = await query.maybeSingle();

  const targetQty = (existing?.quantity ?? 0) + (input.quantity ?? 1);

  const snapshot = await loadAvailabilitySnapshot(supabase, {
    cartId,
    productId: input.product_id,
    variantId: input.variant_id ?? null,
    excludeLineId: existing?.id ?? null,
    currentQty: existing?.quantity ?? 0,
  });
  throwIfUnavailable(assertQuantityAvailable(snapshot, targetQty));

  if (existing) {
    const newQty = targetQty;
    const { error: updateErr } = await supabase
      .from("cart_items")
      .update({ quantity: newQty })
      .eq("id", existing.id);

    if (updateErr) throw new Error(updateErr.message);

    return { parentItemId: existing.id };
  }

  const requestedQty = targetQty;

  const itemId = crypto.randomUUID();
  const { error: insertErr } = await supabase.from("cart_items").insert({
    id: itemId,
    cart_id: cartId,
    product_id: input.product_id,
    variant_id: input.variant_id ?? null,
    quantity: input.quantity ?? 1,
    parent_cart_item_id: null,
  });

  if (insertErr) throw new Error(insertErr.message);

  return { parentItemId: itemId };
}

export async function removeCartItem(
  supabase: Supabase,
  itemId: string
): Promise<void> {
  await supabase.from("cart_items").delete().eq("parent_cart_item_id", itemId);

  await supabase.from("cart_items").delete().eq("id", itemId);
}

export async function updateCartItemQuantity(
  supabase: Supabase,
  itemId: string,
  quantity: number
): Promise<void> {
  if (quantity < 1) return;

  const { data: item } = await supabase
    .from("cart_items")
    .select("product_id, variant_id, parent_cart_item_id, cart_id, quantity")
    .eq("id", itemId)
    .single();

  if (item?.product_id && item.cart_id) {
    const childVariantIds = item.parent_cart_item_id
      ? []
      : (
          (
            await supabase
              .from("cart_items")
              .select("variant_id")
              .eq("parent_cart_item_id", itemId)
              .not("variant_id", "is", null)
          ).data ?? []
        ).flatMap((c) => (c.variant_id ? [c.variant_id] : []));

    const snapshot = await loadAvailabilitySnapshot(supabase, {
      cartId: item.cart_id,
      productId: item.product_id,
      variantId: item.variant_id ?? null,
      childVariantIds,
      excludeLineId: itemId,
      currentQty: item.quantity ?? 0,
    });
    throwIfUnavailable(assertQuantityAvailable(snapshot, quantity));
  }

  await supabase.from("cart_items").update({ quantity }).eq("id", itemId);
}

export async function clearCart(
  supabase: Supabase,
  cartId: string
): Promise<void> {
  await supabase.from("cart_items").delete().eq("cart_id", cartId);
}
