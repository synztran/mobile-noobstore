"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Coins,
  Gift,
  Loader2,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import NumberInput from "@/components/ui/NumberInput";

// ─── Types ────────────────────────────────────────────────────

interface PointTransaction {
  id: number;
  user_id: string;
  delta: number;
  balance_after: number;
  source_type: string;
  source_ref: string | null;
  note: string | null;
  created_at: string;
  profiles: {
    email: string;
    full_name: string | null;
    points_balance: number;
  } | null;
}

interface PointRule {
  id: number;
  rule_type: string;
  rate_type: "percentage_of_amount" | "fixed_per_action";
  rate_value: number;
  is_active: boolean;
  description: string | null;
  updated_at: string;
}

interface GiftCard {
  id: number;
  code: string;
  points_value: number;
  batch_label: string | null;
  note: string | null;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  redeemed_at: string | null;
  redeemed_by_user_id: string | null;
  redeemed_by_profile: { email: string; full_name: string | null } | null;
}

// ─── Helpers ──────────────────────────────────────────────────

const SOURCE_TYPE_LABELS: Record<string, string> = {
  order_delivered: "Order Delivered",
  service_completed: "Service Completed",
  gacha_reward: "Gacha Reward",
  gacha_event: "Gacha Event",
  social_event: "Social Event",
  gift_card: "Gift Card",
  admin_adjustment: "Admin Adjustment",
  voucher_exchange: "Voucher Exchange",
  product_exchange: "Product Exchange",
  referral: "Referral",
};

