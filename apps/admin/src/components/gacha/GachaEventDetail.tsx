"use client";

import type { GachaEvent } from "@/app/(admin)/gacha/page";
import { ArrowLeft, Pencil, Save, X } from "lucide-react";
import { useEffect, useState } from "react";
import { RewardsManager } from "./RewardsManager";
import { MissionsManager } from "./MissionsManager";
import { BlockedUsersManager } from "./BlockedUsersManager";
import { RewardHistoryManager } from "./RewardHistoryManager";
import NumberInput from "@/components/ui/NumberInput";
import RichTextEditor from "@/components/ui/RichTextEditor";

type Tab = "rewards" | "missions" | "history" | "blacklist";

interface Props {
  event: GachaEvent;
  onBack: () => void;
  onUpdate: (event: GachaEvent) => void;
}

export function GachaEventDetail({ event, onBack, onUpdate }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("rewards");
  const [editing, setEditing] = useState(false);
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
    name: event.name,
    description: event.description ?? "",
    start_at: event.start_at.slice(0, 16),
    end_at: event.end_at.slice(0, 16),
    is_active: event.is_active,
    free_tokens_per_grant: event.free_tokens_per_grant,
    free_token_interval_days: event.free_token_interval_days,
    theme: (event as unknown as Record<string, unknown>).theme as string ?? "classic",
  });

  const THEMES = [
    { value: "classic", label: "Classic (màu trắng)" },
    { value: "ga2", label: "Mega Arcade (đèn neon + hốc kính hồng)" },
  ] as const;
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const res = await fetch(`/api/gacha/events/${event.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        start_at: new Date(form.start_at).toISOString(),
        end_at: new Date(form.end_at).toISOString(),
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      onUpdate(updated);
      setEditing(false);
    }
    setSaving(false);
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "rewards", label: "Rewards" },
    { key: "missions", label: "Missions" },
    { key: "history", label: "History" },
    { key: "blacklist", label: "Blacklist" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 transition-colors hover:bg-slate-200  "
        >
          <ArrowLeft className="text-body h-5 w-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-4">
            <span className="text-heading text-2xl font-bold">
              {event.name}
            </span>
            {!editing && <Countdown endAt={event.end_at} />}
          </div>
          <p className="text-muted text-sm">Event management</p>
        </div>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="text-body inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium transition-colors hover:bg-slate-200  "
          >
            <Pencil className="h-4 w-4" />
            Edit Event
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => setEditing(false)}
              className="text-body inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium transition-colors hover:bg-slate-200  "
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1 rounded-lg bg-purple-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        )}
      </div>

      {/* Event info / edit form */}
      {editing ? (
        <div className="card-bg card-shadow space-y-4 rounded-lg p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="text-body mb-1 block text-sm font-medium">
                Name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input-base w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-body mb-1 block text-sm font-medium">
                Active
              </label>
              <select
                value={form.is_active ? "true" : "false"}
                onChange={(e) =>
                  setForm({ ...form, is_active: e.target.value === "true" })
                }
                className="input-base w-full rounded-lg border px-3 py-2 text-sm"
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
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
              <label className="text-body mb-1 block text-sm font-medium">
                Start At
              </label>
              <input
                type="datetime-local"
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
                value={form.end_at}
                onChange={(e) => setForm({ ...form, end_at: e.target.value })}
                className="input-base w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>

            <NumberInput
              value={form.free_tokens_per_grant}
              onChange={(v) => setForm({ ...form, free_tokens_per_grant: v })}
              className="w-full"
              label="Free Tokens per Grant"
            />

            <NumberInput
              value={form.free_token_interval_days}
              onChange={(v) =>
                setForm({ ...form, free_token_interval_days: v })
              }
              className="w-full"
              label="Free Token Interval (days)"
            />
          </div>
          <div>
            <RichTextEditor
              value={form.description}
              onChange={(html) => setForm({ ...form, description: html })}
              label="Description"
              rows={3}
            />
          </div>
        </div>
      ) : (
        <div className="card-bg card-shadow rounded-lg p-6">
          <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
            <div>
              <p className="text-muted">Status</p>
              <p className="font-semibold">
                {event.is_active ? (
                  <span className="text-green-600">Active</span>
                ) : (
                  <span className="text-red-600">Inactive</span>
                )}
              </p>
            </div>
            <div>
              <p className="text-muted">Start</p>
              <p className="text-heading font-semibold">
                {new Date(event.start_at).toLocaleString("vi-VN")}
              </p>
            </div>
            <div>
              <p className="text-muted">End</p>
              <p className="text-heading font-semibold">
                {new Date(event.end_at).toLocaleString("vi-VN")}
              </p>
            </div>
            <div>
              <p className="text-muted">Free Tokens</p>
              <p className="text-heading font-semibold">
                {event.free_tokens_per_grant} / {event.free_token_interval_days}{" "}
                days
              </p>
            </div>

            <div>
              <p className="text-muted">Theme</p>
              <p className="text-heading font-semibold">
                {THEMES.find((t) => t.value === (event as unknown as Record<string, unknown>).theme)?.label ??
                  "Classic"}
              </p>
            </div>
          </div>
          {event.description && (
            <p className="text-muted mt-3 text-sm">{event.description}</p>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="table-border border-b">
        <nav className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`border-b-2 pb-3 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "border-purple-600 text-purple-600"
                  : "text-muted hover:text-heading border-transparent"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === "rewards" && <RewardsManager eventId={event.id} />}
      {activeTab === "missions" && <MissionsManager eventId={event.id} />}
      {activeTab === "history" && <RewardHistoryManager eventId={event.id} />}
      {activeTab === "blacklist" && <BlockedUsersManager eventId={event.id} />}
    </div>
  );
}

function Countdown({ endAt }: { endAt: string }) {
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const end = new Date(endAt);
  const diff = Math.max(0, end.getTime() - now.getTime());

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  if (diff === 0)
    return <p className="mt-1 text-sm text-red-600">Event ended</p>;

  return (
    <p className="mt-1 text-sm text-red-600">
      Ends in: {days}d {hours}h {minutes}m {seconds}s
    </p>
  );
}
