export const QUICK_ORDER_CUSTOMER = "Khách vãn lai";
export const QUICK_ORDER_MAX_LINES = 100;
export const QUICK_ORDER_MAX_QUANTITY = 1000;
export const QUICK_ORDER_MAX_VND = 1_000_000_000;

export interface QuickOrderInputLine {
  product_id: string;
  parent_product_id?: string | null;
  variant_id: string | null;
  quantity: number;
}

export interface QuickOrderProduct {
  id: string;
  name: string;
  thumbnail: string | null;
  base_price: number | string;
  stock_quantity: number | null;
  max_quantity?: number | null;
  product_type: string | null;
  is_active: boolean | null;
  is_pre_order?: boolean | null;
  pre_order_config?: unknown;
  category_slug?: string | null;
  pricing_parents?: QuickOrderPricingParent[];
}

export interface QuickOrderPricingParent {
  id: string;
  name: string;
  base_price: number | string;
}

// A single parent is unambiguous; shared components require an explicit choice.
export function quickOrderBasePrice(product: Pick<QuickOrderProduct, "base_price" | "pricing_parents">, parentId?: string | null): number {
  const parents = product.pricing_parents ?? [];
  if (!parents.length) return parentId ? Number.NaN : Number(product.base_price);
  const parent = parentId ? parents.find((candidate) => candidate.id === parentId) : parents.length === 1 ? parents[0] : undefined;
  return parent ? Number(parent.base_price) : Number.NaN;
}

export interface QuickOrderVariant {
  id: string;
  product_id: string;
  variant_name: string;
  price_adjustment: number | string | null;
  stock_quantity: number | null;
  is_pre_order: boolean | null;
  pre_order_config: unknown;
  thumbnail?: string | null;
}

export interface QuickOrderPricedLine {
  product_id: string;
  parent_product_id?: string | null;
  variant_id: string | null;
  product_name: string;
  variant_name: string | null;
  thumbnail: string | null;
  quantity: number;
  unit_price: number;
  is_pre_order: boolean;
  pre_order_config: unknown;
}

export interface QuickOrderVoucher {
  id: string;
  code: string;
  status: string;
  deleted_at: string | null;
  reward_type: string;
  scope_type: string;
  amount_off: number | string | null;
  percent_off: number | string | null;
  max_discount_amount: number | string | null;
  min_order_amount: number | string | null;
  min_item_quantity: number | null;
  applies_to_product_ids: string[] | null;
  applies_to_category_slugs: string[] | null;
  excluded_product_ids: string[] | null;
  applies_to_shipping_methods: string[] | null;
  customer_ids: string[] | null;
  usage_limit_total: number | null;
  used_count: number;
  start_at: string | null;
  end_at: string | null;
}

export interface QuickOrderTotals {
  subtotal: number;
  voucherDiscount: number;
  shippingDiscount: number;
  total: number;
}

export type QuickOrderVoucherResult =
  | { ok: true; totals: QuickOrderTotals }
  | { ok: false; reason: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Catalog also contains legacy 12-character hex variant identifiers.
const LEGACY_VARIANT_ID = /^[0-9a-f]{12}$/i;

function finite(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

export function parseQuickOrderLines(value: unknown): QuickOrderInputLine[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > QUICK_ORDER_MAX_LINES) return null;
  const lines: QuickOrderInputLine[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
    const line = entry as Record<string, unknown>;
    if (!isUuid(line.product_id) || (line.variant_id != null && !isUuid(line.variant_id) && !(typeof line.variant_id === "string" && LEGACY_VARIANT_ID.test(line.variant_id)))) return null;
    if (line.parent_product_id != null && !isUuid(line.parent_product_id)) return null;
    if (typeof line.quantity !== "number" || !Number.isSafeInteger(line.quantity) || line.quantity < 1 || line.quantity > QUICK_ORDER_MAX_QUANTITY) return null;
    lines.push({ product_id: line.product_id, variant_id: (line.variant_id as string | null | undefined) ?? null, quantity: line.quantity, ...(line.parent_product_id ? { parent_product_id: line.parent_product_id as string } : {}) });
  }
  return lines;
}

export function parseQuickOrderCustomer(value: unknown): { name: string; phone: string | null; address: string } | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const address = typeof input.address === "string" ? input.address.trim() : "";
  const phone = typeof input.phone === "string" ? input.phone.trim() : "";
  if (!name || name.length > 200 || !address || address.length > 1000 || phone.length > 40) return null;
  return { name, address, phone: phone || null };
}

export function parseManualShippingFee(value: unknown): number | null {
  const amount = finite(value);
  if (!Number.isSafeInteger(amount) || amount < 0 || amount > QUICK_ORDER_MAX_VND) return null;
  return amount;
}

