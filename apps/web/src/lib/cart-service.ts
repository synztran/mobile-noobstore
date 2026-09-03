import type { PreOrderConfig } from "@/lib/data";
import type { Database } from "@/lib/supabase/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

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

async function getProductEffectiveLimit(
  supabase: Supabase,
  productId: string
): Promise<{
  stock: number;
  max: number | null;
  productType: string;
}> {
  const { data } = await supabase
    .from("products")
    .select("stock_quantity, max_quantity, product_type")
    .eq("id", productId)
    .single();

  const stock = Number(data?.stock_quantity ?? 0);
  const max = data?.max_quantity != null ? Number(data.max_quantity) : null;
  const productType = data?.product_type ?? "standard";

  return {
    stock,
    max,
    productType,
  };
}

type VariantUsage = Record<string, number>;

/**
 * Computes how many units of each variant are already committed in a cart's
 * kit parent lines. Kit inventory is held on product_variants.stock_quantity,
 * and each parent line's quantity consumes that many units of each of its
 * child component variants (child rows always have quantity 1).
 */
async function getCartVariantUsage(
  supabase: Supabase,
  cartId: string
): Promise<VariantUsage> {
  const usage: VariantUsage = {};

  const { data: parents } = await supabase
    .from("cart_items")
    .select("id, quantity")
    .eq("cart_id", cartId)
    .is("parent_cart_item_id", null);

  if (!parents?.length) return usage;

  const parentIds = parents.map((p) => p.id);
  const { data: children } = await supabase
    .from("cart_items")
    .select("parent_cart_item_id, variant_id")
    .in("parent_cart_item_id", parentIds)
    .not("variant_id", "is", null);

  const parentQtyById = new Map((parents ?? []).map((p) => [p.id, p.quantity]));

  for (const child of children ?? []) {
    if (!child.variant_id || !child.parent_cart_item_id) continue;
    const qty = parentQtyById.get(child.parent_cart_item_id) ?? 1;
    usage[child.variant_id] = (usage[child.variant_id] ?? 0) + qty;
  }

  return usage;
}

async function getVariantStock(
  supabase: Supabase,
  variantIds: string[]
): Promise<Record<string, number>> {
  if (variantIds.length === 0) return {};
  const { data } = await supabase
    .from("product_variants")
    .select("id, stock_quantity")
    .in("id", variantIds);
  const map: Record<string, number> = {};
  for (const v of data ?? []) {
    map[v.id] = Number(v.stock_quantity ?? 0);
  }
  return map;
}

export interface CartApiItem {
  id: string;
  cart_id: string | null;
  product_id: string | null;
  variant_id: string | null;
  parent_cart_item_id: string | null;
  quantity: number;
  product: {
    id: string;
    name: string;
    base_price: number;
    stock_quantity: number;
    thumbnail: string | null;
    is_pre_order?: boolean;
    pre_order_config?: PreOrderConfig | null;
    brand: string | null;
  } | null;
  variant: {
    id: string;
    variant_name: string;
    price_adjustment: number;
    thumbnail: string | null;
    is_pre_order?: boolean;
    pre_order_config?: PreOrderConfig | null;
  } | null;
  children: CartApiItem[];
  component_group?: string | null;
}

export interface UpsertCartInput {
  product_id: string;
  variant_id?: string | null;
  quantity?: number;
  components?: { variant_id: string }[];
}

