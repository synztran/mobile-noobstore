"use client";

import { Plus } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import CrawlingSourcesTable from "./CrawlingSourcesTable";
import CrawlingDetectionsTable from "./CrawlingDetectionsTable";
import CrawlingSourceFormModal from "./CrawlingSourceFormModal";

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
  type: string;
  vendor_id: string | null;
  vendor: VendorRow | null;
  last_content_hash: string | null;
  last_crawled_at: string | null;
};

type DetectionRow = {
  id: string;
  source_id: string;
  content_hash: string;
  detected_title: string | null;
  detected_content: string;
  detected_url: string | null;
  status: string;
  release_id: string | null;
  created_at: string | null;
  source: { name: string; vendor_id: string | null; type: string | null } | null;
};

type Props = {
  sources: SourceRow[];
  detections: DetectionRow[];
  initialTab: string;
};

const TABS = [
  { key: "sources", label: "Sources" },
  { key: "detections", label: "Detections" },
];

export default function CrawlingClientWrapper({
  sources,
  detections,
  initialTab,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") || initialTab;
  const [showCreateModal, setShowCreateModal] = useState(false);

  function switchTab(key: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", key);
    router.push(`/crawling?${params.toString()}`);
  }

  return (
    <>
      {/* Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => switchTab(t.key)}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                tab === t.key
                  ? "bg-white text-slate-900 shadow"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {t.label}
              {t.key === "detections" && (
                <span className="ml-1.5 rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-800">
                  {detections.filter((d) => d.status === "pending").length}
                </span>
              )}
            </button>
          ))}
        </div>

        {tab === "sources" && (
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            <Plus className="h-5 w-5" />
            Add Source
          </button>
        )}
      </div>

      {/* Content */}
      {tab === "sources" && <CrawlingSourcesTable sources={sources} />}
      {tab === "detections" && <CrawlingDetectionsTable detections={detections} />}

      <CrawlingSourceFormModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        mode="create"
      />
    </>
  );
}