export function priceQuickOrderLines(
  inputs: QuickOrderInputLine[],
  products: QuickOrderProduct[],
  variants: QuickOrderVariant[],
): { lines: QuickOrderPricedLine[]; subtotal: number } | null {
  const productById = new Map(products.map((product) => [product.id, product]));
  const variantById = new Map(variants.map((variant) => [variant.id, variant]));
  const aggregated = new Map<string, number>();
  for (const line of inputs) {
    const key = JSON.stringify([line.product_id, line.variant_id, line.parent_product_id ?? null]);
    const quantity = (aggregated.get(key) ?? 0) + line.quantity;
    if (quantity > QUICK_ORDER_MAX_QUANTITY) return null;
    aggregated.set(key, quantity);
  }

  const lines: QuickOrderPricedLine[] = [];
  const reservedByPool = new Map<string, number>();
  for (const [key, quantity] of aggregated) {
    const [productId, variantId, parentId] = JSON.parse(key) as [string, string | null, string | null];
    const product = productById.get(productId);
    if (!product || product.is_active === false) return null;
    const variant = variantId ? variantById.get(variantId) : undefined;
    if (variantId && (!variant || variant.product_id !== product.id)) return null;
    if (!variantId && variants.some((candidate) => candidate.product_id === product.id)) return null;
    if (product.product_type === "kit") return null;
    const isPreOrder = variant ? Boolean(variant.is_pre_order) : Boolean(product.is_pre_order);
    const pool = JSON.stringify([productId, variantId]);
    const poolQuantity = (reservedByPool.get(pool) ?? 0) + quantity;
    reservedByPool.set(pool, poolQuantity);
    if (!isPreOrder && product.max_quantity != null && poolQuantity > product.max_quantity) return null;
    if (variant) {
      if (!isPreOrder && (variant.stock_quantity ?? 0) < poolQuantity) return null;
    } else if (!isPreOrder && (product.stock_quantity ?? 0) < poolQuantity) {
      return null;
    }
    const preOrderConfig = variant?.is_pre_order ? variant.pre_order_config : product.pre_order_config;
    if (isPreOrder && (!preOrderConfig || typeof preOrderConfig !== "object")) return null;
    if (isPreOrder && product.product_type === "component") return null;

    const productPrice = quickOrderBasePrice(product, parentId);
    const variantPriceAdjustment = variant ? finite(variant.price_adjustment ?? 0) : 0;
    const unitPrice = productPrice + variantPriceAdjustment;
    if (!Number.isSafeInteger(unitPrice) || unitPrice < 0 || unitPrice > QUICK_ORDER_MAX_VND) return null;
    const lineSubtotal = unitPrice * quantity;
    if (!Number.isSafeInteger(lineSubtotal) || lineSubtotal > QUICK_ORDER_MAX_VND) return null;
    lines.push({
      product_id: product.id,
      ...(parentId || product.pricing_parents?.length === 1 ? { parent_product_id: parentId ?? product.pricing_parents![0].id } : {}),
      variant_id: variant?.id ?? null,
      product_name: product.name,
      variant_name: variant?.variant_name ?? null,
      thumbnail: variant?.is_pre_order && variant.thumbnail ? variant.thumbnail : product.thumbnail,
      quantity,
      unit_price: unitPrice,
      is_pre_order: isPreOrder,
      pre_order_config: isPreOrder ? preOrderConfig : null,
    });
  }
  const subtotal = lines.reduce((sum, line) => sum + line.unit_price * line.quantity, 0);
  return Number.isSafeInteger(subtotal) && subtotal <= QUICK_ORDER_MAX_VND ? { lines, subtotal } : null;
}

export function parseQuickOrderPayment(value: unknown, total: number, subtotal: number): {
  paymentType: "full" | "deposit_cod";
  depositPercentage: number | null;
  depositAmount: number;
  remainingAmount: number;
} | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const paymentType = input.payment_type;
  if (paymentType !== "full" && paymentType !== "deposit_cod") return null;
  if (typeof input.mark_paid_now !== "boolean") return null;
  if (paymentType === "full") {
    return { paymentType, depositPercentage: null, depositAmount: 0, remainingAmount: 0 };
  }
  const percentage = input.deposit_percentage === undefined ? 50 : finite(input.deposit_percentage);
  if (!Number.isSafeInteger(percentage) || percentage < 1 || percentage > 80) return null;
  const depositAmount = Math.round(subtotal * percentage / 100);
  return {
    paymentType,
    depositPercentage: percentage,
    depositAmount,
    remainingAmount: Math.max(0, total - depositAmount),
  };
}

function shippingDiscount(voucher: QuickOrderVoucher, shippingFee: number): number {
  if (voucher.reward_type === "free_shipping") return shippingFee;
  if (voucher.reward_type !== "shipping_percent_off") return 0;
  const percentage = Math.max(0, finite(voucher.percent_off ?? 0));
  let discount = Math.round(shippingFee * percentage / 100);
  const cap = finite(voucher.max_discount_amount ?? 0);
  if (cap > 0) discount = Math.min(discount, cap);
  return Math.min(shippingFee, Math.max(0, discount));
}

