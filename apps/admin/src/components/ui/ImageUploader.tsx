"use client";

import { optimizeImageFile } from "@/lib/optimize-image";
import { processProductPhoto } from "@/lib/process-product-image";
import { ImageOff, ImagePlus, Loader2, Trash2, Upload } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";

async function fetchStandardBg(): Promise<string | null> {
  const res = await fetch("/api/photo-settings", { cache: "no-store" });
  if (!res.ok) return null;
  const data = (await res.json()) as { backgroundUrl: string | null };
  return data.backgroundUrl;
}

// ─── Single image uploader (thumbnail) ───────────────────────────────────────

interface SingleImageUploaderProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  slug?: string;
  /** Enable remove-background + standard-grid processing. */
  allowProcessBackground?: boolean;
  rawUpload?: boolean;
}

export function SingleImageUploader({
  value,
  onChange,
  label = "Thumbnail",
  slug,
  allowProcessBackground = false,
  rawUpload = false,
}: SingleImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processBg, setProcessBg] = useState(false);
  const [cutoutUrl, setCutoutUrl] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setUploading(true);
    setCutoutUrl(null);

    if (processBg) {
      try {
        const backgroundUrl = await fetchStandardBg();
        if (!backgroundUrl)
          throw new Error(
            "Chưa đặt nền chuẩn. Vào mục Ảnh sản phẩm để cấu hình."
          );
        const { composite, cutout } = await processProductPhoto(
          file,
          backgroundUrl
        );
        const fd = new FormData();
        fd.append(
          "file",
          new File([composite], "composite.jpg", { type: "image/jpeg" })
        );
        if (slug) fd.append("slug", slug);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Upload thất bại");
        onChange(data.url as string);
        const fdCutout = new FormData();
        fdCutout.append(
          "file",
          new File([cutout], "cutout.png", { type: "image/png" })
        );
        if (slug) fdCutout.append("slug", `${slug}/processed`);
        const cutoutRes = await fetch("/api/upload", {
          method: "POST",
          body: fdCutout,
        });
        if (cutoutRes.ok) setCutoutUrl((await cutoutRes.json()).url as string);
      } catch (caught) {
        setError(
          caught instanceof Error ? caught.message : "Xử lý ảnh thất bại"
        );
      } finally {
        setUploading(false);
      }
      return;
    }

    const fd = new FormData();
    fd.append("file", rawUpload ? file : await optimizeImageFile(file));
    if (slug) fd.append("slug", slug);

    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    setUploading(false);

    if (!res.ok) {
      setError(data.error ?? "Upload failed");
      return;
    }
    onChange(data.url);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-slate-700">
        {label}
      </label>

      {allowProcessBackground && (
        <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600">
          <input
            type="checkbox"
            checked={processBg}
            onChange={(event) => setProcessBg(event.target.checked)}
            className="toggle toggle-primary toggle-sm"
          />
          <ImagePlus className="h-3.5 w-3.5 text-blue-500" />
          Tách nền + ghép nền chuẩn (800×800)
        </label>
      )}

      {value ? (
        <div className="group relative h-40 w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
          <Image
            src={value}
            alt="thumbnail"
            fill
            className="object-contain"
            sizes="400px"
          />
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/0 opacity-0 transition-colors group-hover:bg-black/30 group-hover:opacity-100">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="rounded-lg bg-white p-2 text-slate-700 shadow transition-colors hover:bg-slate-100"
              title="Replace image"
            >
              <Upload className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onChange("")}
              className="rounded-lg bg-white p-2 text-red-600 shadow transition-colors hover:bg-red-50"
              title="Remove image"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className="flex h-36 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-400 transition-colors hover:border-blue-400 hover:bg-blue-50/30"
        >
          {uploading ? (
            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          ) : (
            <>
              <ImageOff className="h-6 w-6" />
              <p className="text-xs">Click or drag to upload</p>
            </>
          )}
        </div>
      )}

      {uploading && !value && null}
      {uploading && (
        <p className="text-xs text-blue-500">
          {processBg ? "Đang tách nền + ghép nền…" : "Đang tải lên…"}
        </p>
      )}
      {cutoutUrl && (
        <p className="text-xs text-slate-500">
          Đã lưu ảnh nền trong suốt (phục vụ xử lý sau này).
        </p>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}

// ─── Multi image uploader (images array) ─────────────────────────────────────

interface MultiImageUploaderProps {
  value: string[];
  onChange: (urls: string[]) => void;
  label?: string;
  slug?: string;
  /** Enable per-file background removal and standard-grid processing. */
  allowProcessBackground?: boolean;
}

export function MultiImageUploader({
  value,
  onChange,
  label = "Images",
  slug,
  allowProcessBackground = false,
}: MultiImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [staged, setStaged] = useState<
    Array<{ id: number; file: File; previewUrl: string; processBg: boolean }>
  >([]);
  const stagedId = useRef(0);

  async function uploadFile(file: File): Promise<string | null> {
    const fd = new FormData();
    fd.append("file", await optimizeImageFile(file));
    if (slug) fd.append("slug", slug);

    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) return null;
    return data.url as string;
  }

  function stageFiles(files: File[]) {
    if (files.length === 0) return;
    if (allowProcessBackground) {
      setStaged((current) => [
        ...current,
        ...files.map((file) => ({
          id: ++stagedId.current,
          file,
          previewUrl: URL.createObjectURL(file),
          processBg: false,
        })),
      ]);
      return;
    }
    setError(null);
    setUploading(true);
    Promise.all(files.map(uploadFile)).then((results) => {
      setUploading(false);
      const failed = results.filter((result) => result === null).length;
      if (failed) setError(`${failed} file(s) failed to upload`);
      const uploaded = results.filter(
        (result): result is string => result !== null
      );
      if (uploaded.length) onChange([...value, ...uploaded]);
    });
  }

  async function uploadStaged() {
    if (!staged.length || uploading) return;
    setError(null);
    setUploading(true);
    const results = await Promise.all(
      staged.map(async (item): Promise<string | null> => {
        try {
          if (!item.processBg) return await uploadFile(item.file);
          const bg = await fetchStandardBg();
          if (!bg)
            throw new Error(
              "Chưa đặt nền chuẩn. Vào mục Ảnh sản phẩm để cấu hình."
            );
          const { composite } = await processProductPhoto(item.file, bg);
          const fd = new FormData();
          fd.append(
            "file",
            new File([composite], "composite.jpg", { type: "image/jpeg" })
          );
          if (slug) fd.append("slug", slug);
          const res = await fetch("/api/upload", { method: "POST", body: fd });
          if (!res.ok) return null;
          return (await res.json()).url as string;
        } catch {
          return null;
        }
      })
    );
    setUploading(false);
    staged.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    setStaged([]);
    if (results.some((result) => result === null))
      setError("Một số ảnh tải lên thất bại");
    const uploaded = results.filter(
      (result): result is string => result !== null
    );
    if (uploaded.length) onChange([...value, ...uploaded]);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    stageFiles(Array.from(e.target.files ?? []));
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    stageFiles(Array.from(e.dataTransfer.files));
  }

  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-slate-700">
        {label}
      </label>

      {staged.length > 0 && (
        <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-medium text-slate-600">
            {staged.length} ảnh đã chọn — tích “Tách nền” cho ảnh cần ghép nền
            chuẩn:
          </p>
          <div className="flex flex-wrap gap-2">
            {staged.map((item) => (
              <div
                key={item.id}
                className={`relative h-24 w-24 overflow-hidden rounded-lg border-2 ${item.processBg ? "border-blue-500" : "border-slate-200"}`}
              >
                <img
                  src={item.previewUrl}
                  alt="Ảnh đã chọn"
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => {
                    URL.revokeObjectURL(item.previewUrl);
                    setStaged((current) =>
                      current.filter((entry) => entry.id !== item.id)
                    );
                  }}
                  className="absolute right-1 top-1 rounded bg-white/90 p-1 text-red-600 shadow"
                  aria-label="Xóa ảnh"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
                <label className="absolute inset-x-0 bottom-0 flex cursor-pointer items-center gap-1 bg-black/60 px-1.5 py-1 text-[10px] text-white">
                  <input
                    type="checkbox"
                    checked={item.processBg}
                    onChange={() =>
                      setStaged((current) =>
                        current.map((entry) =>
                          entry.id === item.id
                            ? { ...entry, processBg: !entry.processBg }
                            : entry
                        )
                      )
                    }
                    className="h-3 w-3 accent-blue-500"
                  />
                  Tách nền
                </label>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void uploadStaged()}
            disabled={uploading}
            className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            {uploading ? "Đang xử lý…" : `Tải lên ${staged.length} ảnh`}
          </button>
        </div>
      )}

      {/* Existing images grid */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((url, i) => (
            <div
              key={url}
              className="group relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border border-slate-200"
            >
              <Image
                src={url}
                alt={`image-${i}`}
                fill
                className="object-cover"
                sizes="80px"
              />
              <button
                type="button"
                onClick={() => remove(i)}
                className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-colors group-hover:bg-black/40 group-hover:opacity-100"
              >
                <Trash2 className="h-4 w-4 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className="flex h-20 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-400 transition-colors hover:border-blue-400 hover:bg-blue-50/30"
      >
        {uploading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
            <span className="text-xs text-blue-500">Uploading…</span>
          </>
        ) : (
          <>
            <Upload className="h-4 w-4" />
            <span className="text-xs">Click or drag to add images</span>
          </>
        )}
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}
