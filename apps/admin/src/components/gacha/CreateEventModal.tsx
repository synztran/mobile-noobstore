"use client";

import { X } from "lucide-react";
import { useState } from "react";
import NumberInput from "@/components/ui/NumberInput";
import RichTextEditor from "@/components/ui/RichTextEditor";

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

export function CreateEventModal({ onClose, onCreated }: Props) {
  const [form, setForm] = useState<{
    name: string;
    description: string;
    start_at: string;
    end_at: string;
    is_active: boolean;
    free_tokens_per_grant: number | null;
    free_token_interval_days: number | null;
    theme: string;
  }>({
    name: "",
    description: "",
    start_at: "",
    end_at: "",
    is_active: false,
    free_tokens_per_grant: 3,
    free_token_interval_days: 1,
    theme: "classic",
  });

  const THEMES = [
    { value: "classic", label: "Classic (màu trắng)" },
    { value: "ga2", label: "Mega Arcade (đèn neon + hốc kính hồng)" },
  ] as const;
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/gacha/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },        body: JSON.stringify({
        ...form,
        start_at: new Date(form.start_at).toISOString(),
        end_at: new Date(form.end_at).toISOString(),
        is_active: false,
      }),
    });
    if (res.ok) {
      onCreated();
    }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 !mt-0 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" />
      <div className="card-bg relative w-full max-w-lg space-y-4 rounded-xl p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-heading text-lg font-bold">Create Gacha Event</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-100 "
          >
            <X className="text-muted h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-body mb-1 block text-sm font-medium">
              Event Name
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input-base w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="Summer Lucky Draw"
            />
          </div>

          <div>
            <label className="text-body mb-1 block text-sm font-medium">
              Theme
            </label>
            <select
              value={form.theme}
              onChange={(e) => setForm({ ...form, theme: e.target.value })}
              className="input-base w-full rounded-lg border px-3 py-2 text-sm"
            >
              {THEMES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <RichTextEditor
              value={form.description}
              onChange={(html) => setForm({ ...form, description: html })}
              label="Description"
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-body mb-1 block text-sm font-medium">
                Start At
              </label>
              <input
                type="datetime-local"
                required
                value={form.start_at}
                onChange={(e) => setForm({ ...form, start_at: e.target.value })}
                className="input-base w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-body mb-1 block text-sm font-medium">
                End At
              </label>
              <input
                type="datetime-local"
                required
                value={form.end_at}
                onChange={(e) => setForm({ ...form, end_at: e.target.value })}
                className="input-base w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <NumberInput
              value={form.free_tokens_per_grant}
              onChange={(v) => setForm({ ...form, free_tokens_per_grant: v })}
              min={1}
              className="w-full"
              label="Free Tokens per Grant"
            />
            <NumberInput
              value={form.free_token_interval_days}
              onChange={(v) =>
                setForm({ ...form, free_token_interval_days: v })
              }
              min={1}
              className="w-full"
              label="Free Token Interval (days)"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="text-body rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium transition-colors hover:bg-slate-200  "
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700 disabled:opacity-50"
            >
              {saving ? "Creating..." : "Create Event"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
