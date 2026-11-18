"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { formatVND } from "@/lib/currency";
import { Plus, Trash2, X, Sparkles } from "lucide-react";
import AddAddonForm, { type AddonItem } from "./AddAddonForm";

type Props = {
  product: {
    id: string;
    name: string;
    thumbnail: string | null;
  };
};

export default function ProductAddonsModal({ product }: Props) {
  const [open, setOpen] = useState(false);
  const [addons, setAddons] = useState<AddonItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const fetchAddons = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/products/${product.id}/addons`);
      if (!res.ok) throw new Error("Failed to load addons");
      const data = await res.json();
      setAddons(data);
    } catch {
      setError("Không thể tải danh sách sản phẩm mua kèm");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchAddons();
      setShowAddForm(false);
    }
  }, [open, product.id]);

  const handleToggleActive = async (addon: AddonItem) => {
    try {
      const res = await fetch(`/api/products/${product.id}/addons/${addon.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !addon.is_active }),
      });
      if (!res.ok) throw new Error("Cập nhật thất bại");
      setAddons((prev) =>
        prev.map((a) => (a.id === addon.id ? { ...a, is_active: !a.is_active } : a))
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Lỗi cập nhật");
    }
  };

  const handleDelete = async (addonId: string) => {
    if (!window.confirm("Xóa sản phẩm mua kèm này?")) return;
    try {
      const res = await fetch(`/api/products/${product.id}/addons/${addonId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Xóa thất bại");
      setAddons((prev) => prev.filter((a) => a.id !== addonId));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Lỗi xóa");
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
      >
        <Sparkles className="h-3.5 w-3.5" />
        Mua kèm ({addons.length > 0 ? addons.length : "Deals"})
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-100">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Sản phẩm mua kèm giá tốt
                  </h3>
                  <p className="text-xs text-slate-500">
                    Cấu hình Add-on deals cho: <span className="font-semibold text-slate-700">{product.name}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {error && (
                <div className="rounded-xl bg-red-50 p-3 text-xs text-red-600">
                  {error}
                </div>
              )}

              {/* Add form or Add button */}
              {showAddForm ? (
                <AddAddonForm
                  mainProductId={product.id}
                  disabledProductIds={addons.map((a) => a.addon_product_id)}
                  onSuccess={() => {
                    setShowAddForm(false);
                    fetchAddons();
                  }}
                  onCancel={() => setShowAddForm(false)}
                />
              ) : (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700"
                  >
                    <Plus size={15} />
                    Thêm sản phẩm mua kèm
                  </button>
                </div>
              )}

              {/* Addons List */}
              {loading ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  Đang tải danh sách addons...
                </div>
              ) : addons.length === 0 && !showAddForm ? (
                <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center">
                  <p className="text-sm font-medium text-slate-700">Chưa cấu hình sản phẩm mua kèm nào</p>
                  <p className="mt-1 text-xs text-slate-400">
                    Storefront sẽ tự động dùng fallback (đơn mua cùng / cùng thương hiệu).
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
                  {addons.map((addon) => {
                    const originalPrice = addon.addon?.base_price ?? 0;
                    const discount =
                      addon.discount_type === "percentage"
                        ? Math.round((originalPrice * addon.discount_value) / 100)
                        : addon.discount_value;
                    const dealPrice = Math.max(0, originalPrice - discount);

                    return (
                      <div
                        key={addon.id}
                        className="flex items-center justify-between p-3.5 transition hover:bg-slate-50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100 border border-slate-200">
                            {addon.addon?.thumbnail ? (
                              <Image
                                src={addon.addon.thumbnail}
                                alt={addon.addon.name}
                                fill
                                sizes="48px"
                                className="object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-xs">
                                🎁
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-800">
                                {addon.addon?.name ?? addon.addon_product_id}
                              </span>
                              <span
                                className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                  addon.is_active
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-slate-100 text-slate-500"
                                }`}
                              >
                                {addon.is_active ? "Đang bật" : "Tạm ẩn"}
                              </span>
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-xs">
                              <span className="font-bold text-indigo-600">
                                {formatVND(dealPrice)}
                              </span>
                              <span className="text-[11px] text-slate-400 line-through">
                                {formatVND(originalPrice)}
                              </span>
                              <span className="rounded bg-rose-50 px-1 py-0.2 text-[10px] font-bold text-rose-600">
                                {addon.discount_type === "percentage"
                                  ? `-${addon.discount_value}%`
                                  : `-${formatVND(addon.discount_value)}`}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleActive(addon)}
                            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                              addon.is_active
                                ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                            }`}
                          >
                            {addon.is_active ? "Ẩn" : "Bật"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(addon.id)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
                            title="Xóa deal"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-200 px-6 py-3 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl bg-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-300"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
