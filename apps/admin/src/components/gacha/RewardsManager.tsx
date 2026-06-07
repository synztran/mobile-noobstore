"use client";

import { Loader2, Plus, Save, Trash2, Upload, X } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchRewards } from "@/lib/react-query/gacha/queries";
import { adminQueryKeys } from "@/lib/react-query/root";
import NumberInput from "@/components/ui/NumberInput";
import RewardsTable from "./RewardsTable";
import RewardsWinnersModal from "./RewardsWinnersModal";
import { Reward } from "./types/gacha";

interface Props {
  eventId: string;
}

const REWARD_TYPES = [
  { value: "product", label: "Product" },
  { value: "point", label: "Point" },
  { value: "puzzle", label: "Puzzle" },
  { value: "lucky_text", label: "Lucky Text" },
];

export function RewardsManager({ eventId }: Props) {
  const [winnersModalOpen, setWinnersModalOpen] = useState(false);
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const queryClient = useQueryClient();

  const { data: rewards = [], isLoading: loading } = useQuery<Reward[], Error>({
    queryKey: adminQueryKeys.gacha.rewards(eventId),
    queryFn: () => fetchRewards(eventId),
    enabled: !!eventId,
  });
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [thumbnailError, setThumbnailError] = useState<string | null>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<{
    name: string;
    reward_type: Reward["reward_type"];
    weight: number | null;
    max_quantity: string;
    is_golden: boolean;
    thumbnail_url: string;
    percent_display: string;
  }>({
    name: "",
    reward_type: "lucky_text" as Reward["reward_type"],
    weight: 100,
    max_quantity: "",
    is_golden: false,
    thumbnail_url: "",
    percent_display: "",
  });

  // rewards are loaded via react-query

  function resetForm() {
    setForm({
      name: "",
      reward_type: "lucky_text",
      weight: 100,
      max_quantity: "",
      is_golden: false,
      thumbnail_url: "",
      percent_display: "",
    });
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(reward: Reward) {
    setForm({
      name: reward.name,
      reward_type: reward.reward_type,
      weight: reward.weight ?? 0,
      max_quantity: reward.max_quantity?.toString() ?? "",
      is_golden: reward.is_golden,
      thumbnail_url: reward.thumbnail_url ?? "",
      percent_display: reward.percent_display?.toString() ?? "",
    });
    setEditingId(reward.id);
    setShowForm(true);
  }

  function openWinners(reward: Reward) {
    setSelectedReward(reward);
    setWinnersModalOpen(true);
  }

  function closeWinnersModal() {
    setWinnersModalOpen(false);
    setSelectedReward(null);
  }

  async function handleThumbnailFile(file: File) {
    setThumbnailError(null);
    setThumbnailUploading(true);

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("slug", "gacha-rewards");

      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();

      if (!res.ok) {
        setThumbnailError(data.error ?? "Upload failed");
        return;
      }

      setForm((prev) => ({ ...prev, thumbnail_url: data.url ?? "" }));
    } catch {
      setThumbnailError("Upload failed");
    } finally {
      setThumbnailUploading(false);
    }
  }

  function onThumbnailInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleThumbnailFile(file);
    e.target.value = "";
  }

  function onThumbnailDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleThumbnailFile(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name: form.name,
      reward_type: form.reward_type,
      weight: form.weight,
      max_quantity: form.max_quantity ? Number(form.max_quantity) : null,
      is_golden: form.is_golden,
      thumbnail_url: form.thumbnail_url || null,
      percent_display: form.percent_display
        ? Number(form.percent_display)
        : null,
    };

    if (editingId) {
      await fetch(`/api/gacha/events/${eventId}/rewards/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch(`/api/gacha/events/${eventId}/rewards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    resetForm();
    queryClient.invalidateQueries({
      queryKey: adminQueryKeys.gacha.rewards(eventId),
    });
  }

  async function handleDelete(rewardId: string) {
    if (!confirm("Delete this reward?")) return;
    await fetch(`/api/gacha/events/${eventId}/rewards/${rewardId}`, {
      method: "DELETE",
    });
    queryClient.invalidateQueries({
      queryKey: adminQueryKeys.gacha.rewards(eventId),
    });
  }

  // Calculate total weight for percentage display
  const totalWeight = rewards.reduce((sum, r) => sum + (r.weight ?? 0), 0);

  return (
    <div className="space-y-4">
      {/* Add button */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700"
        >
          <Plus className="h-4 w-4" />
          Add Reward
        </button>
      )}

      {/* Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="card-bg card-shadow space-y-4 rounded-lg p-5"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-heading font-bold">
              {editingId ? "Edit Reward" : "New Reward"}
            </h3>
            <button
              type="button"
              onClick={resetForm}
              className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <X className="text-muted h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-[220px_1fr]">
            <div className="space-y-2">
              <label className="text-body mb-1 block text-sm font-medium">
                Thumbnail
              </label>
              <div
                onDrop={onThumbnailDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => thumbnailInputRef.current?.click()}
                className="relative h-[220px] w-[220px] max-w-full cursor-pointer overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 transition-colors hover:border-purple-400"
              >
                {form.thumbnail_url ? (
                  <>
                    <Image
                      src={form.thumbnail_url}
                      alt="Reward thumbnail"
                      fill
                      className="object-cover"
                      sizes="220px"
                    />
                    <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/0 opacity-0 transition-colors hover:bg-black/30 hover:opacity-100">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          thumbnailInputRef.current?.click();
                        }}
                        className="rounded-lg bg-white p-2 text-slate-700 shadow hover:bg-slate-100"
                      >
                        <Upload className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setForm((prev) => ({ ...prev, thumbnail_url: "" }));
                        }}
                        className="rounded-lg bg-white p-2 text-red-600 shadow hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400">
                    {thumbnailUploading ? (
                      <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
                    ) : (
                      <Upload className="h-6 w-6" />
                    )}
                    <p className="px-2 text-center text-xs">
                      Click or drag image
                    </p>
                  </div>
                )}
              </div>
              <input
                ref={thumbnailInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={onThumbnailInputChange}
              />
              {thumbnailError && (
                <p className="text-xs text-red-600">{thumbnailError}</p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="text-body mb-1 block text-sm font-medium">
                  Name
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input-base w-full rounded-lg border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-body mb-1 block text-sm font-medium">
                  Type
                </label>
                <select
                  value={form.reward_type}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      reward_type: e.target.value as Reward["reward_type"],
                    })
                  }
                  className="input-base w-full rounded-lg border px-3 py-2 text-sm"
                >
                  {REWARD_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-body mb-1 block text-sm font-medium">
                  Weight (probability)
                </label>
                <NumberInput
                  value={form.weight}
                  onChange={(v) => setForm({ ...form, weight: v })}
                  min={0}
                  required
                  step={1}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-body mb-1 block text-sm font-medium">
                  Max Quantity (empty = unlimited)
                </label>
                <NumberInput
                  value={
                    form.max_quantity === "" ? null : Number(form.max_quantity)
                  }
                  onChange={(v) =>
                    setForm({
                      ...form,
                      max_quantity: v != null ? String(v) : "",
                    })
                  }
                  min={0}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-body mb-1 block text-sm font-medium">
                  Display % (override)
                </label>
                <NumberInput
                  value={
                    form.percent_display === ""
                      ? null
                      : Number(form.percent_display)
                  }
                  onChange={(v) =>
                    setForm({
                      ...form,
                      percent_display: v != null ? String(v) : "",
                    })
                  }
                  min={0}
                  max={100}
                  step={0.01}
                  className="w-full"
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.is_golden}
                onChange={(e) =>
                  setForm({ ...form, is_golden: e.target.checked })
                }
                className="rounded"
              />
              <span className="text-body font-medium">
                Golden reward (rare)
              </span>
            </label>
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={resetForm}
              className="text-body rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium transition-colors hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700"
            >
              <Save className="h-4 w-4" />
              {editingId ? "Update" : "Create"}
            </button>
          </div>
        </form>
      )}

      {/* Rewards table */}
      {loading ? (
        <div className="card-bg card-shadow animate-pulse rounded-lg p-6">
          <div className="h-4 w-48 rounded bg-slate-200 dark:bg-slate-700" />
        </div>
      ) : (
        <>
          <RewardsTable
            rewards={rewards}
            totalWeight={totalWeight}
            onEdit={startEdit}
            onDelete={handleDelete}
            onViewWinners={openWinners}
          />
          <RewardsWinnersModal
            open={winnersModalOpen}
            onClose={closeWinnersModal}
            reward={selectedReward}
            eventId={eventId}
          />
        </>
      )}
    </div>
  );
}
