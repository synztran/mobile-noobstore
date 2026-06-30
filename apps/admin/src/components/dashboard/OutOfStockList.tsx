import Link from "next/link";
import type { OutOfStockItem } from "@/lib/analytics-server";

const TYPE_COLORS: Record<string, string> = {
  standard: "bg-blue-100 text-blue-700",
  kit: "bg-purple-100 text-purple-700",
  component: "bg-amber-100 text-amber-700",
};

const TYPE_LABELS: Record<string, string> = {
  standard: "Standard",
  kit: "Kit",
  component: "Component",
};

interface Props {
  items: OutOfStockItem[];
}

export default function OutOfStockList({ items }: Props) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-slate-900">
          Sản phẩm hết hàng
        </p>
        <p className="mt-3 text-sm text-slate-500">
          Không có sản phẩm nào hết hàng.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-4">
        <p className="text-sm font-semibold text-slate-900">
          Sản phẩm hết hàng
        </p>
        <p className="mt-0.5 text-xs text-slate-500">
          {items.length} sản phẩm cần nhập thêm
        </p>
      </div>
      <div className="divide-y divide-slate-100">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/products/${item.id}`}
            className="flex items-center gap-3 px-6 py-3 transition-colors hover:bg-slate-50"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
              {item.thumbnail ? (
                <img
                  src={item.thumbnail}
                  alt={item.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-xs text-slate-400">N/A</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">
                {item.name}
              </p>
              <span
                className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${TYPE_COLORS[item.productType] || "bg-slate-100 text-slate-600"}`}
              >
                {TYPE_LABELS[item.productType] || item.productType}
              </span>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-sm font-bold text-red-600">0</p>
              <p className="text-[10px] text-slate-400">tồn kho</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
