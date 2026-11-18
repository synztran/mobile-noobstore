"use client";

import { Dices, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import NumberInput from "@/components/ui/NumberInput";
import InputSelection from "../ui/InputSelection";
import VoucherTargetingFields from "./VoucherTargetingFields";
import { formatVND } from "@/lib/currency";
import type {
  AdminVoucher,
  VoucherRewardType,
  VoucherScopeType,
  VoucherStatus,
} from "./types";

type Props = {
  open: boolean;
  onClose: () => void;
  mode: "create" | "update";
  voucher?: AdminVoucher;
};

const REWARD_TYPES: {
  value: VoucherRewardType;
  label: string;
}[] = [
  {
    value: "amount_off",
    label: "Giảm giá trực tiếp",
  },
  {
    value: "percent_off",
    label: "Giảm giá theo phần trăm",
  },
  {
    value: "shipping_amount_off",
    label: "[Shipping] Giảm giá trực tiếp shipping",
  },
  {
    value: "shipping_percent_off",
    label: "[Shipping] Giảm giá theo phần trăm",
  },
  {
    value: "free_shipping",
    label: "Free Shipping",
  },
];

/**
 * Reward types whose saving comes off the shipping fee rather than the cart.
 * Mirrors `isShippingReward` in apps/web/src/lib/voucher-discount.ts.
 */
function isShippingRewardType(rewardType: VoucherRewardType): boolean {
  return (
    rewardType === "shipping_amount_off" ||
    rewardType === "shipping_percent_off" ||
    rewardType === "free_shipping"
  );
}

const STATUSES: { value: VoucherStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "scheduled", label: "Scheduled" },
  { value: "expired", label: "Expired" },
  { value: "disabled", label: "Disabled" },
];

function generateVoucherCode(length = 8): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no O/0, I/1 to avoid confusion
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let code = "";
  for (const b of bytes) {
    code += chars[b % chars.length];
  }
  return code;
}

function toDateTimeLocal(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const timezoneOffset = date.getTimezoneOffset() * 60000;
  const local = new Date(date.getTime() - timezoneOffset);
  return local.toISOString().slice(0, 16);
}

