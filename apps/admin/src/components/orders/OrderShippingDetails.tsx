import { Truck } from "lucide-react";

interface AddressShape {
  full_name?: string | null;
  phone_number?: string | null;
  address_line?: string | null;
  street_address?: string | null;
  apartment?: string | null;
  district?: string | null;
  ward?: string | null;
  district_code?: string | null;
  ward_code?: string | null;
  city?: string | null;
  postal_code?: string | null;
  notes?: string | null;
}

interface Props {
  deliveryAddress: AddressShape | null;
  fallbackAddress: AddressShape | null;
  shippingMethodName: string | null;
  expectedDeliveryAt: string | null;
  pickupAt?: string | null;
}

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("vi-VN");
}

function buildAddressLine(address: AddressShape): string {
  const parts = [
    address.apartment,
    address.street_address ?? address.address_line,
  ];
  // Prefer explicit ward + district fields when available
  // if (address.ward) parts.push(address.ward);
  // if (address.district) parts.push(address.district);
  parts.push(address.city, address.postal_code);
  return parts.filter(Boolean).join(", ");
}

export default function OrderShippingDetails({
  deliveryAddress,
  fallbackAddress,
  shippingMethodName,
  expectedDeliveryAt,
  pickupAt,
}: Props) {
  const displayAddress = deliveryAddress ?? fallbackAddress;
  const addressLine = displayAddress ? buildAddressLine(displayAddress) : "";
  const hasDetails =
    !!displayAddress ||
    !!shippingMethodName ||
    !!expectedDeliveryAt ||
    !!pickupAt;

  if (!hasDetails) return null;

  return (
    <div className="relative">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
        <Truck className="h-4 w-4" />
        Shipping Details
      </div>

      <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
        {shippingMethodName && (
          <p className="text-sm text-slate-600">
            <span className="font-medium text-slate-700">Shipping Method:</span>{" "}
            {shippingMethodName}
          </p>
        )}

        {pickupAt && (
          <p className="mt-1 text-sm text-slate-600">
            <span className="font-medium text-slate-700">Pickup At:</span>{" "}
            {formatDateTime(pickupAt)}
          </p>
        )}

        {displayAddress && (
          <div className="text-sm">
            <span className="font-medium text-slate-700">Pickup info:</span>{" "}
            <p className="ml-2 text-sm text-slate-700">
              {displayAddress.full_name ?? "—"} -{" "}
              {displayAddress.phone_number ?? "—"}
            </p>
            {addressLine && (
              <p className="ml-2 mt-0.5 text-sm text-slate-500">
                {addressLine}
              </p>
            )}
          </div>
        )}

        {expectedDeliveryAt && (
          <p className="mt-1 text-sm text-slate-600">
            <span className="font-medium text-slate-700">
              Expected Delivery:
            </span>{" "}
            {formatDateTime(expectedDeliveryAt)}
          </p>
        )}
        {typeof displayAddress === "object" && displayAddress?.notes ? (
          <p className="mt-1 text-sm text-slate-600">
            <span className="font-medium text-slate-700">Notes:</span>{" "}
            {displayAddress?.notes || ""}
          </p>
        ) : null}
      </div>
    </div>
  );
}
