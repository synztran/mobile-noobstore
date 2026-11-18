"use client";

import { ArrowLeft, Plus, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { QUICK_ORDER_CUSTOMER, quickOrderBasePrice, type QuickOrderPricingParent } from "@/lib/quick-order";

type Variant = {
  id: string;
  variant_name: string;
  price_adjustment: number | null;
  stock_quantity: number | null;
  is_pre_order: boolean;
  pre_order_config: { estimate?: string; available_date?: string | null; notes?: string | null } | null;
  thumbnail: string | null;
};
type Product = {
  id: string;
  name: string;
  thumbnail: string | null;
  base_price: number;
  pricing_parents?: QuickOrderPricingParent[];
  stock_quantity: number | null;
  max_quantity: number | null;
  product_type: string;
  is_pre_order: boolean;
  pre_order_config: { estimate?: string; available_date?: string | null; notes?: string | null } | null;
  category_slug: string | null;
  product_variants: Variant[];
};
type Voucher = {
  id: string;
  code: string;
  name: string;
  reward_type: string;
  scope_type: string;
  amount_off: number | null;
  percent_off: number | null;
  max_discount_amount: number | null;
  min_order_amount: number | null;
  min_item_quantity: number | null;
  applies_to_product_ids: string[] | null;
  applies_to_category_slugs: string[] | null;
  excluded_product_ids: string[] | null;
  customer_ids: string[] | null;
  applies_to_shipping_methods: string[] | null;
  usage_limit_total: number | null;
  used_count: number;
  start_at: string | null;
  end_at: string | null;
  status: string;
  deleted_at: string | null;
};
type ShippingMethod = { id: string; name: string };
type Options = { products: Product[]; vouchers: Voucher[]; shippingMethods: ShippingMethod[] };
type OrderLine = { key: string; product_id: string; parent_product_id: string | null; variant_id: string; quantity: number; is_pre_order: boolean; pre_order_config: unknown };
type ApiError = { error?: string };

function currency(value: number) {
  return `${Math.max(0, value).toLocaleString("vi-VN")}₫`;
}

function productPriceLabel(product: Product) {
  if ((product.pricing_parents?.length ?? 0) > 1) return "Choose parent kit for price";
  if (!product.product_variants.length) return currency(product.base_price ?? 0);
  const prices = product.product_variants.map((variant) => (product.base_price ?? 0) + (variant.price_adjustment ?? 0));
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max ? currency(min) : `${currency(min)} – ${currency(max)}`;
}

export default function QuickOrderForm() {
  const router = useRouter();
  const [options, setOptions] = useState<Options>({ products: [], vouchers: [], shippingMethods: [] });
  const [search, setSearch] = useState("");
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [optionsError, setOptionsError] = useState("");
  const [customerName, setCustomerName] = useState(QUICK_ORDER_CUSTOMER);
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [shippingFee, setShippingFee] = useState("0");
  const [shippingMethodId, setShippingMethodId] = useState("");
  const [paymentType, setPaymentType] = useState<"full" | "deposit_cod">("full");
  const [depositPercentage, setDepositPercentage] = useState("50");
  const [markPaidNow, setMarkPaidNow] = useState(false);
  const [voucherId, setVoucherId] = useState("");
  const [lines, setLines] = useState<OrderLine[]>([]);
  const [successMessage, setSuccessMessage] = useState("");
  const [productId, setProductId] = useState("");
  const [variantId, setVariantId] = useState("");
  const [parentProductId, setParentProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      setLoadingOptions(true);
      setOptionsError("");
      try {
        const params = new URLSearchParams({ q: search });
        const response = await fetch(`/api/orders/quick?${params}`);
        const result = (await response.json()) as Options & ApiError;
        if (!response.ok) throw new Error(result.error || "Unable to load quick-order options.");
        if (active) setOptions(result);
      } catch (loadError) {
        if (active) setOptionsError(loadError instanceof Error ? loadError.message : "Unable to load quick-order options.");
      } finally {
        if (active) setLoadingOptions(false);
      }
    }, 200);
    return () => { active = false; clearTimeout(timer); };
  }, [search]);

  const selectedProduct = options.products.find((product) => product.id === productId) ?? null;
  const selectedVariant = selectedProduct?.product_variants.find((variant) => variant.id === variantId) ?? null;
  const selectedBasePrice = selectedProduct ? quickOrderBasePrice(selectedProduct, parentProductId || null) : 0;
  const selectedVoucher = options.vouchers.find((voucher) => voucher.id === voucherId) ?? null;
  const hasPreOrder = lines.some((line) => line.is_pre_order);
  const subtotal = useMemo(() => lines.reduce((sum, line) => {
    const product = options.products.find((item) => item.id === line.product_id);
    const variant = product?.product_variants.find((item) => item.id === line.variant_id);
    return sum + ((product ? quickOrderBasePrice(product, line.parent_product_id) : 0) + (variant?.price_adjustment ?? 0)) * line.quantity;
  }, 0), [lines, options.products]);
  const voucherDiscount = useMemo(() => {
    if (!selectedVoucher) return 0;
    if (["free_shipping", "shipping_percent_off"].includes(selectedVoucher.reward_type) || selectedVoucher.scope_type === "shipping_fee") return 0;
    const eligibleLines = lines.filter((line) => {
      if (selectedVoucher.excluded_product_ids?.includes(line.product_id)) return false;
      if (selectedVoucher.scope_type === "product") return Boolean(selectedVoucher.applies_to_product_ids?.includes(line.product_id));
      if (selectedVoucher.scope_type === "category") {
        const product = options.products.find((item) => item.id === line.product_id);
        return Boolean(product?.category_slug && selectedVoucher.applies_to_category_slugs?.includes(product.category_slug));
      }
      return true;
    });
    const eligibleSubtotal = eligibleLines.reduce((sum, line) => {
      const product = options.products.find((item) => item.id === line.product_id);
      const variant = product?.product_variants.find((item) => item.id === line.variant_id);
      return sum + ((product ? quickOrderBasePrice(product, line.parent_product_id) : 0) + (variant?.price_adjustment ?? 0)) * line.quantity;
    }, 0);
    if (selectedVoucher.scope_type !== "shipping_fee" && selectedVoucher.min_item_quantity && eligibleLines.reduce((sum, line) => sum + line.quantity, 0) < selectedVoucher.min_item_quantity) return 0;
    if (selectedVoucher.scope_type !== "order_total" && selectedVoucher.scope_type !== "shipping_fee" && eligibleLines.length === 0) return 0;
    const minimumBase = ["shipping_fee", "free_shipping", "shipping_percent_off"].includes(selectedVoucher.scope_type === "shipping_fee" ? "shipping_fee" : selectedVoucher.reward_type) ? Number(shippingFee) || 0 : eligibleSubtotal;
    if (minimumBase < (selectedVoucher.min_order_amount ?? 0)) return 0;
    if (selectedVoucher.reward_type === "amount_off") return Math.min(eligibleSubtotal, selectedVoucher.amount_off ?? 0);
    if (selectedVoucher.reward_type === "percent_off") {
      const amount = Math.round(eligibleSubtotal * (selectedVoucher.percent_off ?? 0) / 100);
      return Math.min(eligibleSubtotal, selectedVoucher.max_discount_amount ? Math.min(amount, selectedVoucher.max_discount_amount) : amount);
    }
    return 0;
  }, [lines, options.products, selectedVoucher, shippingFee]);
  const shippingDiscount = useMemo(() => {
    if (!selectedVoucher || !["shipping_fee", "free_shipping", "shipping_percent_off"].includes(selectedVoucher.scope_type === "shipping_fee" ? "shipping_fee" : selectedVoucher.reward_type)) return 0;
    const fee = Number(shippingFee) || 0;
    if (selectedVoucher.reward_type === "free_shipping") return fee;
    if (selectedVoucher.reward_type === "shipping_percent_off") {
      const amount = Math.round(fee * (selectedVoucher.percent_off ?? 0) / 100);
      return Math.min(fee, selectedVoucher.max_discount_amount && selectedVoucher.max_discount_amount > 0 ? Math.min(amount, selectedVoucher.max_discount_amount) : amount);
    }
    return 0;
  }, [selectedVoucher, shippingFee]);
  const total = Math.max(0, subtotal + (Number(shippingFee) || 0) - voucherDiscount - shippingDiscount);
  const depositMinPercent = hasPreOrder ? 20 : 1;
  const selectedDepositPercentage = Math.min(80, Math.max(depositMinPercent, Math.round(Number(depositPercentage) || 50)));
  const depositAmount = Math.round(subtotal * selectedDepositPercentage / 100);
  const codRemaining = Math.max(0, total - depositAmount);

  function addLine() {
    if (!selectedProduct) return;
    if (!Number.isFinite(selectedBasePrice)) {
      setError("Select a parent kit to determine this component's price.");
      return;
    }
    if (selectedProduct.product_variants.length && !variantId) {
      setError("Select a variant for this product.");
      return;
    }
    const nextQuantity = Number(quantity);      if (!Number.isSafeInteger(nextQuantity) || nextQuantity < 1 || nextQuantity > 1000) {
      setError("Quantity must be a whole number between 1 and 1,000.");
      return;
    }
    const pricingParentId = parentProductId || (selectedProduct.pricing_parents?.length === 1 ? selectedProduct.pricing_parents[0].id : null);
    const key = `${selectedProduct.id}:${variantId}:${pricingParentId ?? ""}`;
    let added = false;
    setLines((current) => {
      const existing = current.find((line) => line.key === key);
      const isPreOrder = selectedVariant ? selectedVariant.is_pre_order : selectedProduct.is_pre_order;
      const preOrderConfig = selectedVariant?.is_pre_order ? selectedVariant.pre_order_config : selectedProduct.pre_order_config;
      if (isPreOrder && (!preOrderConfig || typeof preOrderConfig !== "object")) {
        setError("This preorder does not have fulfillment configuration set.");
        return current;
      }
      if (existing) {
        const combined = existing.quantity + nextQuantity;
        const stock = variantId ? selectedVariant?.stock_quantity ?? 0 : selectedProduct.stock_quantity ?? 0;
        if (combined > 1000 || (!isPreOrder && (selectedProduct.max_quantity != null && combined > selectedProduct.max_quantity)) || (!isPreOrder && combined > stock)) {
          setError("The quantity exceeds the available stock or per-order limit.");
          return current;
        }
        return current.map((line) => line.key === key ? { ...line, quantity: combined } : line);
      }
      const stock = variantId ? selectedVariant?.stock_quantity ?? 0 : selectedProduct.stock_quantity ?? 0;
      if (!isPreOrder && (nextQuantity > stock || (selectedProduct.max_quantity != null && nextQuantity > selectedProduct.max_quantity))) {
        setError("The quantity exceeds the available stock or per-order limit.");
        return current;
      }
      added = true;
      return [...current, { key, product_id: selectedProduct.id, parent_product_id: pricingParentId, variant_id: variantId, quantity: nextQuantity, is_pre_order: isPreOrder, pre_order_config: preOrderConfig }];
    });
    if (!added) return;
    setProductId("");
    setParentProductId("");
    setVariantId("");
    setQuantity("1");
    setError("");
    setSuccessMessage("Product added to the order.");
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!lines.length) { setError("Add at least one product."); return; }
    setSubmitting(true);
    setError("");
    setSuccessMessage("");
    try {
      const response = await fetch("/api/orders/quick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: { name: customerName, phone, address },
          shipping_fee: Number(shippingFee),
          shipping_method_id: shippingMethodId || null,
          voucher_id: voucherId || null,
          payment: { payment_type: paymentType, deposit_percentage: selectedDepositPercentage, mark_paid_now: markPaidNow },
          items: lines.map(({ product_id, parent_product_id, variant_id, quantity: lineQuantity, is_pre_order: isPreOrder, pre_order_config: preOrderConfig }) => ({ product_id, parent_product_id, variant_id: variant_id || null, quantity: lineQuantity, is_pre_order: isPreOrder, pre_order_config: preOrderConfig })),
        }),
      });
      const result = (await response.json()) as { order_id?: string; order_number?: string; invoice_url?: string | null; error?: string };
      if (!response.ok) throw new Error(result.error || "Unable to create order.");
      router.push(`/orders?created=${encodeURIComponent(result.order_number ?? "")}${result.order_id ? `&orderId=${encodeURIComponent(result.order_id)}` : ""}`);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to create order.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-6xl space-y-6 pb-12">
      <header className="flex items-center justify-between gap-4">
        <div>
          <Link href="/orders" className="mb-2 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800"><ArrowLeft className="h-4 w-4" /> Back to orders</Link>
          <h1 className="text-3xl font-bold text-slate-900">Quick order</h1>
          <p className="mt-1 text-sm text-slate-500">Create and manage a walk-in order with the same fulfillment details as regular orders.</p>
        </div>
        <button type="submit" disabled={submitting || !lines.length} className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">{submitting ? "Creating…" : "Create pending order"}</button>
      </header>

      {(error || optionsError) && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error || optionsError}</div>}
      {successMessage && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{successMessage}</div>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Customer and delivery</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">Customer name<input required maxLength={200} value={customerName} onChange={(event) => setCustomerName(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
              <label className="text-sm font-medium text-slate-700">Phone number (optional)<input maxLength={40} value={phone} onChange={(event) => setPhone(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
              <label className="text-sm font-medium text-slate-700 md:col-span-2">Delivery address<textarea required maxLength={1000} rows={2} value={address} onChange={(event) => setAddress(event.target.value)} className="mt-1 block w-full resize-y rounded-lg border border-slate-300 px-3 py-2 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="Street, ward/district, city" /></label>
              <label className="text-sm font-medium text-slate-700">Shipping method<select value={shippingMethodId} onChange={(event) => setShippingMethodId(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal"><option value="">Choose later</option>{options.shippingMethods.map((method) => <option key={method.id} value={method.id}>{method.name}</option>)}</select></label>
              <label className="text-sm font-medium text-slate-700">Delivery fee (VND)<input required type="number" min={0} max={1_000_000_000} step={1} value={shippingFee} onChange={(event) => setShippingFee(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 font-normal" /></label>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Payment</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">Payment option<select value={paymentType} onChange={(event) => setPaymentType(event.target.value as "full" | "deposit_cod")} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal"><option value="full">Full payment</option><option value="deposit_cod">Deposit + COD</option></select></label>
              {paymentType === "deposit_cod" && <label className="text-sm font-medium text-slate-700">Deposit percentage<input type="number" min={hasPreOrder ? 20 : 1} max={80} step={1} value={depositPercentage} onChange={(event) => setDepositPercentage(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 font-normal" /></label>}
              <label className="flex items-center gap-2 text-sm text-slate-700 md:col-span-2"><input type="checkbox" checked={markPaidNow} onChange={(event) => setMarkPaidNow(event.target.checked)} className="checkbox checkbox-sm" />Payment received now{paymentType === "deposit_cod" ? " (record deposit received)" : " (record full payment)"}</label>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Products</h2>
            <div className="mt-4 grid items-end gap-3 md:grid-cols-[minmax(220px,1fr)_minmax(180px,1fr)_110px_auto]">
              <label className="text-sm font-medium text-slate-700">Find product<div className="relative mt-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products…" className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 font-normal" /></div></label>
              <label className="text-sm font-medium text-slate-700">Product<select value={productId} onChange={(event) => { setProductId(event.target.value); setVariantId(""); setParentProductId(""); }} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal"><option value="">{loadingOptions ? "Loading products…" : "Select product"}</option>{options.products.map((product) => <option key={product.id} value={product.id}>{product.name} · {productPriceLabel(product)}</option>)}</select></label>
              <label className="text-sm font-medium text-slate-700">Quantity<input type="number" min={1} max={1000} step={1} value={quantity} onChange={(event) => setQuantity(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 font-normal" /></label>
              <button type="button" onClick={addLine} disabled={!selectedProduct} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"><Plus className="h-4 w-4" /> Add item</button>
            </div>
            {(selectedProduct?.pricing_parents?.length ?? 0) > 1 && <label className="mt-4 block max-w-xl text-sm font-medium text-slate-700">Parent kit<select className="select select-bordered mt-1 block w-full" value={parentProductId} onChange={(event) => setParentProductId(event.target.value)}><option value="">Select parent kit</option>{selectedProduct!.pricing_parents!.map((parent) => <option key={parent.id} value={parent.id}>{parent.name} · {currency(Number(parent.base_price))}</option>)}</select></label>}
            {selectedProduct?.product_variants.length ? <label className="mt-4 block max-w-xl text-sm font-medium text-slate-700">Variant<select value={variantId} onChange={(event) => setVariantId(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal"><option value="">Select a variant</option>{selectedProduct.product_variants.map((variant) => <option key={variant.id} value={variant.id}>{variant.variant_name} · {Number.isFinite(selectedBasePrice) ? currency(selectedBasePrice + (variant.price_adjustment ?? 0)) : "Choose parent kit"} · {variant.is_pre_order ? "Pre-order" : `stock ${variant.stock_quantity ?? 0}`}</option>)}</select></label> : null}
            {selectedProduct && <p className="mt-2 text-xs text-slate-500">{selectedVariant ? `Selected: ${selectedVariant.variant_name}. ` : ""}{selectedVariant?.is_pre_order || selectedProduct.is_pre_order ? "This is a preorder item; it will not reserve in-stock inventory." : "Price and available stock are rechecked when saved."}</p>}

            {hasPreOrder && <p className="mt-3 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs text-violet-800">Pre-order tracking will be initialized on each preorder line and can be advanced from the order detail.</p>}
            <div className="mt-5 divide-y divide-slate-100 rounded-lg border border-slate-200">
              {lines.length ? lines.map((line) => {
                const product = options.products.find((item) => item.id === line.product_id);
                const variant = product?.product_variants.find((item) => item.id === line.variant_id);
                const unitPrice = (product ? quickOrderBasePrice(product, line.parent_product_id) : 0) + (variant?.price_adjustment ?? 0);
                return <div key={line.key} className="flex items-center gap-3 px-4 py-3"><div className="min-w-0 flex-1"><div className="truncate text-sm font-medium text-slate-900">{product?.name ?? "Product"}{variant ? ` · ${variant.variant_name}` : ""}{line.is_pre_order && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">Pre-order</span>}</div><div className="text-xs text-slate-500">{currency(unitPrice)} × {line.quantity}</div></div><div className="text-sm font-semibold text-slate-800">{currency(unitPrice * line.quantity)}</div><button type="button" onClick={() => setLines((current) => current.filter((item) => item.key !== line.key))} aria-label={`Remove ${product?.name ?? "item"}`} className="rounded p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button></div>;
              }) : <p className="px-4 py-8 text-center text-sm text-slate-500">No products added yet.</p>}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Voucher</h2>
            <p className="mt-1 text-sm text-slate-500">The voucher’s configured rules apply. Customer-specific and shipping-method-specific vouchers are not available for walk-in orders.</p>
            <select value={voucherId} onChange={(event) => setVoucherId(event.target.value)} className="mt-4 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"><option value="">No voucher</option>{options.vouchers.map((voucher) => <option key={voucher.id} value={voucher.id}>{voucher.code} · {voucher.name}</option>)}</select>
          </section>
        </div>

        <aside className="h-fit rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-6">
          <h2 className="text-base font-semibold text-slate-900">Order summary</h2>
          <dl className="mt-4 space-y-3 text-sm"><div className="flex justify-between text-slate-600"><dt>Products</dt><dd>{currency(subtotal)}</dd></div><div className="flex justify-between text-slate-600"><dt>Delivery fee</dt><dd>{currency(Number(shippingFee) || 0)}</dd></div>{selectedVoucher && <div className="flex justify-between text-emerald-700"><dt>{selectedVoucher.code}</dt><dd>−{currency(voucherDiscount + shippingDiscount)}</dd></div>}<div className="border-t border-slate-200 pt-3 flex justify-between font-bold text-slate-900"><dt>Total</dt><dd className="text-lg">{currency(total)}</dd></div></dl>
          {paymentType === "deposit_cod" && <p className="mt-3 flex justify-between text-xs text-slate-600"><span>Deposit ({depositPercentage}%)</span><span>{currency(depositAmount)}</span></p>}
          {paymentType === "deposit_cod" && <p className="flex justify-between text-xs text-slate-600"><span>COD remaining</span><span>{currency(codRemaining)}</span></p>}
          <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">{hasPreOrder ? "Preorder items receive their own fulfillment tracking; only regular in-stock items reserve stock now." : "Saving creates a pending order. In-stock inventory is reserved immediately and restored if canceled."}</p>
          <button type="submit" disabled={submitting || !lines.length} className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">{submitting ? "Creating order…" : "Create pending order"}</button>
        </aside>
      </div>
    </form>
  );
}
