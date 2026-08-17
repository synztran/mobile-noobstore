import type { DocumentRow } from "@/lib/community-server";
import { Download, FileCode2, Keyboard, Tag } from "lucide-react";

interface DocumentCardProps {
  document: DocumentRow;
  onOpen?: (document: DocumentRow) => void;
}

export function DocumentCard({ document, onOpen }: DocumentCardProps) {
  return (
    <button
      id={document.id}
      type="button"
      onClick={() => onOpen?.(document)}
      className="flex w-full flex-col rounded-2xl border border-outline-variant/20 bg-surface-container-low p-4 text-left transition-all hover:shadow-float active:scale-[0.99]"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <FileCode2 size={22} />
        </div>
        <span className="flex items-center gap-1 text-[11px] font-semibold text-on-surface-variant/70">
          <Download size={12} />
          {document.download_count}
        </span>
      </div>

      <p className="mt-3 line-clamp-2 text-sm font-black leading-snug text-on-surface">
        {document.title}
      </p>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {document.keyboard_name && (
          <span className="inline-flex items-center gap-1 rounded-lg bg-surface-container-high px-2 py-0.5 text-[10px] font-bold text-on-surface-variant">
            <Keyboard size={11} />
            {document.keyboard_name}
          </span>
        )}
        {document.version && (
          <span className="inline-flex items-center gap-1 rounded-lg bg-surface-container-high px-2 py-0.5 text-[10px] font-bold text-on-surface-variant">
            <Tag size={11} />v{document.version}
          </span>
        )}
        <span className="inline-flex items-center gap-1 rounded-lg bg-surface-container-high px-2 py-0.5 text-[10px] font-bold text-on-surface-variant">
          <FileCode2 size={11} />
          {document.files.length} tệp
        </span>
      </div>

      {document.notes && (
        <p className="mt-2 line-clamp-2 text-xs font-medium text-on-surface-variant">
          {document.notes}
        </p>
      )}
    </button>
  );
}
