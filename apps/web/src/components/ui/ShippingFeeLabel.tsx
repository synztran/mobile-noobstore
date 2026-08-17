import { formatVND } from "@/lib/currency";
import clsx from "clsx";

interface Props {
  shippingCost: number;
  isCalculatingFee?: boolean;
  deliveryService?: boolean;
  showFreeLabel?: boolean;
  deliveryServiceClassName?: string;
  zeroClassName?: string;
}

function ShippingFeeLabel({
  shippingCost,
  isCalculatingFee = false,
  deliveryService = false,
  showFreeLabel = true,
  deliveryServiceClassName = "text-xs text-emerald-600",
  zeroClassName = "text-on-surface-variant",
}: Props) {
  const isFree = shippingCost === 0;

  let colorClass: string;
  if (deliveryService) {
    colorClass = deliveryServiceClassName;
  } else if (isCalculatingFee) {
    colorClass = "text-on-surface-variant";
  } else if (isFree && showFreeLabel) {
    colorClass = zeroClassName;
  } else {
    colorClass = "text-on-surface";
  }

  let content: React.ReactNode;
  if (deliveryService) {
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
