"use client";

import { formatVND } from "@/lib/currency";
import { SingleImageUploader } from "@/components/ui/ImageUploader";
import { Pencil, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type RankRow = {
  id: string;
  name: string;
  slug: string;
  level: number;
  min_total_spent: number;
  min_order_count: number;
  benefits: any;
  color: string;
  icon_url: string | null;
  icon_label: string | null;
  is_active: boolean;
};

type Props = {
  mode: "create" | "update";
  rank?: RankRow;
  onClose?: () => void;
};

const DEFAULT_BENEFITS = {
  points_multiplier: 1,
  discount_percent: 0,
  free_shipping: false,
  exclusive_voucher_frequency: "none",
  priority_support: false,
  flags: {
    points_multiplier_enabled: false,
    discount_percent_enabled: false,
    free_shipping_enabled: false,
    exclusive_voucher_enabled: false,
    priority_support_enabled: false,
  },
};

function toBool(v: unknown): boolean {
  return v === true || v === "true";
}

export default function RankFormModal({ mode, rank, onClose }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [level, setLevel] = useState("");
  const [color, setColor] = useState("#6B7280");
  const [iconUrl, setIconUrl] = useState("");
  const [iconLabel, setIconLabel] = useState("");
  const [minTotalSpent, setMinTotalSpent] = useState("");
  const [minOrderCount, setMinOrderCount] = useState("");

  const [pointsMultiplier, setPointsMultiplier] = useState("1");
  const [discountPercent, setDiscountPercent] = useState("0");
  const [freeShipping, setFreeShipping] = useState(false);
  const [prioritySupport, setPrioritySupport] = useState(false);

  function populateFields(r: RankRow) {
    const b = r.benefits ?? DEFAULT_BENEFITS;
    setName(r.name);
    setSlug(r.slug);
    setLevel(String(r.level));
    setColor(r.color);
    setIconUrl(r.icon_url ?? "");
    setIconLabel(r.icon_label ?? "");
    setMinTotalSpent(String(r.min_total_spent));
    setMinOrderCount(String(r.min_order_count));
    setPointsMultiplier(String(b.points_multiplier ?? 1));
    setDiscountPercent(String(b.discount_percent ?? 0));
    setFreeShipping(toBool(b.free_shipping));
    setPrioritySupport(toBool(b.priority_support));
  }

  function handleOpen() {
    if (mode === "update" && rank) populateFields(rank);
    setOpen(true);
  }

  const handleClose = () => {
    if (onClose) onClose();
    else setOpen(false);
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const pm = Number(pointsMultiplier) || 1;
    const dp = Number(discountPercent) || 0;

    const benefits = {
      points_multiplier: pm,
      discount_percent: dp,
      free_shipping: freeShipping,
      exclusive_voucher_frequency: "none",
      priority_support: prioritySupport,
      flags: {
        points_multiplier_enabled: pm > 1,
        discount_percent_enabled: dp > 0,
        free_shipping_enabled: freeShipping,
        exclusive_voucher_enabled: false,
        priority_support_enabled: prioritySupport,
      },
    };

    const payload = {
      name: name.trim(),
      slug: slug.trim().toLowerCase().replace(/\s+/g, "-"),
      level: Number(level),
      color,
      icon_url: iconUrl || null,
      icon_label: iconLabel.trim() || null,
      min_total_spent: Number(minTotalSpent) || 0,
      min_order_count: Number(minOrderCount) || 0,
      benefits,
    };

    const url = mode === "create" ? "/api/ranks" : `/api/ranks/${rank?.id}`;
    const method = mode === "create" ? "POST" : "PATCH";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => null);
    setLoading(false);

    if (!res.ok) {
      setError(data?.error ?? `Failed to ${mode} rank`);
      return;
    }

    handleClose();
    router.refresh();
  }

  const modalOpen = open;

  return (
    <>
      {!modalOpen &&
        (mode === "create" ? (
          <button
            type="button"
            onClick={handleOpen}
            className="btn btn-primary gap-2"
          >
            <Plus className="h-5 w-5" />
            Add New Rank
          </button>
        ) : (
          <button
            type="button"
            onClick={handleOpen}
            className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-700 hover:bg-amber-100"
          >
            <Pencil className="h-3.5 w-3.5" />
            Sửa
          </button>
        ))}

      {modalOpen && (
        <div className="fixed inset-0 z-50 !mt-0 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
          <div className="relative mx-4 flex max-h-[90vh] w-full max-w-[40vw] flex-col rounded-xl bg-white shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-900">
                {mode === "create" ? "Create Rank" : "Update Rank"}
              </h2>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg p-1 transition-colors hover:bg-slate-100"
              >
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="flex-1 space-y-4 overflow-y-auto p-6">
                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Vàng"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Slug <span className="text-red-500">*</span>
                    </label>
                    <input
                      required
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="gold"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Level <span className="text-red-500">*</span>
                    </label>
                    <input
                      required
                      type="number"
                      min="1"
                      value={level}
                      onChange={(e) => setLevel(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="3"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="h-10 min-w-10 cursor-pointer border border-slate-300"
                      />
                      <input
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="flex-1 rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="col-span-2">
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Icon Image
                    </label>
                    <SingleImageUploader
                      value={iconUrl}
                      onChange={setIconUrl}
                      slug="rank-icons"
                    />
                    {iconUrl && (
                      <button
                        type="button"
                        onClick={() => setIconUrl("")}
                        className="mt-1 inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-100"
                      >
                        <X className="h-3 w-3" />
                        Remove image
                      </button>
                    )}
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Icon Label
                    </label>
                    <input
                      value={iconLabel}
                      onChange={(e) => setIconLabel(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="V"
                      maxLength={4}
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      Fallback when no icon image (max 4 chars)
                    </p>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Min Total Spent (VND)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={minTotalSpent}
                      onChange={(e) => setMinTotalSpent(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="2000000"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Min Order Count
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={minOrderCount}
                      onChange={(e) => setMinOrderCount(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="5"
                    />
                  </div>
                </div>

                {/* Benefits section */}
                <div className="rounded-lg border border-slate-200 p-4">
                  <h3 className="mb-3 text-sm font-semibold text-slate-900">
                    Benefits
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <label className="flex-1 text-sm text-slate-700">
                        Points Multiplier
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="0.001"
                        value={pointsMultiplier}
                        onChange={(e) => setPointsMultiplier(e.target.value)}
                        className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-right text-sm"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="flex-1 text-sm text-slate-700">
                        Discount %
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={discountPercent}
                        onChange={(e) => setDiscountPercent(e.target.value)}
                        className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-right text-sm"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="flex-1 text-sm text-slate-700">
                        Free Shipping
                      </label>
                      <input
                        type="checkbox"
                        checked={freeShipping}
                        onChange={(e) => setFreeShipping(e.target.checked)}
                        className="toggle toggle-success"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="flex-1 text-sm text-slate-700">
                        Priority Support
                      </label>
                      <input
                        type="checkbox"
                        checked={prioritySupport}
                        onChange={(e) => setPrioritySupport(e.target.checked)}
                        className="toggle toggle-success"
                      />
                    </div>
                  </div>
                </div>

                {/* Preview */}
                <div className="rounded-lg border border-slate-200 p-4">
                  <h3 className="mb-2 text-sm font-semibold text-slate-900">
                    Preview
                  </h3>
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-black text-white"
                      style={{ backgroundColor: color }}
                    >
                      {iconLabel || name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {name || "Rank Name"}
                      </p>
                      <p className="text-xs text-slate-500">
                        Level {level || "?"} —{" "}
                        {formatVND(Number(minTotalSpent) || 0)} /{" "}
                        {minOrderCount || "0"} đơn
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 justify-end gap-3 border-t border-slate-200 px-6 py-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading
                    ? "Saving..."
                    : mode === "create"
                      ? "Create Rank"
                      : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