const SOURCE_COLORS: Record<string, string> = {
  order_delivered:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  service_completed:
    "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
  gacha_reward:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  gacha_event:
    "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
  social_event:
    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  gift_card:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  admin_adjustment:
    "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
  voucher_exchange:
    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  product_exchange:
    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

function fmt(n: number) {
  return n.toLocaleString("vi-VN");
}

// ─── Tab: Transactions ────────────────────────────────────────

function TransactionsTab() {
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const PAGE_SIZE = 30;

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams({ page: String(page) });
    if (search) p.set("search", search);
    if (sourceFilter) p.set("source_type", sourceFilter);
    const res = await fetch(`/api/points/transactions?${p}`);
    const data = await res.json();
    setTransactions(data.transactions ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [page, search, sourceFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="text-muted absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setSearch(searchInput);
                setPage(1);
              }
            }}
            placeholder="Search email or note…"
            className="input-base w-full rounded-lg border py-2 pl-9 pr-3 text-sm"
          />
        </div>
        <select
          value={sourceFilter}
          onChange={(e) => {
            setSourceFilter(e.target.value);
            setPage(1);
          }}
          className="input-base rounded-lg border px-3 py-2 text-sm"
        >
          <option value="">All activity types</option>
          {Object.entries(SOURCE_TYPE_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        {(search || sourceFilter) && (
          <button
            onClick={() => {
              setSearch("");
              setSearchInput("");
              setSourceFilter("");
              setPage(1);
            }}
            className="text-muted inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <X className="h-3.5 w-3.5" /> Clear
          </button>
        )}
      </div>

      {/* Stats bar */}
      <p className="text-muted text-xs">{fmt(total)} transactions total</p>

      {/* Table */}
      <div className="card-bg card-shadow overflow-hidden rounded-lg">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead className="thead-bg table-border border-b">
              <tr>
                <th className="text-heading px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                  User
                </th>
                <th className="text-heading px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                  Type
                </th>
                <th className="text-heading px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide">
                  Delta
                </th>
                <th className="text-heading px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide">
                  Balance After
                </th>
                <th className="text-heading px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                  Note / Ref
                </th>
                <th className="text-heading px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="table-divide">
              {loading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-5 py-3">
                          <div className="h-4 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                        </td>
                      ))}
                    </tr>
                  ))
                : transactions.map((tx) => (
                    <tr key={tx.id} className="table-row-hover">
                      <td className="px-5 py-3">
                        <div className="text-heading text-sm font-medium leading-tight">
                          {tx.profiles?.full_name ?? "—"}
                        </div>
                        <div className="text-muted text-xs">
                          {tx.profiles?.email}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${SOURCE_COLORS[tx.source_type] ?? "bg-slate-100 text-slate-600"}`}
                        >
                          {SOURCE_TYPE_LABELS[tx.source_type] ?? tx.source_type}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span
                          className={`inline-flex items-center gap-1 text-sm font-bold tabular-nums ${tx.delta > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                        >
                          {tx.delta > 0 ? (
                            <ArrowUpCircle className="h-3.5 w-3.5" />
                          ) : (
                            <ArrowDownCircle className="h-3.5 w-3.5" />
                          )}
                          {tx.delta > 0 ? "+" : ""}
                          {fmt(tx.delta)}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className="text-heading text-sm font-medium tabular-nums">
                          {fmt(tx.balance_after)}
                        </span>
                      </td>
                      <td className="max-w-[200px] px-5 py-3">
                        <p className="text-body truncate text-sm">
                          {tx.note ?? "—"}
                        </p>
                        {tx.source_ref && (
                          <p className="text-muted truncate font-mono text-xs">
                            {tx.source_ref}
                          </p>
                        )}
                      </td>
                      <td className="text-muted whitespace-nowrap px-5 py-3 text-sm">
                        {new Date(tx.created_at).toLocaleString("vi-VN")}
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>

        {!loading && transactions.length === 0 && (
          <div className="py-16 text-center">
            <Coins className="mx-auto mb-2 h-10 w-10 text-slate-300 dark:text-slate-600" />
            <p className="text-muted text-sm">No transactions found</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-muted text-sm">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-700"
            >
              <ChevronLeft className="h-4 w-4" /> Prev
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-700"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Rules ───────────────────────────────────────────────

function RulesTab() {
  const [rules, setRules] = useState<PointRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<PointRule | null>(null);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    rate_type: "percentage_of_amount" as PointRule["rate_type"],
    rate_value: 0,
    is_active: true,
    description: "",
  });

  async function load() {
    setLoading(true);
    const res = await fetch("/api/points/rules");
    const data = await res.json();
    setRules(data.rules ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function startEdit(rule: PointRule) {
    setEditing(rule);
    setEditForm({
      rate_type: rule.rate_type,
      rate_value: rule.rate_value,
      is_active: rule.is_active,
      description: rule.description ?? "",
    });
  }

  async function saveEdit() {
    if (!editing) return;
    setSaving(true);
    await fetch(`/api/points/rules/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    setSaving(false);
    setEditing(null);
    load();
  }

  return (
    <div className="space-y-4">
      <p className="text-muted text-sm">
        Configure how many points customers earn per activity. Changes apply to
        future transactions only.
      </p>

      {/* Edit modal */}
      {editing && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50"
          />
          <div className="card-bg card-shadow fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 space-y-4 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-heading font-bold">
                Edit Rule:{" "}
                {SOURCE_TYPE_LABELS[editing.rule_type] ?? editing.rule_type}
              </h3>
              <button
                onClick={() => setEditing(null)}
                className="rounded-full p-1 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <X className="text-muted h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-body mb-1 block text-sm font-medium">
                  Rate Type
                </label>
                <select
                  value={editForm.rate_type}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      rate_type: e.target.value as PointRule["rate_type"],
                    })
                  }
                  className="input-base w-full rounded-lg border px-3 py-2 text-sm"
                >
                  <option value="percentage_of_amount">
                    % of Amount (VND → pts)
                  </option>
                  <option value="fixed_per_action">Fixed per Action</option>
                </select>
              </div>
              <NumberInput
                value={editForm.rate_value}
                onChange={(v) =>
                  setEditForm({ ...editForm, rate_value: v ?? 0 })
                }
                min={0}
                step={editForm.rate_type === "percentage_of_amount" ? 0.01 : 1}
                className="w-full"
                label={
                  editForm.rate_type === "percentage_of_amount"
                    ? "Rate (%)  e.g. 0.1 = 0.1%"
                    : "Points per Action"
                }
              />
              <div>
                <label className="text-body mb-1 block text-sm font-medium">
                  Description
                </label>
                <input
                  type="text"
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm({ ...editForm, description: e.target.value })
                  }
                  className="input-base w-full rounded-lg border px-3 py-2 text-sm"
                />
              </div>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  className="toggle toggle-success toggle-sm"
                  checked={editForm.is_active}
                  onChange={(e) =>
                    setEditForm({ ...editForm, is_active: e.target.checked })
                  }
                />
                <span className="text-body text-sm font-medium">Active</span>
              </label>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setEditing(null)}
                className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-60"
              >
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Save
              </button>
            </div>
          </div>
        </>
      )}

      <div className="card-bg card-shadow overflow-hidden rounded-lg">
        <table className="w-full">
          <thead className="thead-bg table-border border-b">
            <tr>
              <th className="text-heading px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                Activity
              </th>
              <th className="text-heading px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                Rate Type
              </th>
              <th className="text-heading px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide">
                Value
              </th>
              <th className="text-heading px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                Description
              </th>
              <th className="text-heading px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide">
                Status
              </th>
              <th className="text-heading px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="table-divide">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-5 py-3">
                        <div className="h-4 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                      </td>
                    ))}
                  </tr>
                ))
              : rules.map((rule) => (
                  <tr key={rule.id} className="table-row-hover">
                    <td className="px-5 py-3">
                      <span className="text-heading text-sm font-semibold">
                        {SOURCE_TYPE_LABELS[rule.rule_type] ?? rule.rule_type}
                      </span>
                      <p className="text-muted font-mono text-xs">
                        {rule.rule_type}
                      </p>
                    </td>
                    <td className="text-body px-5 py-3 text-sm">
                      {rule.rate_type === "percentage_of_amount"
                        ? "% of Amount"
                        : "Fixed per Action"}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="text-sm font-bold tabular-nums text-amber-600">
                        {rule.rate_type === "percentage_of_amount"
                          ? `${rule.rate_value}%`
                          : `${fmt(rule.rate_value)} pts`}
                      </span>
                    </td>
                    <td className="text-muted max-w-[200px] truncate px-5 py-3 text-sm">
                      {rule.description ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${rule.is_active ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400"}`}
                      >
                        {rule.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <button
                        onClick={() => startEdit(rule)}
                        className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                      >
                        <Pencil className="h-3 w-3" /> Edit
                      </button>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Tab: Gift Cards ──────────────────────────────────────────

function GiftCardsTab() {
  const [cards, setCards] = useState<GiftCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    points_value: 500 as number | null,
    quantity: 1 as number | null,
    batch_label: "",
    note: "",
    expires_at: "",
  });
  const [created, setCreated] = useState<
    { code: string; points_value: number }[]
  >([]);
  const PAGE_SIZE = 30;

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams({ page: String(page) });
    if (search) p.set("search", search);
    const res = await fetch(`/api/gift-cards?${p}`);
    const data = await res.json();
    setCards(data.giftCards ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [page, search]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    const res = await fetch("/api/gift-cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        points_value: createForm.points_value,
        quantity: createForm.quantity ?? 1,
        batch_label: createForm.batch_label || null,
        note: createForm.note || null,
        expires_at: createForm.expires_at || null,
      }),
    });
    const data = await res.json();
    setCreating(false);
    if (res.ok) {
      setCreated(data.giftCards ?? []);
      setCreateForm({
        points_value: 500,
        quantity: 1,
        batch_label: "",
        note: "",
        expires_at: "",
      });
      load();
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="text-muted absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setSearch(searchInput);
                setPage(1);
              }
            }}
            placeholder="Search by code…"
            className="input-base w-full rounded-lg border py-2 pl-9 pr-3 text-sm"
          />
        </div>
        <button
          onClick={() => {
            setShowCreate(true);
            setCreated([]);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600"
        >
          <Plus className="h-4 w-4" /> Create Gift Cards
        </button>
      </div>

      {/* Create modal */}
      {showCreate && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50"
          />
          <div className="card-bg card-shadow fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl p-6">
            {created.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <h3 className="text-heading font-bold">
                    {created.length} Gift Card{created.length > 1 ? "s" : ""}{" "}
                    Created
                  </h3>
                </div>
                <div className="max-h-64 space-y-1.5 overflow-y-auto rounded-lg border border-base-200 p-3">
                  {created.map((c) => (
                    <div
                      key={c.code}
                      className="flex items-center justify-between gap-3"
                    >
                      <code className="text-heading rounded bg-slate-100 px-2 py-0.5 font-mono text-sm dark:bg-slate-800">
                        {c.code}
                      </code>
                      <span className="text-xs font-semibold text-amber-600">
                        {fmt(c.points_value)} pts
                      </span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setShowCreate(false)}
                  className="w-full rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-heading flex items-center gap-2 font-bold">
                    <Gift className="h-5 w-5 text-amber-500" /> Create Gift
                    Cards
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowCreate(false)}
                    className="rounded-full p-1 hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    <X className="text-muted h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <NumberInput
                    value={createForm.points_value}
                    onChange={(v) =>
                      setCreateForm({ ...createForm, points_value: v })
                    }
                    min={0}
                    step={50}
                    required
                    className="w-full"
                    label="Point Value"
                  />
                  <NumberInput
                    value={createForm.quantity}
                    onChange={(v) =>
                      setCreateForm({ ...createForm, quantity: v })
                    }
                    min={0}
                    step={1}
                    required
                    className="w-full"
                    label="Quantity"
                  />
                </div>
                <div>
                  <label className="text-body mb-1 block text-sm font-medium">
                    Batch Label{" "}
                    <span className="text-muted font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={createForm.batch_label}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        batch_label: e.target.value,
                      })
                    }
                    placeholder="e.g. Corporate Q2 2026 – Acme Ltd"
                    className="input-base w-full rounded-lg border px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-body mb-1 block text-sm font-medium">
                    Note{" "}
                    <span className="text-muted font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={createForm.note}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, note: e.target.value })
                    }
                    className="input-base w-full rounded-lg border px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-body mb-1 block text-sm font-medium">
                    Expires At{" "}
                    <span className="text-muted font-normal">(optional)</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={createForm.expires_at}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        expires_at: e.target.value,
                      })
                    }
                    className="input-base w-full rounded-lg border px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowCreate(false)}
                    className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-60"
                  >
                    {creating && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    )}
                    Create
                  </button>
                </div>
              </form>
            )}
          </div>
        </>
      )}

      {/* Table */}
      <div className="card-bg card-shadow overflow-hidden rounded-lg">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead className="thead-bg table-border border-b">
              <tr>
                <th className="text-heading px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                  Code
                </th>
                <th className="text-heading px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide">
                  Points
                </th>
                <th className="text-heading px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                  Batch
                </th>
                <th className="text-heading px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                  Redeemed By
                </th>
                <th className="text-heading px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide">
                  Status
                </th>
                <th className="text-heading px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                  Expires
                </th>
                <th className="text-heading px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="table-divide">
              {loading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="px-5 py-3">
                          <div className="h-4 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                        </td>
                      ))}
                    </tr>
                  ))
                : cards.map((card) => {
                    const isRedeemed = !!card.redeemed_at;
                    const isExpired = card.expires_at
                      ? new Date(card.expires_at) < new Date()
                      : false;
                    return (
                      <tr key={card.id} className="table-row-hover">
                        <td className="px-5 py-3">
                          <code className="text-heading rounded bg-slate-100 px-2 py-0.5 font-mono text-sm dark:bg-slate-800">
                            {card.code}
                          </code>
                        </td>
                        <td className="px-5 py-3 text-right text-sm font-bold tabular-nums text-amber-600">
                          {fmt(card.points_value)}
                        </td>
                        <td className="text-muted px-5 py-3 text-sm">
                          {card.batch_label ?? "—"}
                        </td>
                        <td className="px-5 py-3 text-sm">
                          {isRedeemed ? (
                            <div>
                              <p className="text-body font-medium">
                                {card.redeemed_by_profile?.full_name ?? "—"}
                              </p>
                              <p className="text-muted text-xs">
                                {card.redeemed_by_profile?.email}
                              </p>
                              <p className="text-muted text-xs">
                                {new Date(card.redeemed_at!).toLocaleString(
                                  "vi-VN"
                                )}
                              </p>
                            </div>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-center">
                          {isRedeemed ? (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                              Used
                            </span>
                          ) : isExpired ? (
                            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600 dark:bg-red-900/30 dark:text-red-400">
                              Expired
                            </span>
                          ) : card.is_active ? (
                            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-300">
                              Active
                            </span>
                          ) : (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500 dark:bg-slate-700">
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="text-muted px-5 py-3 text-sm">
                          {card.expires_at
                            ? new Date(card.expires_at).toLocaleDateString(
                                "vi-VN"
                              )
                            : "—"}
                        </td>
                        <td className="text-muted whitespace-nowrap px-5 py-3 text-sm">
                          {new Date(card.created_at).toLocaleString("vi-VN")}
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>

        {!loading && cards.length === 0 && (
          <div className="py-16 text-center">
            <Gift className="mx-auto mb-2 h-10 w-10 text-slate-300 dark:text-slate-600" />
            <p className="text-muted text-sm">No gift cards yet</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-muted text-sm">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-700"
            >
              <ChevronLeft className="h-4 w-4" /> Prev
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-700"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────

type TabId = "transactions" | "rules" | "gift-cards";

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "transactions", label: "Transactions", icon: Coins },
  { id: "rules", label: "Earning Rules", icon: SlidersHorizontal },
  { id: "gift-cards", label: "Gift Cards", icon: Gift },
];

export default function PointsPage() {
  const [tab, setTab] = useState<TabId>("transactions");

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <Coins className="h-7 w-7 text-amber-500" />
        <div>
          <h1 className="text-heading text-2xl font-bold">
            Store Points (NSP)
          </h1>
          <p className="text-muted text-sm">
            Manage customer point balances, earning rules, and gift cards
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === id
                ? "border-amber-500 text-amber-600 dark:text-amber-400"
                : "text-muted hover:text-body border-transparent"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "transactions" && <TransactionsTab />}
      {tab === "rules" && <RulesTab />}
      {tab === "gift-cards" && <GiftCardsTab />}
    </div>
  );
}