export function applyQuickOrderVoucher(input: {
  voucher: QuickOrderVoucher;
  products: QuickOrderProduct[];
  lines: QuickOrderPricedLine[];
  subtotal: number;
  shippingFee: number;
  now?: Date;
}): QuickOrderVoucherResult {
  const { voucher, products, lines, subtotal, shippingFee } = input;
  const now = input.now ?? new Date();
  if (voucher.status !== "active" || voucher.deleted_at) return { ok: false, reason: "Voucher is not active." };
  if ((voucher.start_at && new Date(voucher.start_at) > now) || (voucher.end_at && new Date(voucher.end_at) < now)) return { ok: false, reason: "Voucher is not currently available." };
  if ((voucher.usage_limit_total ?? 0) > 0 && voucher.used_count >= voucher.usage_limit_total!) return { ok: false, reason: "Voucher usage limit has been reached." };
  if (voucher.customer_ids?.length) return { ok: false, reason: "Customer-restricted vouchers cannot be used for a walk-in order." };
  if (voucher.applies_to_shipping_methods?.length) return { ok: false, reason: "Shipping-method-restricted vouchers cannot be used for a walk-in order." };
  if (!["order_total", "product", "category", "shipping_fee"].includes(voucher.scope_type)) return { ok: false, reason: "This voucher type is not supported for a walk-in order." };
  if (!["amount_off", "percent_off", "free_shipping", "shipping_percent_off"].includes(voucher.reward_type)) return { ok: false, reason: "This voucher reward is not supported for a walk-in order." };
  if ((voucher.scope_type === "shipping_fee" || voucher.reward_type === "free_shipping" || voucher.reward_type === "shipping_percent_off") && (voucher.applies_to_product_ids?.length || voucher.applies_to_category_slugs?.length || voucher.excluded_product_ids?.length)) return { ok: false, reason: "This voucher has product targeting and is not supported for a walk-in order." };
  const eligible = lines.filter((line) => {
    if (voucher.excluded_product_ids?.includes(line.product_id)) return false;
    if (voucher.scope_type === "product") return Boolean(voucher.applies_to_product_ids?.includes(line.product_id));
    if (voucher.scope_type === "category") {
      const category = products.find((product) => product.id === line.product_id)?.category_slug;
      return Boolean(category && voucher.applies_to_category_slugs?.includes(category));
    }
    if (voucher.scope_type === "shipping_fee" || voucher.reward_type === "free_shipping" || voucher.reward_type === "shipping_percent_off") return false;
    return true;
  });
  if ((voucher.scope_type === "product" || voucher.scope_type === "category") && eligible.length === 0) return { ok: false, reason: "Voucher does not apply to these products." };
  const minQty = voucher.min_item_quantity ?? 0;
  if (minQty > 0 && eligible.reduce((sum, line) => sum + line.quantity, 0) < minQty) return { ok: false, reason: "Minimum item quantity has not been met." };
  const eligibleSubtotal = voucher.scope_type === "shipping_fee" ? shippingFee : eligible.reduce((sum, line) => sum + line.unit_price * line.quantity, 0);
  const minimum = finite(voucher.min_order_amount ?? 0);
  const minimumBase = voucher.scope_type === "shipping_fee" || voucher.reward_type === "free_shipping" || voucher.reward_type === "shipping_percent_off" ? shippingFee : eligibleSubtotal;
  if (minimumBase < minimum) return { ok: false, reason: "Minimum order amount has not been met." };
  if (voucher.scope_type === "shipping_fee" && !["free_shipping", "shipping_percent_off"].includes(voucher.reward_type)) return { ok: false, reason: "This shipping voucher reward is not supported." };
  const productDiscount = voucher.scope_type === "shipping_fee" || voucher.reward_type === "free_shipping" || voucher.reward_type === "shipping_percent_off"
    ? 0
    : voucher.reward_type === "amount_off"
      ? Math.min(Math.max(0, finite(voucher.amount_off ?? 0)), eligibleSubtotal)
      : voucher.reward_type === "percent_off"
        ? Math.min(eligibleSubtotal, Math.max(0, Math.min(Math.round(eligibleSubtotal * finite(voucher.percent_off ?? 0) / 100), finite(voucher.max_discount_amount ?? 0) > 0 ? finite(voucher.max_discount_amount) : Number.POSITIVE_INFINITY)))
        : 0;
  const discountShipping = voucher.scope_type === "shipping_fee" || voucher.reward_type === "free_shipping" || voucher.reward_type === "shipping_percent_off" ? shippingDiscount(voucher, shippingFee) : 0;
  const voucherDiscount = Math.min(Math.max(0, productDiscount), subtotal);
  const cappedShipping = Math.min(Math.max(0, discountShipping), shippingFee);
  return { ok: true, totals: { subtotal, voucherDiscount, shippingDiscount: cappedShipping, total: Math.max(0, subtotal + shippingFee - voucherDiscount - cappedShipping) } };
}
