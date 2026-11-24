import type { AuctionStatus } from "../types";

export function AuctionStatusBadge({
  status,
  startsAt,
  endsAt,
  className = "",
}: {
  status: AuctionStatus;
  startsAt?: string;
  endsAt?: string;
  className?: string;
}) {
  const now = new Date();
  const isUpcoming =
    status === "active" && startsAt ? new Date(startsAt) > now : false;
  const isExpired =
    status === "active" && endsAt ? new Date(endsAt) <= now : false;

  if (isUpcoming) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20 ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        Sắp diễn ra
      </span>
    );
  }

  if (status === "active" && !isExpired) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 ${className}`}
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        Đang đấu giá
      </span>
    );
  }

  if (status === "ended" || isExpired) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-neutral-500/10 text-neutral-400 border border-neutral-500/20 ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
        Đã kết thúc
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-500 border border-rose-500/20 ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
      Đã hủy
    </span>
  );
}
