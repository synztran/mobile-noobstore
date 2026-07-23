import { Package, Gift } from "lucide-react";
import Image from "next/image";

interface KitComponent {
  id: string;
  component_group: string;
  variant_name: string;
  price_adjustment: number | null;
  product_variant_id: string;
  thumbnail: string | null;
  is_pre_order: boolean;
  pre_order_config: unknown;
}

interface GiftInfo {
  gift_name: string;
  gift_thumbnail: string | null;
  quantity: number;
}

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  thumbnail: string | null;
  order_item_components: KitComponent[];
  gifts?: GiftInfo[];
}

interface Props {
  items: OrderItem[];
}

function KitComponentBadge({ c }: { c: KitComponent }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-indigo-50 px-2.5 py-1 text-sm text-indigo-700">
      <span className="text-indigo-400">{c.component_group}:</span>
      {c.variant_name}
      {c.price_adjustment !== null && c.price_adjustment !== 0 && (
        <span
          className={c.price_adjustment > 0 ? "text-green-600" : "text-red-500"}
        >
          {c.price_adjustment > 0 ? "+" : ""}
          {c.price_adjustment.toLocaleString("vi-VN")}₫
        </span>
      )}
    </span>
  );
}

export default function OrderItemsList({ items }: Props) {
  if (items.length === 0) return null;

  const allGifts = items.reduce<GiftInfo[]>((acc, item) => {
    for (const g of item.gifts ?? []) {
      const existing = acc.find((x) => x.gift_name === g.gift_name);
      if (existing) {
        existing.quantity += g.quantity;
      } else {
        acc.push({ ...g });
      }
    }
    return acc;
  }, []);

  return (
    <div className="relative clear-both">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
        <Package className="h-4 w-4" />
        Products ({items.length})
      </div>
      <div className="space-y-2">
        {items.map((item) => {
          const hasPreOrderComponent = item.order_item_components.some(
            (c) => c.is_pre_order
          );

          return (
            <div
              key={item.id}
              className="space-y-2 overflow-hidden rounded-lg border border-slate-200 p-4"
            >
              <div className="flex items-center justify-center gap-3">
                <div className="relative h-24 w-24 rounded-lg bg-slate-100">
                  {item.thumbnail ? (
                    <Image
                      src={item.thumbnail}
                      alt={item.product_name}
                      fill
                      className="rounded-lg object-cover mix-blend-darken"
                      sizes="64px"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded bg-slate-200 text-slate-300">
                      <Package className="h-5 w-5" />
                    </div>
                  )}
                  <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-xs font-medium text-slate-600">
                    {item.quantity}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="line-clamp-2 flex items-center gap-2 text-sm font-medium text-slate-900">
                    {item.product_name}
                    {hasPreOrderComponent && (
                      <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-amber-700">
                        Pre-order
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500">
                    {item.unit_price.toLocaleString("vi-VN")}₫
                  </div>
                  <div className="text-right text-sm font-semibold text-slate-800">
                    Tổng tiền:{" "}
                    <span className="font-bold text-secondary">
                      {(item.unit_price * item.quantity).toLocaleString(
                        "vi-VN"
                      )}
                      ₫
                    </span>
                  </div>
                </div>
              </div>
              {item.order_item_components.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {item.order_item_components.map((c) => (
                    <KitComponentBadge key={c.id} c={c} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {allGifts.length > 0 && (
        <div className="mt-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Gift className="h-4 w-4" />
            Gifts ({allGifts.length})
          </div>
          <div className="grid grid-cols-2 gap-4 space-y-2">
            {allGifts.map((g, id) => (
              <div
                key={g.gift_name}
                className="flex items-center gap-3 overflow-hidden rounded-lg border border-green-400 bg-green-50/50 px-4 py-3"
              >
                <div className="relative h-20 w-20 rounded-lg bg-rose-100 text-green-500">
                  <Image
                    src={g.gift_thumbnail ?? ""}
                    alt={`gift_${id}`}
                    className="object-cover"
                    fill
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-xs font-medium text-green-900">
                    {g.gift_name}
                  </p>
                  <span className="shrink-0 text-xs text-slate-500">
                    Số lượng: <strong>{g.quantity}</strong>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
