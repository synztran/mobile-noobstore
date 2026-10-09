import { formatVND } from "@/lib/currency";
import clsx from "clsx";

interface Props {
  shippingCost: number;
  isCalculatingFee?: boolean;
  /** Fee is not known yet (inter-city courier) — render "Cập nhật sau". */
  shippingFeePending?: boolean;
  showFreeLabel?: boolean;
  shippingFeePendingClassName?: string;
  zeroClassName?: string;
}

function ShippingFeeLabel({
  shippingCost,
  isCalculatingFee = false,
  shippingFeePending = false,
  showFreeLabel = true,
  shippingFeePendingClassName = "text-xs text-emerald-600",
  zeroClassName = "text-on-surface-variant",
}: Props) {
  const isFree = shippingCost === 0;

  let colorClass: string;
  if (shippingFeePending) {
    colorClass = shippingFeePendingClassName;
  } else if (isCalculatingFee) {
    colorClass = "text-on-surface-variant";
  } else if (isFree && showFreeLabel) {
    colorClass = zeroClassName;
  } else {
    colorClass = "text-on-surface";
  }

  let content: React.ReactNode;
  if (shippingFeePending) {
    content = "Cập nhật sau";
  } else if (isCalculatingFee) {
    content = (
      <span className="inline-flex items-center gap-1">
        <span className="loading loading-spinner loading-xs" />
        Đang tính phí
      </span>
    );
  } else if (isFree && showFreeLabel) {
    content = "Miễn phí";
  } else {
    content = formatVND(shippingCost);
  }

  return <span className={clsx("font-bold", colorClass)}>{content}</span>;
}

export default ShippingFeeLabel;
