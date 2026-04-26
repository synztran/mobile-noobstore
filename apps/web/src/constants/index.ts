import { Flame, Motorbike, Truck } from "lucide-react";

export const DELIVERY_OPTIONS = [
	{
		id: "standard" as const,
		label: "Tiêu chuẩn",
		sublabel: "12-24 giờ xử lý",
		icon: Motorbike,
		price: 0,
		tag: null,
		isHidden: false,
	},
	{
		id: "express" as const,
		label: "Hỏa tốc",
		sublabel: "2-4 giờ xử lý",
		icon: Flame,
		price: null as number | null, // resolved dynamically from fees
		tag: "NHANH",
		isHidden: false,
	},
	{
		id: "shipment" as const,
		label: "Đơn vị vận chuyển",
		sublabel: "Giao bởi đơn vị vận chuyển",
		icon: Truck,
		price: null as number | null, // resolved dynamically from fees
		isHidden: true,
	},
];

export const mappingDisplayPrice = {
	0: "Miễn phí",
	null: "Cập nhật sau",
};
