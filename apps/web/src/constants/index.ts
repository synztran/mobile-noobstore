import { ShippingMethod } from "@/lib/shipping-method";
import { Flame, Motorbike, Store, Truck } from "lucide-react";

export const MAIL_DOMAIN = "noobassembly@gmail.com";
export const DELIVERY_OPTIONS = [
  {
    id: ShippingMethod.Standard,
    label: "Tiêu chuẩn",
    sublabel: "12-24 giờ xử lý",
    icon: Motorbike,
    price: 0,
    tag: null,
    isHidden: false,
  },
  {
    id: ShippingMethod.Express,
    label: "Hỏa tốc",
    sublabel: "2-4 giờ xử lý",
    icon: Flame,
    price: null as number | null, // resolved dynamically from fees
    tag: "NHANH",
    isHidden: false,
  },
  {
    id: ShippingMethod.Shipment,
    label: "Đơn vị vận chuyển",
    sublabel: "Giao bởi đơn vị vận chuyển",
    icon: Truck,
    price: null as number | null, // resolved dynamically from fees
    isHidden: true,
  },
  {
    id: ShippingMethod.Pickup,
    label: "Nhận tại cửa hàng",
    sublabel: "Đến cửa hàng nhận đơn",
    icon: Store,
    price: 0,
    tag: null,
    isHidden: false,
  },
];

export const mappingDisplayPrice = {
  0: "Miễn phí",
  null: "Cập nhật sau",
};
