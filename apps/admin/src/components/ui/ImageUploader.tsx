"use client";

import { ImageOff, Loader2, Trash2, Upload } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";

// ─── Single image uploader (thumbnail) ───────────────────────────────────────

interface SingleImageUploaderProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  slug?: string;
}

export function SingleImageUploader({
  value,
  onChange,
  label = "Thumbnail",
  slug,
}: SingleImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setUploading(true);

    const fd = new FormData();
    fd.append("file", file);
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
}

export function MultiImageUploader({
  value,
  onChange,
  label = "Images",
  slug,
}: MultiImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function uploadFile(file: File): Promise<string | null> {
    const fd = new FormData();
    fd.append("file", file);
    if (slug) fd.append("slug", slug);

    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) return null;
    return data.url as string;
  }

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    e.target.value = "";

    setError(null);
    setUploading(true);
    const results = await Promise.all(files.map(uploadFile));
    setUploading(false);

    const failed = results.filter((r) => r === null).length;
    if (failed > 0) setError(`${failed} file(s) failed to upload`);

    const uploaded = results.filter((r) => r !== null) as string[];
    if (uploaded.length > 0) onChange([...value, ...uploaded]);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    setError(null);
    setUploading(true);
    Promise.all(files.map(uploadFile)).then((results) => {
      setUploading(false);
      const uploaded = results.filter((r) => r !== null) as string[];
      if (uploaded.length > 0) onChange([...value, ...uploaded]);
    });
  }

  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-slate-700">
        {label}
      </label>

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
