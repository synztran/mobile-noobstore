"use client";

import { FileCode2, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export type DocumentFormValue = {
  id: string;
  title: string;
  keyboard_name: string;
  version: string;
  notes: string;
  status: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  mode: "create" | "update";
  document?: DocumentFormValue;
};

interface UploadedFile {
  name: string;
  size: number;
  mime: string;
  url: string;
}

const ALLOWED_EXTENSIONS = [".hex", ".json", ".bin"];
const MAX_FILES = 10;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

function getExtension(name: string): string {
  return `.${name.split(".").pop() ?? ""}`.toLowerCase();
}

function formatBytes(bytes: number): string {
  if (!bytes) return "0 KB";
  const mb = bytes / 1024 / 1024;
  return mb >= 1 ? `${mb.toFixed(2)} MB` : `${Math.round(bytes / 1024)} KB`;
}

export default function DocumentFormModal({
  open,
  onClose,
  mode,
  document,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [keyboardName, setKeyboardName] = useState("");
  const [version, setVersion] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSelectedFiles([]);

    if (mode === "update" && document) {
      setTitle(document.title ?? "");
      setKeyboardName(document.keyboard_name ?? "");
      setVersion(document.version ?? "");
      setNotes(document.notes ?? "");
      return;
    }

    setTitle("");
    setKeyboardName("");
    setVersion("");
    setNotes("");
  }, [open, mode, document]);

  if (!open) return null;

  const titleText = mode === "create" ? "Tạo tài liệu" : "Sửa tài liệu";
  const submitLabel = mode === "create" ? "Tạo tài liệu" : "Lưu thay đổi";

  function validateFiles(): string {
    if (mode === "create" && selectedFiles.length === 0) {
      return "Vui lòng chọn ít nhất một tệp (.hex, .json, .bin)";
    }
    for (const file of selectedFiles) {
      if (!ALLOWED_EXTENSIONS.includes(getExtension(file.name))) {
        return `Tệp ${file.name} không hợp lệ (chỉ hỗ trợ .hex, .json, .bin)`;
      }
      if (file.size > MAX_FILE_SIZE) {
        return `Tệp ${file.name} vượt quá 50 MB`;
      }
    }
    return "";
  }

  function handleFiles(selected: FileList | null) {
    if (!selected) return;
    const next = [...selectedFiles];
    for (const file of Array.from(selected)) {
      if (next.length >= MAX_FILES) break;
      if (next.some((f) => f.name === file.name)) continue;
      next.push(file);
    }
    setSelectedFiles(next);
  }

  function removeFile(index: number) {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const fileError = validateFiles();
    if (fileError) {
      setError(fileError);
      return;
    }

    setLoading(true);

    try {
      const uploaded: UploadedFile[] = [];
      if (mode === "create") {
        for (const file of selectedFiles) {
          const formData = new FormData();
          formData.append("file", file);
          const uploadRes = await fetch("/api/documents/upload", {
            method: "POST",
            body: formData,
          });
          const uploadData = await uploadRes.json().catch(() => null);
          if (!uploadRes.ok) {
            throw new Error(
              uploadData?.error ?? `Không thể tải lên ${file.name}`,
            );
          }
          uploaded.push(uploadData);
        }
      }

      const url =
        "/api/documents" + (mode === "update" ? `/${document?.id}` : "");
      const method = mode === "create" ? "POST" : "PATCH";

      const body = {
        title: title.trim(),
        keyboardName: keyboardName.trim(),
        version: version.trim(),
        notes: notes.trim(),
        ...(mode === "create" ? { files: uploaded } : {}),
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          data?.error ??
            `Không thể ${mode === "create" ? "tạo" : "cập nhật"} tài liệu`,
        );
      }

      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đã xảy ra lỗi");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 !mt-0 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative mx-4 flex max-h-[90vh] w-full max-w-xl flex-col rounded-xl bg-white shadow-2xl">
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

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Tiêu đề <span className="text-red-500">*</span>
              </label>
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={150}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="VD: Firmware VIA cho QK65"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Bàn phím <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  value={keyboardName}
                  onChange={(e) => setKeyboardName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="QK65"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Phiên bản
                </label>
                <input
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="1.0.0"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Ghi chú
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Hướng dẫn flash, log thay đổi, cảnh báo..."
              />
            </div>

            {mode === "create" && (
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Tệp tài liệu{" "}
                  <span className="text-red-500">*</span>
                  <span className="ml-1 text-xs font-normal text-slate-400">
                    (.hex, .json, .bin — tối đa {MAX_FILES} tệp, 50 MB/tệp)
                  </span>
                </label>
                <input
                  type="file"
                  accept=".hex,.json,.bin"
                  multiple
                  className="hidden"
                  id="document-file-input"
                  onChange={(e) => {
                    handleFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
                <label
                  htmlFor="document-file-input"
                  className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm font-medium text-slate-500 transition-colors hover:border-blue-400 hover:text-blue-600"
                >
                  <Upload className="h-5 w-5" />
                  Chọn tệp tài liệu (.hex, .json, .bin)
                </label>
                {selectedFiles.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs font-medium text-slate-500">
                      {selectedFiles.length}/{MAX_FILES} tệp
                    </p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {selectedFiles.map((file, i) => (
                        <div
                          key={`${file.name}-${i}`}
                          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2"
                        >
                          <FileCode2
                            size={18}
                            className="flex-shrink-0 text-blue-500"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold text-slate-800">
                              {file.name}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {formatBytes(file.size)}
                            </p>
                          </div>
                          <button
                            type="button"
                            aria-label="Xoá tệp"
                            onClick={() => removeFile(i)}
                            className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
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
