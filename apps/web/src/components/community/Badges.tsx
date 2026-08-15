interface RankChipProps {
  rankName?: string | null;
  color?: string | null;
}

export function RankChip({ rankName, color }: RankChipProps) {
  if (!rankName) return null;
  const c = color ?? "#6B7280";
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider"
      style={{ backgroundColor: `${c}22`, color: c }}
    >
      {rankName}
    </span>
  );
}

export const POST_TYPE_META: Record<
  string,
  { label: string; className: string }
> = {
  knowledge: {
    label: "Kiến thức",
    className: "bg-primary/10 text-primary",
  },
  drama: {
    label: "Drama",
    className: "bg-error/10 text-error",
  },
  build: {
    label: "Build",
    className: "bg-emerald-500/10 text-emerald-600",
  },
};

export function PostTypeBadge({ type }: { type: string }) {
  const meta = POST_TYPE_META[type] ?? {
    label: type,
    className: "bg-surface-container-high text-on-surface-variant",
  };
  return (
    <span
      className={`inline-block rounded-full px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider ${meta.className}`}
    >
      {meta.label}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-amber-400/15 text-amber-600",
    published: "bg-emerald-500/10 text-emerald-600",
    rejected: "bg-error/10 text-error",
  };
  const labelMap: Record<string, string> = {
    pending: "Chờ duyệt",
    published: "Đã duyệt",
    rejected: "Từ chối",
  };
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
        map[status] ?? "bg-surface-container-high text-on-surface-variant"
      }`}
    >
      {labelMap[status] ?? status}
    </span>
  );
}