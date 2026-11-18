"use client";

import {
  ImagePlus,
  RotateCcw,
  RotateCw,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { useRef, useState } from "react";

export interface DropZoneItem {
  id: string;
  name: string;
  previewUrl: string;
  width: number;
  height: number;
  rotation: number;
}

interface ImageDropZoneProps {
  title: string;
  hint: string;
  items: DropZoneItem[];
  multiple?: boolean;
  disabled?: boolean;
  onFiles: (files: File[]) => void;
  onRemove: (id: string) => void;
  onRotate: (id: string, delta: number) => void;
}

export default function ImageDropZone({
  title,
  hint,
  items,
  multiple = false,
  disabled = false,
  onFiles,
  onRemove,
  onRotate,
}: ImageDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function acceptFiles(fileList: FileList | null) {
    if (!fileList || disabled) return;
    const files = Array.from(fileList).filter((file) =>
      file.type.startsWith("image/"),
    );
    if (files.length > 0) onFiles(multiple ? files : files.slice(0, 1));
  }

  return (
    <section className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">{hint}</p>
        </div>
        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
          {items.length} ảnh
        </span>
      </div>

      <div
        className={`mt-3 grid gap-3 ${
          multiple ? "sm:grid-cols-2" : "grid-cols-1"
        }`}
      >
        {items.map((item) => (
          <figure
            key={item.id}
            className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
          >
            <div className="flex h-32 items-center justify-center overflow-hidden bg-[linear-gradient(45deg,#f1f5f9_25%,transparent_25%,transparent_75%,#f1f5f9_75%),linear-gradient(45deg,#f1f5f9_25%,transparent_25%,transparent_75%,#f1f5f9_75%)] bg-[length:16px_16px] bg-[position:0_0,8px_8px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.previewUrl}
                alt={item.name}
                className="max-h-32 w-full object-contain"
              />
            </div>
            <figcaption className="space-y-2 px-2.5 py-2">
              <p className="truncate text-[11px] font-medium text-slate-700" title={item.name}>
                {item.name}
              </p>
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] tabular-nums text-slate-500">
                  {item.width}×{item.height}
                </span>
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => onRotate(item.id, -90)}
                    disabled={disabled}
                    className="rounded p-1 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-800 disabled:opacity-40"
                    title="Xoay trái 90°"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onRotate(item.id, 90)}
                    disabled={disabled}
                    className="rounded p-1 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-800 disabled:opacity-40"
                    title="Xoay phải 90°"
                  >
                    <RotateCw className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(item.id)}
                    disabled={disabled}
                    className="rounded p-1 text-rose-500 transition-colors hover:bg-rose-50 hover:text-rose-700 disabled:opacity-40"
                    title="Xoá ảnh"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </figcaption>
          </figure>
        ))}

        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            if (!disabled) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            acceptFiles(event.dataTransfer.files);
          }}
          className={`flex min-h-32 flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors disabled:opacity-50 ${
            dragging
              ? "border-slate-900 bg-slate-100"
              : "border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50"
          }`}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600">
            {dragging ? (
              <UploadCloud className="h-5 w-5" />
            ) : (
              <ImagePlus className="h-5 w-5" />
            )}
          </span>
          <span className="text-xs font-medium text-slate-700">
            {multiple ? "Thêm ảnh khách" : "Chọn ảnh render"}
          </span>
          <span className="text-[10px] text-slate-500">
            Kéo thả hoặc bấm để chọn · JPG, PNG, WebP
          </span>
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        className="hidden"
        onChange={(event) => {
          acceptFiles(event.target.files);
          event.target.value = "";
        }}
      />
    </section>
  );
}
