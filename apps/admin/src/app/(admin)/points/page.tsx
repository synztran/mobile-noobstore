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
  Palette,
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
  theme_id: string | null;
  is_scratched: boolean;
  expires_at: string | null;
  created_at: string;
  redeemed_at: string | null;
  redeemed_by_user_id: string | null;
  redeemed_by_profile: { email: string; full_name: string | null } | null;
  issued_to_user_id: string | null;
  issued_to_profile: { email: string; full_name: string | null } | null;
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
    "bg-blue-100 text-blue-700  ",
  service_completed:
    "bg-cyan-100 text-cyan-700  ",
  gacha_reward:
    "bg-purple-100 text-purple-700  ",
  gacha_event:
    "bg-pink-100 text-pink-700  ",
  social_event:
    "bg-orange-100 text-orange-700  ",
  gift_card:
    "bg-amber-100 text-amber-700  ",
  admin_adjustment:
    "bg-slate-100 text-slate-700  ",
  voucher_exchange:
    "bg-red-100 text-red-700  ",
  product_exchange:
    "bg-red-100 text-red-700  ",
};

function fmt(n: number) {
  return n.toLocaleString("vi-VN");
}

const GIFT_CARD_THEMES = {
  amber: "linear-gradient(135deg, #f59e0b, #b91c1c)",
  emerald: "linear-gradient(135deg, #10b981, #065f46)",
  indigo: "linear-gradient(135deg, #6366f1, #312e81)",
  rose: "linear-gradient(135deg, #ec4899, #831843)",
  sky: "linear-gradient(135deg, #0ea5e9, #075985)",
} as const;

function giftCardPreviewTheme(themeId: string, code: string) {
  const themes = Object.keys(GIFT_CARD_THEMES) as (keyof typeof GIFT_CARD_THEMES)[];
  let hash = 0;
  for (let i = 0; i < code.length; i++) hash = (hash * 31 + code.charCodeAt(i)) >>> 0;
  return GIFT_CARD_THEMES[(themeId in GIFT_CARD_THEMES ? themeId : themes[hash % themes.length]) as keyof typeof GIFT_CARD_THEMES];
}

