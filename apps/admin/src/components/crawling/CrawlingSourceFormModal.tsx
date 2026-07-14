"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import CrawlingSchedulePicker from "./CrawlingSchedulePicker";

type VendorRow = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
};

type SourceRow = {
  id: string;
  name: string;
  url: string;
  selector: string | null;
  schedule_days: number[];
  schedule_time: string;
  category: string;
  author: string;
  status: string;
  watch_id: string | null;
  vendor_id: string | null;
  type: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  mode: "create" | "update";
  source?: SourceRow;
};

export default function CrawlingSourceFormModal({
  open,
  onClose,
  mode,
  source,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [selector, setSelector] = useState("");
  const [scheduleDays, setScheduleDays] = useState<number[]>([1, 2, 3, 4, 5, 6]);
  const [scheduleTime, setScheduleTime] = useState("08:00");
  const [category, setCategory] = useState("Maker News");
  const [author, setAuthor] = useState("NoobStore");
  const [status, setStatus] = useState("active");
  const [vendorId, setVendorId] = useState("");
  const [type, setType] = useState("NEW_RELEASE");

  useEffect(() => {
    if (!open) return;
    setError(null);

    fetch("/api/vendors")
      .then((r) => r.json())
      .then((data) => setVendors(Array.isArray(data) ? data : []))
      .catch(() => setVendors([]));

    if (mode === "update" && source) {
      setName(source.name ?? "");
      setUrl(source.url ?? "");
      setSelector(source.selector ?? "");
      setScheduleDays(source.schedule_days ?? [1, 2, 3, 4, 5, 6]);
      setScheduleTime(source.schedule_time ?? "08:00");
      setCategory(source.category ?? "Maker News");
      setAuthor(source.author ?? "NoobStore");
      setStatus(source.status ?? "active");
      setVendorId(source.vendor_id ?? "");
      setType(source.type ?? "NEW_RELEASE");
      return;
    }

    setName("");
    setUrl("");
    setSelector("");
    setScheduleDays([1, 2, 3, 4, 5, 6]);
    setScheduleTime("08:00");
    setCategory("Maker News");
    setAuthor("NoobStore");
    setStatus("active");
    setVendorId("");
    setType("NEW_RELEASE");
  }, [open, mode, source]);

  if (!open) return null;

  const titleText = mode === "create" ? "Add Crawling Source" : "Edit Source";
  const submitLabel = mode === "create" ? "Create Source" : "Save Changes";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const payload = {
      name: name.trim(),
      url: url.trim(),
      selector: selector.trim() || null,
      schedule_days: scheduleDays,
      schedule_time: scheduleTime,
      category: category.trim() || "Maker News",
      author: author.trim() || "NoobStore",
      status,
      vendor_id: vendorId || null,
      type,
    };

    const urlPath =
      mode === "create"
        ? "/api/crawling/sources"
        : `/api/crawling/sources/${source?.id}`;
    const method = mode === "create" ? "POST" : "PATCH";

    const res = await fetch(urlPath, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => null);
    setLoading(false);

    if (!res.ok) {
      setError(data?.error ?? `Failed to ${mode} source`);
      return;
    }

    onClose();
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 !mt-0 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative mx-4 flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-6 py-4">
          <p className="text-lg font-semibold text-slate-900">{titleText}</p>
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

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="KBDFans News"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  URL <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://kbdfans.com/blogs/news"
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  CSS Selector <span className="text-xs font-normal text-slate-400">(optional)</span>
                </label>
                <input
                  value={selector}
                  onChange={(e) => setSelector(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder=".article-content, #main-content"
                />
                <p className="mt-1 text-xs text-slate-400">
                  Leave empty to monitor the full page. Use a selector to target specific content area.
                </p>
              </div>
              <div className="md:col-span-2">
                <p className="mb-1 text-sm font-medium text-slate-700">
                  Schedule
                </p>
                <CrawlingSchedulePicker
                  days={scheduleDays}
                  time={scheduleTime}
                  onDaysChange={setScheduleDays}
                  onTimeChange={setScheduleTime}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Vendor
                </label>
                <select
                  value={vendorId}
                  onChange={(e) => setVendorId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">No vendor</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="NEW_RELEASE">New Release</option>
                  <option value="SALE">Sale</option>
                  <option value="GROUP_BUY">Group Buy</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Category
                </label>
                <input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Maker News"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Author
                </label>
                <input
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="NoobStore"
                />
              </div>
            </div>
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
