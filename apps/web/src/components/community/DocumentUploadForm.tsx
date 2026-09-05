"use client";

import { useAuth } from "@/modules/user/client/AuthProvider";
import { useCommunityConfig } from "@/lib/react-query/community/api/useCommunityQueries";
import { useCreateDocument } from "@/lib/react-query/community/api/useCommunityMutations";
import { AlertCircle, FileCode2, Loader2, Upload, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";

const MAX_FIRMWARE_SIZE = 50 * 1024 * 1024;
const MAX_FILES = 10;
const ALLOWED_EXTENSIONS = [".hex", ".json", ".zip", ".bin", ".uf2"];

interface Props {
  onSuccess?: () => void;
}

export function DocumentUploadForm({ onSuccess }: Props) {
  const { user } = useAuth();
  const { data: config } = useCommunityConfig();
  const createMutation = useCreateDocument();

  const [title, setTitle] = useState("");
  const [keyboardName, setKeyboardName] = useState("");
  const [version, setVersion] = useState("");
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");

  const isSubmitting = createMutation.isPending;
  const canUpload = Boolean(config?.can_upload_firmware);

  // ── Gate: login
  if (!user) {
    return (
      <div className="space-y-3 rounded-2xl border border-outline-variant/20 bg-surface-container-low p-6 text-center">
        <p className="text-sm font-bold text-on-surface">Đăng nhập để chia sẻ tài liệu</p>
        <Link
          href="/login"
          className="btn btn-primary btn-md inline-block w-full rounded-full text-sm font-bold text-white"
        >
          Đăng nhập
        </Link>
      </div>
    );
  }

  if (config && !config.firmware_enabled) {
    return (
      <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-low p-6 text-center">
        <p className="text-sm font-black text-on-surface">Chia sẻ tài liệu đang tạm đóng</p>
        <p className="mt-1 text-xs text-on-surface-variant">Quay lại sau nhé!</p>
      </div>
    );
  }

  if (config && !canUpload) {
    return (
      <div className="space-y-3 rounded-2xl border border-outline-variant/20 bg-surface-container-low p-6 text-center">
        <p className="text-sm font-black text-on-surface">
          Chưa đủ điều kiện chia sẻ tài liệu
        </p>
        <p className="text-xs leading-relaxed text-on-surface-variant">
          Chỉ thành viên hạng{" "}
          <strong className="text-primary">{config.min_rank_level_firmware >= 2 ? "Bạc" : "hạng phù hợp"}</strong>{" "}
          trở lên mới có thể chia sẻ tài liệu.
        </p>
        <Link
          href="/profile/points"
          className="btn btn-primary btn-md rounded-full text-sm font-bold text-white"
        >
          Xem hạng của tôi
        </Link>
      </div>
    );
  }

  const validate = (): string => {
    if (title.trim().length < 3) return "Tiêu đề phải có ít nhất 3 ký tự";
    if (!keyboardName.trim()) return "Vui lòng nhập tên bàn phím";
    if (files.length === 0) return "Vui lòng chọn ít nhất một tệp";
    for (const file of files) {
      const ext = `.${file.name.split(".").pop() ?? ""}`.toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        return `Tệp ${file.name} không hợp lệ (cho phép .hex, .json, .zip, .bin, .uf2)`;
      }
      if (file.size > MAX_FIRMWARE_SIZE) return `Tệp ${file.name} vượt quá 50 MB`;
    }
    return "";
  };

  const handleFiles = useCallback((selected: File[]) => {
    setFiles((prev) => [...prev, ...selected].slice(0, MAX_FILES));
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (isSubmitting) return;
    const validation = validate();
    if (validation) {
      setError(validation);
      return;
    }
    setError("");
    try {
      await createMutation.mutateAsync({
        title: title.trim(),
        keyboardName: keyboardName.trim(),
        version: version.trim(),
        notes: notes.trim(),
        files,
      });
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
    }
  }, [isSubmitting, validate, title, keyboardName, version, notes, files, createMutation, onSuccess]);

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 rounded-2xl bg-error/10 px-4 py-3 text-sm font-semibold text-error">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
          Tiêu đề
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="VD: Firmware VIA cho QK65"
          maxLength={150}
          className="w-full rounded-2xl border-2 border-transparent bg-surface-container px-4 py-3 text-sm font-semibold text-on-surface outline-none transition-all focus:border-primary"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
            Bàn phím
          </label>
          <input
            type="text"
            value={keyboardName}
            onChange={(e) => setKeyboardName(e.target.value)}
            placeholder="QK65"
            className="w-full rounded-2xl border-2 border-transparent bg-surface-container px-4 py-3 text-sm font-semibold text-on-surface outline-none transition-all focus:border-primary"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
            Phiên bản
          </label>
          <input
            type="text"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            placeholder="1.0.0"
            className="w-full rounded-2xl border-2 border-transparent bg-surface-container px-4 py-3 text-sm font-semibold text-on-surface outline-none transition-all focus:border-primary"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
          Ghi chú
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Hướng dẫn flash, log thay đổi, cảnh báo..."
          rows={3}
          className="w-full resize-none rounded-2xl border-2 border-transparent bg-surface-container px-4 py-3 text-sm font-semibold text-on-surface outline-none transition-all focus:border-primary"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
          Tệp tài liệu (tối đa 50 MB)
        </label>
        <input
          type="file"
          accept=".hex,.json,.zip,.bin,.uf2"
          multiple
          className="hidden"
          id="firmware-file-input"
          onChange={(e) => handleFiles(Array.from(e.target.files ?? []))}
        />
        <label
          htmlFor="firmware-file-input"
          className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-outline-variant/40 bg-surface-container-low px-4 py-6 text-sm font-bold text-on-surface-variant transition-all active:scale-[0.99]"
        >
          <Upload size={18} />
          Chọn tệp tài liệu (.hex, .json, .zip, .bin, .uf2)
        </label>
        {files.length > 0 && (
          <div className="space-y-2 pt-1">
            <p className="text-[11px] font-semibold text-on-surface-variant">
              {files.length}/{MAX_FILES} tệp
            </p>
            <div className="grid grid-cols-2 gap-2">
              {files.map((file, i) => (
                <div
                  key={`${file.name}-${i}`}
                  className="flex items-center gap-2 rounded-2xl border border-outline-variant/20 bg-surface-container px-3 py-2"
                >
                  <FileCode2 size={18} className="flex-shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-on-surface">
                      {file.name}
                    </p>
                    <p className="text-[10px] font-semibold text-on-surface-variant">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label="Xoá tệp"
                    onClick={() => removeFile(i)}
                    className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg bg-error/10 text-error"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isSubmitting}
        className="btn btn-primary btn-md w-full rounded-full text-xs font-bold uppercase tracking-widest text-white shadow-ambient-sm transition-transform active:scale-[0.98] disabled:scale-100 disabled:opacity-70"
      >
        {isSubmitting ? (
          <span className="flex items-center gap-2">
            <Loader2 size={16} className="animate-spin" />
            Đang tải lên...
          </span>
        ) : (
          "CHIA SẺ TÀI LIỆU"
        )}
      </button>
    </div>
  );
}