function GiftCardPreview({ points, themeId, code, batchLabel, note }: {
  points: number | null;
  themeId: string;
  code: string;
  batchLabel: string;
  note: string;
}) {
  return (
    <div className="space-y-2" aria-label="Gift card preview">
      <p className="text-muted text-xs font-semibold uppercase tracking-wide">Preview</p>
      <div className="relative aspect-[1.586/1] overflow-hidden rounded-2xl p-5 text-white shadow-lg" style={{ background: giftCardPreviewTheme(themeId, code) }}>
        <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/20 blur-3xl" />
        <div className="relative flex h-full flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-black uppercase tracking-[0.2em] text-white/90"><span>NoobStore · Gift Card</span><span>Gift</span></div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/75">Giá trị quy đổi</p>
            <p className="mt-1 text-3xl font-black tabular-nums">{fmt(points ?? 0)} <span className="text-sm">điểm</span></p>
            <p className="mt-2 truncate text-xs font-semibold text-white/85">{batchLabel || note || "Thẻ quà tặng"}</p>
          </div>
        </div>
      </div>
    </div>
  );
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
            className="text-muted inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm hover:bg-slate-100 "
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
                          <div className="h-4 animate-pulse rounded bg-slate-200 " />
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
                          className={`inline-flex items-center gap-1 text-sm font-bold tabular-nums ${tx.delta > 0 ? "text-green-600 " : "text-red-600 "}`}
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
            <Coins className="mx-auto mb-2 h-10 w-10 text-slate-300 " />
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
              className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm hover:bg-slate-100 disabled:opacity-40 "
            >
              <ChevronLeft className="h-4 w-4" /> Prev
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm hover:bg-slate-100 disabled:opacity-40 "
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
                className="rounded-full p-1 hover:bg-slate-100 "
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
                className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium hover:bg-slate-200  "
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
                        <div className="h-4 animate-pulse rounded bg-slate-200 " />
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
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${rule.is_active ? "bg-green-100 text-green-700  " : "bg-slate-100 text-slate-500  "}`}
                      >
                        {rule.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <button
                        onClick={() => startEdit(rule)}
                        className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200   "
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

interface CustomerOption {
  id: string;
  email: string;
  full_name: string | null;
}

/**
 * Search the users table and pick a fixed recipient for a gift card.
 * Selection is bound to issued_to_user_id on the card.
 */
function CustomerSearchPicker({
  value,
  onChange,
  disabled,
}: {
  value: string | null;
  onChange: (id: string | null) => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [, setLoading] = useState(false);
  const [results, setResults] = useState<CustomerOption[]>([]);
  const [open, setOpen] = useState(false);

  // Debounced search against /api/users?search=…
  useEffect(() => {
    if (disabled) return;
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/users?search=${encodeURIComponent(query.trim())}&limit=8`
        );
        const data = await res.json();
        if (cancelled) return;
        setResults(Array.isArray(data) ? data : []);
        setOpen(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, disabled]);

  return (
    <div>
      <label className="text-body mb-1 block text-sm font-medium">
        Giới hạn cho khách hàng{" "}
        <span className="text-muted font-normal">(optional)</span>
      </label>
      {value ? (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2  ">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-amber-700 ">
              {results.find((r) => r.id === value)?.full_name ??
                results.find((r) => r.id === value)?.email ??
                ""}
            </p>
            <p className="truncate text-xs text-amber-600/70 ">
              {results.find((r) => r.id === value)?.email ?? value}
            </p>
          </div>
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              onChange(null);
              setResults([]);
              setQuery("");
              setOpen(false);
            }}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-200/60 text-amber-700 transition-colors hover:bg-amber-300 disabled:opacity-40  "
            title="Bỏ giới hạn"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="text-muted absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            disabled={disabled}
            placeholder="Tìm theo email khách hàng…"
            className="input-base w-full rounded-lg border py-2 pl-9 pr-3 text-sm disabled:opacity-50"
          />
          {open && results.length > 0 && (
            <div className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border table-border bg-surface-card card-shadow ">
              {results.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    onChange(r.id);
                    setQuery("");
                    setOpen(false);
                  }}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-amber-50 "
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-heading">
                      {r.full_name ?? "—"}
                    </span>
                    <span className="text-muted block truncate text-xs">
                      {r.email}
                    </span>
                  </span>
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-amber-500" />
                </button>
              ))}
            </div>
          )}
          {disabled && (
            <p className="text-muted mt-1 text-xs">
              Chỉ áp dụng khi tạo 1 thẻ (quantity = 1).
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function GiftCardsTab() {
  const [cards, setCards] = useState<GiftCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<GiftCard | null>(null);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({ points_value: 0, batch_label: "", note: "", expires_at: "", issued_to_user_id: null as string | null, is_active: true, theme_id: "" });
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    points_value: 500 as number | null,
    quantity: 1 as number | null,
    batch_label: "",
    note: "",
    expires_at: "",
    issued_to_user_id: null as string | null,
    theme_id: "",
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
        issued_to_user_id:
          (createForm.quantity ?? 1) === 1 ? createForm.issued_to_user_id : null,
        theme_id: createForm.theme_id || null,
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
        issued_to_user_id: null,
        theme_id: "",
      });
      load();
    }
  }

  function startEdit(card: GiftCard) {
    setEditing(card);
    setEditForm({
      points_value: card.points_value,
      batch_label: card.batch_label ?? "",
      note: card.note ?? "",
      expires_at: card.expires_at ? new Date(card.expires_at).toISOString().slice(0, 16) : "",
      issued_to_user_id: card.issued_to_user_id,
      is_active: card.is_active,
      theme_id: card.theme_id ?? "",
    });
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    const res = await fetch("/api/gift-cards", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editing.id, ...editForm, expires_at: editForm.expires_at || null, theme_id: editForm.theme_id || null }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      alert(data.error ?? "Could not update gift card");
      return;
    }
    setEditing(null);
    await load();
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
          <div className="card-bg card-shadow fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-full max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl p-6">
            {created.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <h3 className="text-heading font-bold">
                    {created.length} Gift Card{created.length > 1 ? "s" : ""}{" "}
                    Created
                  </h3>
                </div>
                <div className="max-h-64 space-y-1.5 overflow-y-auto rounded-lg border table-border p-3">
                  {created.map((c) => (
                    <div
                      key={c.code}
                      className="flex items-center justify-between gap-3"
                    >
                      <code className="text-heading rounded bg-slate-100 px-2 py-0.5 font-mono text-sm ">
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
                  className="w-full rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium hover:bg-slate-200  "
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreate} className="space-y-4">
                <GiftCardPreview points={createForm.points_value} themeId={createForm.theme_id} code="PREVIEW-CODE-2026" batchLabel={createForm.batch_label} note={createForm.note} />
                <div className="flex items-center justify-between">
                  <h3 className="text-heading flex items-center gap-2 font-bold">
                    <Gift className="h-5 w-5 text-amber-500" /> Create Gift
                    Cards
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowCreate(false)}
                    className="rounded-full p-1 hover:bg-slate-100 "
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
                    min={1_000}
                    max={5_000_000}
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
                <CustomerSearchPicker
                  value={createForm.issued_to_user_id}
                  onChange={(id) =>
                    setCreateForm({ ...createForm, issued_to_user_id: id })
                  }
                  disabled={(createForm.quantity ?? 1) > 1}
                />
                <label className="block text-sm font-medium">Card Background<select value={createForm.theme_id} onChange={(e) => setCreateForm({ ...createForm, theme_id: e.target.value })} className="input-base mt-1 w-full rounded-lg border px-3 py-2"><option value="">Auto (based on code)</option><option value="amber">Amber</option><option value="emerald">Emerald</option><option value="indigo">Indigo</option><option value="rose">Rose</option><option value="sky">Sky</option></select></label>
                <p className="text-muted -mt-1 text-xs">
                  Để trống Issued To = thẻ không thể được nạp bởi bất kỳ ai.
                </p>
                <div className="flex justify-end gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowCreate(false)}
                    className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium hover:bg-slate-200  "
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

      {editing && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50" />
          <form onSubmit={handleEdit} className="card-bg card-shadow fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-full max-w-md -translate-x-1/2 -translate-y-1/2 space-y-4 overflow-y-auto rounded-xl p-6">
            <GiftCardPreview points={editForm.points_value} themeId={editForm.theme_id} code={editing.code} batchLabel={editForm.batch_label} note={editForm.note} />
            <div className="flex items-center justify-between">
              <h3 className="text-heading font-bold">Edit Gift Card <code className="font-mono text-sm">{editing.code}</code></h3>
              <button type="button" onClick={() => setEditing(null)} aria-label="Close edit form"><X className="h-4 w-4" /></button>
            </div>
            <NumberInput value={editForm.points_value} onChange={(v) => setEditForm({ ...editForm, points_value: v ?? 0 })} min={1_000} max={5_000_000} step={50} required className="w-full" label="Point Value" />
            <label className="block text-sm font-medium">Batch Label<input value={editForm.batch_label} onChange={(e) => setEditForm({ ...editForm, batch_label: e.target.value })} className="input-base mt-1 w-full rounded-lg border px-3 py-2" /></label>
            <label className="block text-sm font-medium">Note<input value={editForm.note} onChange={(e) => setEditForm({ ...editForm, note: e.target.value })} className="input-base mt-1 w-full rounded-lg border px-3 py-2" /></label>
            <label className="block text-sm font-medium">Expires At<input type="datetime-local" value={editForm.expires_at} onChange={(e) => setEditForm({ ...editForm, expires_at: e.target.value })} className="input-base mt-1 w-full rounded-lg border px-3 py-2" /></label>
            <CustomerSearchPicker value={editForm.issued_to_user_id} onChange={(id) => setEditForm({ ...editForm, issued_to_user_id: id })} />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editForm.is_active} onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })} /> Active</label>
            <label className="block text-sm font-medium"><span className="flex items-center gap-1"><Palette className="h-4 w-4" /> Card Background</span><select value={editForm.theme_id} onChange={(e) => setEditForm({ ...editForm, theme_id: e.target.value })} className="input-base mt-1 w-full rounded-lg border px-3 py-2"><option value="">Auto (based on code)</option><option value="amber">Amber</option><option value="emerald">Emerald</option><option value="indigo">Indigo</option><option value="rose">Rose</option><option value="sky">Sky</option></select></label>
            <div className="flex justify-end gap-2"><button type="button" onClick={() => setEditing(null)} className="rounded-lg bg-slate-100 px-4 py-2 text-sm">Cancel</button><button disabled={saving} className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">{saving ? "Saving…" : "Save"}</button></div>
          </form>
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
                  Issued To
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
                <th className="text-heading px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="table-divide">
              {loading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 9 }).map((_, j) => (
                        <td key={j} className="px-5 py-3">
                          <div className="h-4 animate-pulse rounded bg-slate-200 " />
                        </td>
                      ))}
                    </tr>
                  ))
                : cards.map((card) => {
                    const isRedeemed = !!(card.redeemed_at || card.redeemed_by_user_id);
                    const isExpired = card.expires_at
                      ? new Date(card.expires_at) < new Date()
                      : false;
                    return (
                      <tr key={card.id} className="table-row-hover">
                        <td className="px-5 py-3">
                          <code className="text-heading rounded bg-slate-100 px-2 py-0.5 font-mono text-sm ">
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
                          {card.issued_to_user_id
                            ? (card.issued_to_profile ? (
                                <div>
                                  <p className="text-body font-medium">
                                    {card.issued_to_profile.full_name ?? "—"}
                                  </p>
                                  <p className="text-muted text-xs">
                                    {card.issued_to_profile.email}
                                  </p>
                                </div>
                              ) : (
                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700  ">
                                  Có hạn chế
                                </span>
                              ))
                            : (
                              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-600  ">
                                Chưa cấp
                              </span>
                            )}
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
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500  ">
                              Used
                            </span>
                          ) : isExpired ? (
                            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600  ">
                              Expired
                            </span>
                          ) : card.is_active ? (
                            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700  ">
                              Active
                            </span>
                          ) : (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500 ">
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
                        <td className="px-5 py-3 text-right">
                          {!isRedeemed && <button type="button" onClick={() => startEdit(card)} className="rounded-lg p-2 text-amber-700 hover:bg-amber-50" aria-label={`Edit gift card ${card.code}`}><Pencil className="h-4 w-4" /></button>}
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>

        {!loading && cards.length === 0 && (
          <div className="py-16 text-center">
            <Gift className="mx-auto mb-2 h-10 w-10 text-slate-300 " />
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
              className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm hover:bg-slate-100 disabled:opacity-40 "
            >
              <ChevronLeft className="h-4 w-4" /> Prev
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm hover:bg-slate-100 disabled:opacity-40 "
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
      <div className="flex gap-1 border-b border-slate-200 ">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === id
                ? "border-amber-500 text-amber-600 "
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
