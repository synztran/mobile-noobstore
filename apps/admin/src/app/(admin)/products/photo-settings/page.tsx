"use client";

import { SingleImageUploader } from "@/components/ui/ImageUploader";
import { useStandardBackground } from "@/lib/useStandardBackground";
import { Check, Loader2, Save, Trash2 } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

export default function PhotoSettingsPage() {
  const { backgroundUrl, loading, refresh } = useStandardBackground();
  const [draft, setDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDraft(backgroundUrl);
  }, [backgroundUrl]);

  async function handleSave() {
    if (!draft) return;
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      const res = await fetch("/api/photo-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ backgroundUrl: draft }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? "Lưu thất bại");
      }
      setSaved(true);
      void refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lưu thất bại");
    } finally {
      setSaving(false);
    }
  }

  const isDirty = draft && draft !== backgroundUrl;

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Ảnh sản phẩm</h1>
        <p className="mt-1 text-sm text-slate-500">
          Nền chuẩn cho ảnh sản phẩm. Khi bật “Tách nền + nền chuẩn” trong phần
          chỉnh sửa sản phẩm, ảnh gốc được tách nền rồi ghép lên background này.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        {loading ? (
          <div className="flex h-40 items-center justify-center gap-2 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            Đang tải cài đặt…
          </div>
        ) : (
          <>
            <div className="mb-4 aspect-square w-full overflow-hidden rounded-lg border border-slate-200 bg-neutral-100 sm:w-80">
              {draft ? (
                <Image
                  src={draft}
                  alt="Standard background"
                  width={800}
                  height={800}
                  className="h-full w-full object-cover"
                  sizes="336px"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">
                  Chưa đặt nền chuẩn
                </div>
              )}
            </div>

            <SingleImageUploader
              value=""
              onChange={(url) => {
                setDraft(url || backgroundUrl);
                setSaved(false);
                setError(null);
              }}
              label="Ảnh nền chuẩn"
              slug="processed-backgrounds"
              rawUpload
            />

            <p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
              Khuyến nghị: ảnh vuông 800×800px. Sản phẩm sẽ được fit trong vùng
              600×600px (cách mép 100px), căn giữa, giữ nguyên tỉ lệ, xuất JPEG
              chất lượng 90%.
            </p>

            {error && <p className="mt-3 text-xs text-red-600">{error}</p>}
            {saved && (
              <p className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-green-600">
                <Check size={14} /> Đã lưu nền chuẩn.
              </p>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={!isDirty || saving}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Lưu nền chuẩn
              </button>
              {draft && (
                <button
                  type="button"
                  onClick={() => {
                    setDraft(null);
                    setSaved(false);
                    setError(null);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Bỏ chọn
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}