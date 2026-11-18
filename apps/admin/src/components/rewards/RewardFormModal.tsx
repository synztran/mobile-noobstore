"use client";

import NumberInput from "@/components/ui/NumberInput";
import InputSelection from "@/components/ui/InputSelection";
import RichTextEditor from "@/components/ui/RichTextEditor";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type RewardRow = {
  id: string;
  name: string;
  description: string | null;
  reward_type: string;
  points_cost: number;
  image_url: string | null;
  stock: number | null;
  claimed_count: number;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  points_currency?: "nsp" | "daily_checkin";
};

type Props = {
  open: boolean;
  onClose: () => void;
  mode: "create" | "update";
  reward?: RewardRow;
};

const REWARD_TYPES = [
  { value: "voucher", label: "Voucher" },
  { value: "product", label: "Sản phẩm" },
  { value: "point", label: "Điểm thưởng" },
];



export default function RewardFormModal({ open, onClose, mode, reward }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [rewardType, setRewardType] = useState("voucher");
  const [pointsCost, setPointsCost] = useState(0);
  const [pointsCurrency, setPointsCurrency] = useState<"nsp" | "daily_checkin">("nsp");
  const [stock, setStock] = useState<number | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [imageUrl, setImageUrl] = useState("");
  const [metadata, setMetadata] = useState("{}");

  useEffect(() => {
    if (!open) return;
    if (mode === "update" && reward) {
      setName(reward.name ?? "");
      setDescription(reward.description ?? "");
      setRewardType(reward.reward_type);
      setPointsCost(reward.points_cost);
      setPointsCurrency((reward as RewardRow & { points_currency?: "nsp" | "daily_checkin" }).points_currency ?? "nsp");
      setStock(reward.stock);
      setIsActive(reward.is_active);
      setImageUrl(reward.image_url ?? "");
      setMetadata(JSON.stringify(reward.metadata ?? {}, null, 2));
      return;
    }
    setName("");
    setDescription("");
    setRewardType("voucher");
    setPointsCost(0);
    setPointsCurrency("nsp");
    setStock(null);
    setIsActive(true);
    setImageUrl("");
    setMetadata("{}");
    setError("");
  }, [open, mode, reward]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    let parsedMeta: Record<string, unknown> = {};
    try {
      parsedMeta = metadata.trim() ? JSON.parse(metadata) : {};
    } catch {
      setError("Metadata không đúng định dạng JSON.");
      setLoading(false);
      return;
    }

    const url =
      mode === "create"
        ? "/api/rewards"
        : `/api/rewards/${reward!.id}`;
    const method = mode === "create" ? "POST" : "PATCH";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: description || null,
          reward_type: rewardType,
          points_cost: pointsCost,
          points_currency: pointsCurrency,
          stock,
          is_active: isActive,
          image_url: imageUrl || null,
          metadata: parsedMeta,
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Failed to save reward");
      }

      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  const title = mode === "create" ? "Tạo phần thưởng" : "Cập nhật phần thưởng";

  return (
    <div className="fixed inset-0 z-50 !mt-0 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative mx-4 flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-2xl ">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-6 py-4 ">
          <h2 className="text-lg font-semibold text-slate-900 ">
            {title}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto p-6">
            {error && (
              <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Name */}
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700 ">
                  Tên phần thưởng *
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none  "
                  placeholder="VD: Voucher 50k"
                />
              </div>

              {/* Description */}
              <div className="md:col-span-2">
                <RichTextEditor
                  value={description}
                  onChange={setDescription}
                  label="Mô tả"
                  rows={3}
                  placeholder="Mô tả ngắn về phần thưởng"
                />
              </div>

              {/* Reward Type */}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 ">
                  Loại phần thưởng *
                </label>
                <InputSelection
                  options={REWARD_TYPES}
                  value={rewardType}
                  onChange={(e) => setRewardType(e.target.value)}
                  label="Chọn loại"
                />
              </div>

              {/* Points Cost */}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Loại điểm dùng để đổi *</label>
                <select value={pointsCurrency} onChange={(e) => setPointsCurrency(e.target.value as "nsp" | "daily_checkin")} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                  <option value="nsp">Điểm NSP</option>
                  <option value="daily_checkin">Điểm chuyên cần</option>
                </select>
              </div>
              <div>
                <NumberInput
                  value={pointsCost}
                  onChange={(v) => setPointsCost(v ?? 0)}
                  label="Chi phí điểm *"
                  min={0}
                />
              </div>

              {/* Stock */}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 ">
                  Số lượng (để trống nếu không giới hạn)
                </label>
                <input
                  type="number"
                  value={stock ?? ""}
                  onChange={(e) =>
                    setStock(e.target.value ? Number(e.target.value) : null)
                  }
                  min={0}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none  "
                  placeholder="Không giới hạn"
                />
              </div>

              {/* Image URL */}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 ">
                  URL hình ảnh
                </label>
                <input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none  "
                  placeholder="https://..."
                />
              </div>
            </div>

            {/* Metadata JSON */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 ">
                Metadata (JSON)
              </label>
              <textarea
                value={metadata}
                onChange={(e) => setMetadata(e.target.value)}
                rows={6}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs focus:border-blue-500 focus:outline-none  "
                placeholder='{"amount_off": 50000, ...}'
              />
              <p className="mt-1 text-xs text-slate-500">
                {rewardType === "voucher" &&
                  'VD: {"amount_off": 50000, "percent_off": null, "min_order_amount": 300000, "scope_type": "order_total", "reward_type": "amount_off"}'}
                {rewardType === "product" &&
                  'VD: {"product_id": "...", "variant_id": "...", "quantity": 1}'}
                {rewardType === "point" && 'VD: {"point_amount": 500}'}
              </p>
            </div>

            {/* Active toggle */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={isActive}
                onClick={() => setIsActive(!isActive)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:outline-none ${
                  isActive ? "bg-green-500" : "bg-slate-300"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                    isActive ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
              <label
                onClick={() => setIsActive(!isActive)}
                className="cursor-pointer text-sm font-medium text-slate-700 "
              >
                {isActive ? "Đang hoạt động" : "Đã tắt"}
              </label>
            </div>
          </div>

          {/* Footer */}
          <div className="flex shrink-0 justify-end gap-3 border-t border-slate-200 px-6 py-4 ">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50  "
            >
              Huỷ
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Đang lưu..." : "Lưu"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
