"use client";

import { usePreventScroll } from "@/hooks/usePreventScroll";
import type { DocumentFile, DocumentRow } from "@/lib/community-server";
import {
  CalendarDays,
  Download,
  FileCode2,
  HardDrive,
  Keyboard,
  Tag,
  User,
} from "lucide-react";

interface DocumentDetailDrawerProps {
  document: DocumentRow | null;
  onClose: () => void;
}

const MAX_FIRMWARE_SIZE_LABEL = 50 * 1024 * 1024;

function formatBytes(bytes: number): string {
  if (!bytes) return "";
  const mb = bytes / 1024 / 1024;
  return mb >= 1 ? `${mb.toFixed(2)} MB` : `${Math.round(bytes / 1024)} KB`;
}

function fileIcon(mime: string) {
  if (/image\//.test(mime)) return <FileCode2 size={22} />;
  if (/json/.test(mime) || /zip/.test(mime)) return <FileCode2 size={22} />;
  return <FileCode2 size={22} />;
}

export function DocumentDetailDrawer({
  document,
  onClose,
}: DocumentDetailDrawerProps) {
  const open = Boolean(document);
  usePreventScroll(open);

  const files: DocumentFile[] = document?.files ?? [];

  return (
    <>
      <div
        className={`fixed inset-0 z-[60] !mt-0 bg-on-surface/30 backdrop-blur-sm transition-opacity duration-300 ${
          open
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />

      <div
        className={`duration-250 fixed left-0 right-0 z-[999] flex h-full max-h-[92dvh] flex-col rounded-t-5xl bg-surface transition-all ease-out ${
          open ? "top-[8dvh]" : "top-[110vh]"
        }`}
      >
        <div className="flex justify-center pb-2 pt-3">
          <div className="h-1 w-10 rounded-full bg-outline-variant" />
        </div>

        <div className="flex items-start justify-between gap-4 px-5 py-2">
          <div className="text-xl font-black tracking-tight text-on-surface">
            Chi tiết tài liệu
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-outline-variant/40 bg-surface-container px-3 py-1.5 text-xs font-bold text-on-surface transition-all active:scale-90"
          >
            Đóng
          </button>
        </div>

        <div className="flex-1 touch-pan-y overflow-y-auto px-5 pb-6">
          {!document ? (
            <div className="py-16" />
          ) : (
            <div className="space-y-5">
              <div>
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <FileCode2 size={28} />
                  </div>
                  <div className="min-w-0">
                    <p className="break-words text-xl font-black leading-tight tracking-tight text-on-surface">
                      {document.title}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold text-on-surface-variant/70">
                      <span className="flex items-center gap-1">
                        <User size={12} />
                        {document.author_name}
                      </span>
                      <span className="flex items-center gap-1">
                        <CalendarDays size={12} />
                        {new Date(
                          document.published_at ?? document.created_at
                        ).toLocaleDateString("vi-VN")}
                      </span>
                      <span className="flex items-center gap-1">
                        <Download size={12} />
                        {document.download_count} lượt tải
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {document.keyboard_name && (
                    <span className="inline-flex items-center gap-1.5 rounded-xl bg-surface-container px-3 py-1.5 text-xs font-bold text-on-surface">
                      <Keyboard size={14} className="text-primary" />
                      {document.keyboard_name}
                    </span>
                  )}
                  {document.version && (
                    <span className="inline-flex items-center gap-1.5 rounded-xl bg-surface-container px-3 py-1.5 text-xs font-bold text-on-surface">
                      <Tag size={14} className="text-primary" />v
                      {document.version}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 rounded-xl bg-surface-container px-3 py-1.5 text-xs font-bold text-on-surface">
                    <HardDrive size={14} className="text-primary" />
                    {files.length} tệp
                  </span>
                </div>
              </div>

              {document.notes && (
                <section className="space-y-2">
                  <p className="text-xs font-black uppercase tracking-widest text-on-surface-variant">
                    Thông tin bổ sung
                  </p>
                  <div className="whitespace-pre-wrap rounded-2xl bg-surface-container-low p-4 text-sm font-medium leading-relaxed text-on-surface-variant">
                    {document.notes}
                  </div>
                </section>
              )}

              <section className="space-y-2">
                <p className="text-xs font-black uppercase tracking-widest text-on-surface-variant">
                  Tệp tải về ({files.length})
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {files.map((f, i) => (
                    <a
                      key={`${f.name}-${i}`}
                      href={f.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`relative flex items-center gap-2 rounded-xl border border-outline-variant/20 bg-surface-container-low p-2 transition-all hover:shadow-float active:scale-[0.98] ${
                        f.size > MAX_FIRMWARE_SIZE_LABEL ? "" : ""
                      }`}
                    >
                      <FileBadge file={f} />
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        {fileIcon(f.mime)}
                      </div>
                      <div className="flex flex-col items-start">
                        <p className="line-clamp-2 w-full text-center text-sm font-black leading-tight text-on-surface">
                          {f.name}
                        </p>
                        <p className="text-xs font-semibold text-on-surface-variant">
                          {formatBytes(f.size)}
                        </p>
                      </div>
                    </a>
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

const FileBadge = ({ file }: { file: DocumentFile }) => {
  const fileType = file.name.split(".").pop()?.toLowerCase() ?? "";
  const mapFileType: Record<
    string,
    {
      label: string;
      bgc: string;
      color: string;
    }
  > = {
    hex: { label: "HEX", bgc: "bg-error/10", color: "text-error" },
    json: { label: "JSON", bgc: "bg-primary/10", color: "text-primary" },
  };
  const fileTypeInfo = mapFileType[fileType];
  return (
    <div
      className={`absolute -right-2 -top-2 border-collapse gap-2 rounded-md border border-outline-variant/20 bg-surface-container px-3 py-0.5 text-xs font-bold uppercase ${fileTypeInfo?.bgc || "bg-surface-container"} ${fileTypeInfo?.color || "text-on-surface"}`}
    >
      {fileTypeInfo?.label || fileType}
    </div>
  );
};
