import clsx from "clsx";

export type ProductBadge = {
  key: string;
  label: string;
  className: string;
};

export function ProductBadges({
  badges,
  purchaseCount = 0,
}: {
  badges: ProductBadge[];
  purchaseCount?: number;
}) {
  return (
    <>
      {badges.map((badge) => (
        <span
          key={badge.key}
          className={clsx(
            "rounded px-2 py-1 text-[10px] font-black uppercase tracking-widest",
            badge.className
          )}
        >
          {badge.label}
        </span>
      ))}
      {purchaseCount > 0 && (
        <span className="flex items-center gap-1 rounded bg-emerald-50 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-700">
          <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
          Đã bán {purchaseCount}
        </span>
      )}
    </>
  );
}