export default function VoucherFormModal({
  open,
  onClose,
  mode,
  voucher,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [rewardType, setRewardType] = useState<VoucherRewardType>("amount_off");
  const [percentOff, setPercentOff] = useState("");
  const [amountOff, setAmountOff] = useState<number | null>(null);
  const [usageLimitTotal, setUsageLimitTotal] = useState("");
  const [usageLimitPerUser, setUsageLimitPerUser] = useState("");
  const [status, setStatus] = useState<VoucherStatus>("draft");
  const [minOrderAmount, setMinOrderAmount] = useState<number | null>(null);
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [stackable, setStackable] = useState(false);
  const [autoApply, setAutoApply] = useState(false);
  const [scopeType, setScopeType] = useState<VoucherScopeType>("order_total");
  const [appliesToProductIds, setAppliesToProductIds] = useState<string[]>([]);
  const [appliesToCategorySlugs, setAppliesToCategorySlugs] = useState<
    string[]
  >([]);
  const [excludedProductIds, setExcludedProductIds] = useState<string[]>([]);
  const [shippingMethodIds, setShippingMethodIds] = useState<string[]>([]);
  const [customerIds, setCustomerIds] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setError(null);

    if (mode === "update" && voucher) {
      setName(voucher.name ?? "");
      setCode(voucher.code ?? "");
      setDescription(voucher.description ?? "");
      setRewardType(voucher.reward_type ?? "amount_off");
      setPercentOff(
        voucher.percent_off === null ? "" : String(voucher.percent_off)
      );
      setAmountOff(
        voucher.amount_off === null ? 0 : Number(voucher.amount_off)
      );
      setUsageLimitTotal(
        voucher.usage_limit_total === null
          ? ""
          : String(voucher.usage_limit_total)
      );
      setUsageLimitPerUser(
        voucher.usage_limit_per_user === null
          ? ""
          : String(voucher.usage_limit_per_user)
      );
      setStatus(voucher.status ?? "draft");
      setMinOrderAmount(voucher.min_order_amount ?? null);
      setStartAt(toDateTimeLocal(voucher.start_at));
      setEndAt(toDateTimeLocal(voucher.end_at));
      setStackable(Boolean(voucher.stackable));
      setAutoApply(voucher.auto_apply);
      setScopeType(voucher.scope_type);
      setAppliesToProductIds(voucher.applies_to_product_ids ?? []);
      setAppliesToCategorySlugs(voucher.applies_to_category_slugs ?? []);
      setExcludedProductIds(voucher.excluded_product_ids ?? []);
      setShippingMethodIds(voucher.applies_to_shipping_methods ?? []);
      setCustomerIds(voucher.customer_ids ?? []);
      return;
    }

    setName("");
    setCode("");
    setDescription("");
    setRewardType("amount_off");
    setPercentOff("");
    setAmountOff(null);
    setUsageLimitTotal("");
    setUsageLimitPerUser("");
    setStatus("draft");
    setMinOrderAmount(null);
    setStartAt("");
    setEndAt("");
    setStackable(false);
    setAutoApply(false);
    setScopeType("order_total");
    setAppliesToProductIds([]);
    setAppliesToCategorySlugs([]);
    setExcludedProductIds([]);
    setShippingMethodIds([]);
    setCustomerIds([]);
  }, [open, mode, voucher]);

  const title = mode === "create" ? "Create New Voucher" : "Update Voucher";
  const submitLabel = mode === "create" ? "Create Voucher" : "Save Changes";

  const creatorName = useMemo(() => {
    if (!voucher?.creator) return "Unknown";
    const firstName = voucher.creator.first_name ?? "";
    const lastName = voucher.creator.last_name ?? "";
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || voucher.creator.email;
  }, [voucher]);

  const sortedAppliedOrders = useMemo(() => {
    const orders = voucher?.applied_orders ?? [];
    return [...orders].sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bTime - aTime;
    });
  }, [voucher]);

  const discountField = useMemo(() => {
    // The reward type now states the target, so the labels no longer depend on
    // scope: a shipping variant always says "shipping". Before the shipping
    // reward types existed this had to be inferred from scope_type, which is
    // what made a 50%-shipping voucher indistinguishable from a 50%-cart one.
    const shippingReward = isShippingRewardType(rewardType);

    if (rewardType === "amount_off" || rewardType === "shipping_amount_off") {
      return (
        <NumberInput
          value={amountOff}
          onChange={(v) => setAmountOff(v != null ? Number(v) : 0)}
          min={1}
          step="0.01"
          required
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="50000"
          label={shippingReward ? "Amount Off Shipping" : "Amount Off"}
          subLabel={
            shippingReward
              ? `Phí vận chuyển: -${formatVND(amountOff ?? 0)}`
              : formatVND(amountOff ?? 0)
          }
        />
      );
    }

    if (rewardType === "percent_off" || rewardType === "shipping_percent_off") {
      return (
        <div>
          <NumberInput
            value={percentOff === "" ? null : Number(percentOff)}
            onChange={(v) => setPercentOff(v != null ? String(v) : "")}
            min={1}
            max={100}
            step="0.01"
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="10"
            label={
              shippingReward ? "Percent Off Shipping (%)" : "Percent Off (%)"
            }
            subLabel={
              shippingReward
                ? "Áp dụng trên phí vận chuyển"
                : "Enter the percentage to discount"
            }
          />
        </div>
      );
    }

    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
        No discount value required for free shipping.
      </div>
    );
  }, [amountOff, percentOff, rewardType]);

  if (!open) return null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const payload = {
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description: description.trim() || null,
      reward_type: rewardType,
      // The two shipping variants reuse the same amount_off/percent_off
      // columns as their cart counterparts — the reward type alone says which
      // bucket the value is applied to.
      amount_off:
        rewardType === "amount_off" || rewardType === "shipping_amount_off"
          ? Number(amountOff)
          : null,
      percent_off:
        (rewardType === "percent_off" ||
          rewardType === "shipping_percent_off") &&
        percentOff.trim()
          ? Number(percentOff)
          : null,
      usage_limit_total: usageLimitTotal.trim()
        ? Number(usageLimitTotal)
        : null,
      usage_limit_per_user: usageLimitPerUser.trim()
        ? Number(usageLimitPerUser)
        : null,
      status,
      min_order_amount: minOrderAmount ?? null,
      start_at: startAt ? new Date(startAt).toISOString() : null,
      end_at: endAt ? new Date(endAt).toISOString() : null,
      stackable,
      auto_apply: autoApply,
      scope_type: scopeType,
      applies_to_product_ids:
        scopeType === "product" ? appliesToProductIds : [],
      applies_to_category_slugs:
        scopeType === "category" ? appliesToCategorySlugs : [],
      excluded_product_ids:
        scopeType === "product" || scopeType === "category"
          ? excludedProductIds
          : null,
      applies_to_shipping_methods:
        shippingMethodIds.length > 0 ? shippingMethodIds : null,
      customer_ids: customerIds.length > 0 ? customerIds : null,
    };

    const url =
      mode === "create"
        ? "/api/vouchers"
        : `/api/vouchers/${voucher?.id ?? ""}`;
    const method = mode === "create" ? "POST" : "PATCH";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => null);
    setLoading(false);

    if (!res.ok) {
      setError(data?.error ?? `Failed to ${mode} voucher`);
      return;
    }

    onClose();
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 !mt-0 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative mx-4 flex max-h-[90vh] w-full max-w-3xl flex-col rounded-xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 transition-colors hover:bg-slate-100"
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto p-6">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {mode === "update" && voucher && (
              <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Voucher Owner
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {creatorName}
                  </p>
                  <p className="text-xs text-slate-500">
                    {voucher.creator?.email ??
                      voucher.created_by ??
                      "No creator linked"}
                  </p>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Applied Orders
                    </p>
                    <span className="text-xs text-slate-500">
                      {sortedAppliedOrders.length} orders
                    </span>
                  </div>

                  {sortedAppliedOrders.length > 0 ? (
                    <div className="max-h-44 space-y-2 overflow-y-auto pr-1">
                      {sortedAppliedOrders.slice(0, 8).map((order) => {
                        const customerFirstName =
                          order.customer?.first_name ?? "";
                        const customerLastName =
                          order.customer?.last_name ?? "";
                        const customerFullName =
                          `${customerFirstName} ${customerLastName}`.trim();
                        const customerDisplay =
                          customerFullName ||
                          order.customer?.email ||
                          order.user_id ||
                          "Unknown customer";

                        return (
                          <div
                            key={order.id}
                            className="rounded border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-slate-900">
                                {order.order_number}
                              </span>
                              <span className="capitalize text-slate-500">
                                {order.status}
                              </span>
                            </div>
                            <div className="mt-1 text-slate-600">
                              Customer: {customerDisplay}
                            </div>
                            <div className="text-slate-500">
                              Total: {order.total_price.toLocaleString("vi-VN")}
                              ₫
                              {order.created_at && (
                                <span>
                                  {" "}
                                  •{" "}
                                  {new Date(
                                    order.created_at
                                  ).toLocaleDateString("vi-VN")}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {sortedAppliedOrders.length > 8 && (
                        <p className="pt-1 text-center text-xs text-slate-500">
                          Showing latest 8 of {sortedAppliedOrders.length}{" "}
                          orders
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">
                      No orders have applied this voucher yet.
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Code <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="w-full flex-1 rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="WELCOME10"
                  />
                  {mode === "create" && (
                    <button
                      type="button"
                      onClick={() => setCode(generateVoucherCode())}
                      title="Generate random code"
                      aria-label="Generate random code"
                      className="rounded-lg border border-slate-300 px-3 py-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                    >
                      <Dices className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Voucher name"
                />
              </div>

              <div>
                <InputSelection
                  label="Reward Type"
                  options={REWARD_TYPES}
                  value={rewardType}
                  onChange={(e) =>
                    setRewardType(e.target.value as VoucherRewardType)
                  }
                  required
                />
              </div>

              {discountField}

              <div>
                <InputSelection
                  label="Status"
                  options={STATUSES}
                  value={status}
                  onChange={(e) => setStatus(e.target.value as VoucherStatus)}
                  required
                />
              </div>

              <NumberInput
                value={minOrderAmount}
                onChange={(v) => setMinOrderAmount(v ?? null)}
                min={0}
                step="0.01"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
                label="Min Order Amount (VND)"
                subLabel={formatVND(minOrderAmount ?? 0)}
              />

              <NumberInput
                value={usageLimitTotal === "" ? null : Number(usageLimitTotal)}
                onChange={(v) => setUsageLimitTotal(v != null ? String(v) : "")}
                min={1}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Leave blank for unlimited"
                label="Usage Limit Total"
              />

              <NumberInput
                value={
                  usageLimitPerUser === "" ? null : Number(usageLimitPerUser)
                }
                onChange={(v) =>
                  setUsageLimitPerUser(v != null ? String(v) : "")
                }
                min={1}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Leave blank for unlimited"
                label="Usage Limit Per User"
              />

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Start At
                </label>
                <input
                  type="datetime-local"
                  value={startAt}
                  onChange={(e) => setStartAt(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  End At
                </label>
                <input
                  type="datetime-local"
                  value={endAt}
                  onChange={(e) => setEndAt(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Description
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Optional description"
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={stackable}
                onChange={(e) => setStackable(e.target.checked)}
                className="toggle toggle-success toggle-sm"
              />
              <label className="text-sm text-slate-700">
                Stackable with other vouchers
              </label>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={autoApply}
                onChange={(e) => setAutoApply(e.target.checked)}
                className="toggle toggle-success toggle-sm"
              />
              <label className="flex-1 text-sm text-slate-700">
                Auto-apply at checkout
                <span className="ml-1 text-xs text-slate-400">
                  (when off, customer must enter code manually)
                </span>
              </label>
            </div>

            <VoucherTargetingFields
              scopeType={scopeType}
              onScopeTypeChange={setScopeType}
              productIds={appliesToProductIds}
              onProductIdsChange={setAppliesToProductIds}
              categorySlugs={appliesToCategorySlugs}
              onCategorySlugsChange={setAppliesToCategorySlugs}
              excludedProductIds={excludedProductIds}
              onExcludedProductIdsChange={setExcludedProductIds}
              shippingMethodIds={shippingMethodIds}
              onShippingMethodIdsChange={setShippingMethodIds}
              customerIds={customerIds}
              onCustomerIdsChange={setCustomerIds}
            />
          </div>
          <div className="flex shrink-0 justify-end gap-3 border-t border-slate-200 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? `${submitLabel}...` : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
