import { Truck } from "lucide-react";

interface AddressShape {
	full_name?: string | null;
	phone_number?: string | null;
	address_line?: string | null;
	street_address?: string | null;
	apartment?: string | null;
	ward_district?: string | null;
	city?: string | null;
	postal_code?: string | null;
}

interface Props {
	deliveryAddress: AddressShape | null;
	fallbackAddress: AddressShape | null;
	shippingMethodName: string | null;
	expectedDeliveryAt: string | null;
}

function formatDateTime(value: string | null): string {
	if (!value) return "—";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return value;
	return date.toLocaleString("vi-VN");
}

function buildAddressLine(address: AddressShape): string {
	return [
		address.street_address ?? address.address_line,
		address.apartment,
		address.ward_district,
		address.city,
		address.postal_code,
	]
		.filter(Boolean)
		.join(", ");
}

export default function OrderShippingDetails({
	deliveryAddress,
	fallbackAddress,
	shippingMethodName,
	expectedDeliveryAt,
}: Props) {
	const displayAddress = deliveryAddress ?? fallbackAddress;
	const addressLine = displayAddress ? buildAddressLine(displayAddress) : "";
	const hasDetails =
		!!displayAddress || !!shippingMethodName || !!expectedDeliveryAt;

	if (!hasDetails) return null;

	return (
		<div className="border border-slate-200 rounded-lg px-4 py-3">
			<h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
				<Truck className="w-4 h-4" />
				Shipping Details
			</h3>

			{displayAddress && (
				<>
					<p className="text-sm text-slate-700 font-medium">
						{displayAddress.full_name ?? "—"} -{" "}
						{displayAddress.phone_number ?? "—"}
					</p>
					{addressLine && (
						<p className="text-sm text-slate-500 mt-0.5">
							{addressLine}
						</p>
					)}
					{displayAddress.phone_number && (
						<p className="text-sm text-slate-500 mt-0.5">
							{displayAddress.phone_number}
						</p>
					)}
				</>
			)}

			{shippingMethodName && (
				<p className="text-sm text-slate-600 mt-2">
					<span className="font-medium text-slate-700">
						Shipping Method:
					</span>{" "}
					{shippingMethodName}
				</p>
			)}

			{expectedDeliveryAt && (
				<p className="text-sm text-slate-600 mt-1">
					<span className="font-medium text-slate-700">
						Expected Delivery:
					</span>{" "}
					{formatDateTime(expectedDeliveryAt)}
				</p>
			)}
		</div>
	);
}
