import { memo } from "react";

const DiscountBadge = memo(function DiscountBadge({
  discountPercent,
}: {
  discountPercent: number;
}) {
  if (discountPercent <= 0) return null;
  return (
    <div className="absolute left-2 top-2 z-10 rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-black tracking-wide text-white">
      -{discountPercent}%
    </div>
  );
});

export default DiscountBadge;
