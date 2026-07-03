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
  const parts = [
    address.street_address ?? address.address_line,
    address.apartment,
  ];
  // Prefer explicit ward + district fields when available
  if (address.ward) parts.push(address.ward);
  if (address.district) parts.push(address.district);
  parts.push(address.city, address.postal_code);
  return parts.filter(Boolean).join(", ");
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
    <div className="relative">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
        <Truck className="h-4 w-4" />
        Shipping Details
      </div>

      <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
        {displayAddress && (
          <>
            <p className="text-sm font-medium text-slate-700">
              {displayAddress.full_name ?? "—"} -{" "}
              {displayAddress.phone_number ?? "—"}
            </p>
            {addressLine && (
              <p className="mt-0.5 text-sm text-slate-500">{addressLine}</p>
            )}
            {displayAddress.phone_number && (
              <p className="mt-0.5 text-sm text-slate-500">
                {displayAddress.phone_number}
              </p>
            )}
          </>
        )}

        {displayAddress && (
          <>
            <p className="text-sm font-medium text-slate-700">
              {displayAddress.full_name ?? "—"} -{" "}
              {displayAddress.phone_number ?? "—"}
            </p>
            {addressLine && (
              <p className="mt-0.5 text-sm text-slate-500">{addressLine}</p>
            )}
            {displayAddress.phone_number && (
              <p className="mt-0.5 text-sm text-slate-500">
                {displayAddress.phone_number}
              </p>
            )}
          </>
        )}

        {shippingMethodName && (
          <p className="mt-2 text-sm text-slate-600">
            <span className="font-medium text-slate-700">Shipping Method:</span>{" "}
            {shippingMethodName}
          </p>
        )}

        {expectedDeliveryAt && (
          <p className="mt-1 text-sm text-slate-600">
            <span className="font-medium text-slate-700">
              Expected Delivery:
            </span>{" "}
            {formatDateTime(expectedDeliveryAt)}
          </p>
        )}
      </div>
    </div>
  );
}
