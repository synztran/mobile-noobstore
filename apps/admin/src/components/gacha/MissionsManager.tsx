"use client";

import {
  ChevronUp,
  ListChecks,
  Pencil,
  Plus,
  Save,
  Trash2,
  Users,
  X,
} from "lucide-react";
import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchMissions,
  fetchMissionProgress,
} from "@/lib/react-query/gacha/queries";
import { adminQueryKeys } from "@/lib/react-query/root";
import NumberInput from "@/components/ui/NumberInput";

interface Mission {
  id: string;
  event_id: string;
  name: string;
  description: string | null;
  mission_type: string;
  requirement: Record<string, unknown>;
  token_reward: number;
  show_trigger: boolean;
  is_active: boolean;
  created_at: string;
}

interface UserProgress {
  id: number;
  user_id: string;
  mission_id: number;
  progress: Record<string, unknown>;
  completed_at: string | null;
  user: { email: string; full_name: string | null } | null;
}

interface Props {
  eventId: string;
}

const MISSION_TYPES = [
  { value: "login_count", label: "First Time Login" },
  { value: "spend_amount", label: "Spend Amount" },
  { value: "order_count", label: "Complete Orders (Count)" },
  { value: "play_count", label: "Play Gacha (Count)" },
];

const ORDER_STATUSES = [
  { value: "", label: "Any status (placed = counts immediately)" },
  { value: "confirmed", label: "Confirmed" },
  { value: "delivering", label: "Delivering" },
  { value: "delivered", label: "Delivered" },
];