export async function getOrCreateCart(
  supabase: Supabase,
  options: { userId: string }
): Promise<{ cartId: string; isNew: boolean }> {
  const { data: existingCart } = await supabase
    .from("carts")
    .select("id")
    .eq("user_id", options.userId)
    .eq("status", "active")
    .maybeSingle();

  if (existingCart) {
    return { cartId: existingCart.id, isNew: false };
  }

  const cartId = crypto.randomUUID();
  const { error } = await supabase
    .from("carts")
    .insert({ id: cartId, user_id: options.userId, status: "active" });

  if (error) {
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

  return items;
}

async function findExistingParentMatch(
  supabase: Supabase,
  cartId: string,
  productId: string,
  incomingVariantIds: string[]
): Promise<{ id: string; quantity: number } | null> {
  const { data: parent } = await supabase
    .from("cart_items")
    .select("id, quantity")
    .eq("cart_id", cartId)
    .eq("product_id", productId)
    .is("parent_cart_item_id", null)
    .maybeSingle();

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
      components.map((c) => c.variant_id)
    );

    const proposedQty = (existing?.quantity ?? 0) + (input.quantity ?? 1);

    const { max } = await getProductEffectiveLimit(supabase, input.product_id);
    if (max && proposedQty > max) throw new MaxLimitExceededError(max);

    const variantIds = components.map((c) => c.variant_id);
    const variantStock = await getVariantStock(supabase, variantIds);
    const cartUsage = await getCartVariantUsage(supabase, cartId);

    for (const v of variantIds) {
      // getCartVariantUsage already includes this line's existing quantity when
      // it exists, so only the additional input.quantity is added on top.
      const inUseElsewhere = cartUsage[v] ?? 0;
      const totalNeeded = inUseElsewhere + (input.quantity ?? 1);
      const stock = variantStock[v] ?? 0;
      if (totalNeeded > stock) throw new StockExceededError(stock);
    }

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
      variant_id: null,
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

  const { stock, max } = await getProductEffectiveLimit(
    supabase,
    input.product_id
  );
  const variantStock = input.variant_id
    ? ((await getVariantStock(supabase, [input.variant_id]))[
        input.variant_id
      ] ?? 0)
    : null;

  if (existing) {
    const newQty = existing.quantity + (input.quantity ?? 1);
    if (max && newQty > max) throw new MaxLimitExceededError(max);
    if (newQty > stock) throw new StockExceededError(stock);
    if (variantStock != null && newQty > variantStock)
      throw new StockExceededError(variantStock);
    const { error: updateErr } = await supabase
      .from("cart_items")
      .update({ quantity: newQty })
      .eq("id", existing.id);

    if (updateErr) throw new Error(updateErr.message);

    return { parentItemId: existing.id };
  }

  const requestedQty = input.quantity ?? 1;
  if (requestedQty > stock) throw new StockExceededError(stock);
  if (variantStock != null && requestedQty > variantStock)
    throw new StockExceededError(variantStock);

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

  const prevQuantity = item?.quantity ?? 0;
  const isMinusQuantity = quantity < prevQuantity;

  // Kit inventory lives on component variants — admin stores NULL in
  // products.stock_quantity for kits — so product-level stock only constrains
  // non-kit lines. Kit rows (parent AND child) are validated against their
  // component variant rows further down.
  let productType: string | null = null;
  if (item?.product_id) {
    const { stock, max, productType: type } = await getProductEffectiveLimit(
      supabase,
      item.product_id
    );
    productType = type;
    if (!isMinusQuantity && max && quantity > max)
      throw new MaxLimitExceededError(max);
    if (type !== "kit" && !isMinusQuantity && quantity > stock)
      throw new StockExceededError(stock);
  }

  const isParent = item && !item.parent_cart_item_id;

  if (item?.product_id && isParent && item.cart_id) {
    const { data: children } = await supabase
      .from("cart_items")
      .select("variant_id")
      .eq("parent_cart_item_id", itemId)
      .not("variant_id", "is", null);

    const variantIds = Array.from(
      new Set(
        (children ?? []).flatMap((c) => (c.variant_id ? [c.variant_id] : []))
      )
    );

    if (variantIds.length > 0) {
      const variantStock = await getVariantStock(supabase, variantIds);
      const cartUsage = await getCartVariantUsage(supabase, item.cart_id);
      const ownCurrentQty = item.quantity ?? 0;

      for (const vid of variantIds) {
        // getCartVariantUsage includes this item's own current quantity; drop it
        // before adding the target quantity.
        const otherUsage = (cartUsage[vid] ?? 0) - ownCurrentQty;
        const totalNeeded = otherUsage + quantity;
        const vs = variantStock[vid] ?? 0;
        if (totalNeeded > vs) throw new StockExceededError(vs);
      }
    } else if (productType === "kit" && !isMinusQuantity) {
      // Kit parent whose component rows are missing — nothing to validate
      // against. Keep the old product-stock gate (0 for kits) so the line
      // cannot grow unchecked.
      throw new StockExceededError(0);
    }
  } else if (item?.product_id && item.variant_id) {
    // Standalone variant-backed line, or a kit component row addressed
    // directly — its own variant stock is the ceiling.
    const vs =
      (await getVariantStock(supabase, [item.variant_id]))[item.variant_id] ??
      0;
    if (quantity > vs) throw new StockExceededError(vs);
  }

  await supabase.from("cart_items").update({ quantity }).eq("id", itemId);
}

export async function clearCart(
  supabase: Supabase,
  cartId: string
): Promise<void> {
  await supabase.from("cart_items").delete().eq("cart_id", cartId);
}