export function MissionsManager({ eventId }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: missions = [], isLoading: loading } = useQuery<
    Mission[],
    Error
  >({
    queryKey: adminQueryKeys.gacha.missions(eventId),
    queryFn: () => fetchMissions(eventId),
    enabled: !!eventId,
  });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<{
    name: string;
    description: string;
    mission_type: string;
    token_reward: number | null;
    req_min_price: number | null;
    req_count: number | null;
    req_order_status: string;
    show_trigger: boolean;
    is_active: boolean;
  }>({
    name: "",
    description: "",
    mission_type: "login_count",
    token_reward: 1,
    req_min_price: null,
    req_count: null,
    req_order_status: "",
    show_trigger: true,
    is_active: true,
  });
  const [expandedMission, setExpandedMission] = useState<string | null>(null);

  function toggleProgress(missionId: string) {
    if (expandedMission === missionId) {
      setExpandedMission(null);
    } else {
      setExpandedMission(missionId);
    }
  }

  // missions loaded via react-query

  function resetForm() {
    setForm({
      name: "",
      description: "",
      mission_type: "login_count",
      token_reward: 1,
      req_min_price: null,
      req_count: null,
      req_order_status: "",
      show_trigger: true,
      is_active: true,
    });
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(mission: Mission) {
    const req = mission.requirement as Record<string, unknown>;
    setForm({
      name: mission.name,
      description: mission.description ?? "",
      mission_type: mission.mission_type,
      token_reward: mission.token_reward,
      req_min_price: (req.min_price as number) ?? null,
      req_count: (req.count as number) ?? null,
      req_order_status: (req.order_status as string) ?? "",
      show_trigger: mission.show_trigger,
      is_active: mission.is_active,
    });
    setEditingId(mission.id);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    let requirement: Record<string, unknown> = {};
    if (
      form.mission_type === "order_min_price" ||
      form.mission_type === "spend_amount"
    ) {
      if (form.req_min_price != null) requirement.amount = form.req_min_price;
      if (form.req_order_status)
        requirement.order_status = form.req_order_status;
    } else if (form.mission_type === "order_count" || form.mission_type === "play_count") {
      if (form.req_count != null) requirement.count = form.req_count;
      if (form.req_order_status)
        requirement.order_status = form.req_order_status;
    }

    const payload = {
      name: form.name,
      description: form.description || null,
      mission_type: form.mission_type,
      token_reward: form.token_reward,
      requirement,
      show_trigger: form.show_trigger,
      is_active: form.is_active,
    };

    if (editingId) {
      await fetch(`/api/gacha/events/${eventId}/missions/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch(`/api/gacha/events/${eventId}/missions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    resetForm();
    queryClient.invalidateQueries({
      queryKey: adminQueryKeys.gacha.missions(eventId),
    });
  }

  async function handleDelete(missionId: string) {
    if (!confirm("Delete this mission?")) return;
    await fetch(`/api/gacha/events/${eventId}/missions/${missionId}`, {
      method: "DELETE",
    });
    queryClient.invalidateQueries({
      queryKey: adminQueryKeys.gacha.missions(eventId),
    });
  }

  return (
    <div className="space-y-4">
      {/* Add button */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700"
        >
          <Plus className="h-4 w-4" />
          Add Mission
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
              {editingId ? "Edit Mission" : "New Mission"}
            </h3>
            <button
              type="button"
              onClick={resetForm}
              className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <X className="text-muted h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
                placeholder="Login daily"
              />
            </div>
            <div>
              <label className="text-body mb-1 block text-sm font-medium">
                Type
              </label>
              <select
                value={form.mission_type}
                onChange={(e) =>
                  setForm({ ...form, mission_type: e.target.value })
                }
                className="input-base min-h-[38px] w-full rounded-lg border px-3 py-2 text-sm"
              >
                {MISSION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <NumberInput
              value={form.token_reward}
              onChange={(v) => setForm({ ...form, token_reward: v })}
              min={1}
              required
              step={1}
              className="w-full"
              label="Token Reward"
            />
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <label className="flex cursor-pointer select-none items-center gap-2">
              <input
                type="checkbox"
                className="toggle-purple toggle toggle-sm"
                checked={form.show_trigger}
                onChange={(e) =>
                  setForm({ ...form, show_trigger: e.target.checked })
                }
              />
              <span className="text-body text-sm font-medium">
                Show trigger to users
              </span>
              <span className="text-muted text-xs">
                {form.show_trigger ? "Visible" : "Hidden"}
              </span>
            </label>
            <label className="flex cursor-pointer select-none items-center gap-2">
              <input
                type="checkbox"
                className="toggle toggle-success toggle-sm"
                checked={form.is_active}
                onChange={(e) =>
                  setForm({ ...form, is_active: e.target.checked })
                }
              />
              <span className="text-body text-sm font-medium">Active</span>
              <span className="text-muted text-xs">
                {form.is_active ? "Mission is active" : "Mission is inactive"}
              </span>
            </label>
          </div>
          {/* Contextual requirement fields */}
          {(form.mission_type === "order_min_price" ||
            form.mission_type === "spend_amount") && (
            <div>
              <NumberInput
                value={form.req_min_price}
                onChange={(v) => setForm({ ...form, req_min_price: v })}
                min={1000}
                required
                step={1000}
                className="w-full"
                label="Minimum Order Amount (VND)"
              />
              <p className="text-muted mt-1 text-xs">
                Mission completes when the customer places an order of at least
                this amount.
              </p>
            </div>
          )}
          {(form.mission_type === "order_count" || form.mission_type === "play_count") && (
            <div>
              <NumberInput
                value={form.req_count}
                onChange={(v) => setForm({ ...form, req_count: v })}
                min={1}
                required
                step={1}
                className="w-full"
                label={form.mission_type === "play_count" ? "Number of Gacha Plays Required" : "Number of Orders Required"}
              />
              <p className="text-muted mt-1 text-xs">
                {form.mission_type === "play_count"
                  ? "Mission completes when the customer has played gacha this many times."
                  : "Mission completes when the customer has placed this many orders total."}
              </p>
            </div>
          )}
          {(form.mission_type === "order_count" ||
            form.mission_type === "spend_amount") && (
            <div>
              <label className="text-body mb-1 block text-sm font-medium">
                Required Order Status
              </label>
              <select
                value={form.req_order_status}
                onChange={(e) =>
                  setForm({ ...form, req_order_status: e.target.value })
                }
                className="input-base min-h-[38px] w-full rounded-lg border px-3 py-2 text-sm"
              >
                {ORDER_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              <p className="text-muted mt-1 text-xs">
                Only count orders that have reached this status. Leave empty to
                count immediately on placement.
              </p>
            </div>
          )}
          {(form.mission_type === "first_login" ||
            form.mission_type === "login_count") && (
            <p className="text-muted rounded-lg bg-slate-50 px-3 py-2 text-xs dark:bg-slate-800/50">
              No requirement config needed — this mission completes
              automatically on the customer&apos;s first login.
            </p>
          )}
          <div className="col-span-full">
            <label className="text-body mb-1 block text-sm font-medium">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              className="input-base w-full rounded-lg border px-3 py-2 text-sm"
              rows={2}
              placeholder="Describe what the user needs to do..."
            />
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

      {/* Missions table */}
      {loading ? (
        <div className="card-bg card-shadow animate-pulse rounded-lg p-6">
          <div className="h-4 w-48 rounded bg-slate-200 dark:bg-slate-700" />
        </div>
      ) : missions.length === 0 ? (
        <div className="card-bg card-shadow rounded-lg p-8 text-center">
          <ListChecks className="mx-auto mb-2 h-10 w-10 text-slate-300 dark:text-slate-600" />
          <p className="text-muted text-sm">No missions configured</p>
        </div>
      ) : (
        <div className="card-bg card-shadow overflow-hidden rounded-lg">
          <table className="w-full">
            <thead className="thead-bg table-border border-b">
              <tr>
                <th className="text-heading px-6 py-3 text-left text-sm font-semibold">
                  Name
                </th>
                <th className="text-heading px-6 py-3 text-left text-sm font-semibold">
                  Type
                </th>
                <th className="text-heading px-6 py-3 text-center text-sm font-semibold">
                  Token Reward
                </th>
                <th className="text-heading px-6 py-3 text-left text-sm font-semibold">
                  Requirement
                </th>
                <th className="text-heading px-6 py-3 text-center text-sm font-semibold">
                  Show Trigger
                </th>
                <th className="text-heading px-6 py-3 text-center text-sm font-semibold">
                  {" "}
                  Status
                </th>
                <th className="text-heading px-6 py-3 text-center text-sm font-semibold">
                  {" "}
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="table-divide">
              {missions.map((mission) => (
                <React.Fragment key={mission.id}>
                  <tr className="table-row-hover">
                    <td className="text-heading px-6 py-4 text-sm font-medium">
                      {mission.name}
                    </td>
                    <td className="text-body px-6 py-4 text-sm">
                      <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                        {mission.mission_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-sm font-bold text-purple-600">
                      +{mission.token_reward}
                    </td>
                    <td className="text-muted max-w-[200px] truncate px-6 py-4 font-mono text-xs">
                      {JSON.stringify(mission.requirement)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          mission.show_trigger
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                            : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                        }`}
                      >
                        {mission.show_trigger ? "Visible" : "Hidden"}
                      </span>
                    </td>{" "}
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          mission.is_active
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                            : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                        }`}
                      >
                        {mission.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>{" "}
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => toggleProgress(mission.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-50 text-purple-600 transition-colors hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-400 dark:hover:bg-purple-900/40"
                          title="View progress"
                        >
                          {expandedMission === mission.id ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <Users className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => startEdit(mission)}
                          className="btn-icon-edit flex h-8 w-8 items-center justify-center rounded-full transition-colors"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(mission.id)}
                          className="btn-icon-delete flex h-8 w-8 items-center justify-center rounded-full transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedMission === mission.id && (
                    <tr key={`${mission.id}-progress`}>
                      <td
                        colSpan={7}
                        className="bg-slate-50 px-6 py-4 dark:bg-slate-800/50"
                      >
                        <MissionProgressPanel
                          eventId={eventId}
                          missionId={mission.id}
                        />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Sub-component: User progress panel ──────────────────────────────────────
function MissionProgressPanel({
  eventId,
  missionId,
}: {
  eventId: string;
  missionId: string;
}) {
  const { data: progress = [], isLoading: loading } = useQuery<
    UserProgress[],
    Error
  >({
    queryKey: adminQueryKeys.gacha.missionProgress(eventId, missionId),
    queryFn: () => fetchMissionProgress(eventId, missionId),
    enabled: !!eventId && !!missionId,
  });

  if (loading) {
    return (
      <div className="animate-pulse space-y-2">
        <div className="h-4 w-32 rounded bg-slate-200 dark:bg-slate-700" />
        <div className="h-4 w-48 rounded bg-slate-200 dark:bg-slate-700" />
      </div>
    );
  }

  if (!progress || progress.length === 0) {
    return (
      <div className="text-muted flex items-center gap-2 text-sm">
        <Users className="h-4 w-4" />
        No users have started this mission yet.
      </div>
    );
  }

  const completed = progress.filter((p) => p.completed_at !== null).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 text-xs">
        <span className="text-heading font-medium">
          {progress.length} user{progress.length !== 1 ? "s" : ""}
        </span>
        <span className="font-semibold text-green-600">
          {completed} completed
        </span>
        <span className="text-muted">
          {progress.length - completed} in progress
        </span>
      </div>
      <div className="table-border overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="thead-bg">
            <tr>
              <th className="text-heading px-4 py-2 text-left font-medium">
                User
              </th>
              <th className="text-heading px-4 py-2 text-left font-medium">
                Progress
              </th>
              <th className="text-heading px-4 py-2 text-center font-medium">
                Status
              </th>
              <th className="text-heading px-4 py-2 text-left font-medium">
                Completed At
              </th>
            </tr>
          </thead>
          <tbody className="table-divide">
            {progress.map((p: UserProgress) => (
              <tr key={p.id} className="table-row-hover">
                <td className="px-4 py-2">
                  <div>
                    <p className="text-heading font-medium">
                      {p.user?.email ?? p.user_id.slice(0, 8)}
                    </p>
                    {p.user?.full_name && (
                      <p className="text-muted text-xs">{p.user.full_name}</p>
                    )}
                  </div>
                </td>
                <td className="text-muted max-w-[200px] truncate px-4 py-2 font-mono text-xs">
                  {JSON.stringify(p.progress)}
                </td>
                <td className="px-4 py-2 text-center">
                  {p.completed_at ? (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-300">
                      Completed
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                      In Progress
                    </span>
                  )}
                </td>
                <td className="text-muted px-4 py-2 text-xs">
                  {p.completed_at
                    ? new Date(p.completed_at).toLocaleString("vi-VN")
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
