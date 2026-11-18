"use client";

import { Gift, Plus, Search, Trash2, Minus, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

type GiftRow = {
  id: string;
  product_id: string;
  gift_product_id: string;
  quantity: number;
  created_at: string;
  product_name: string;
  product_slug: string;
  product_thumbnail: string | null;
  gift_name: string;
  gift_slug: string;
  gift_thumbnail: string | null;
};

type ProductSearchResult = {
  id: string;
  name: string;
  slug: string;
  thumbnail: string | null;
  base_price: number;
  product_type: string;
};

type GiftEntry = {
  product: ProductSearchResult;
  quantity: number;
};

export default function GiftProductsPage() {
  const [gifts, setGifts] = useState<GiftRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [searchMain, setSearchMain] = useState("");
  const [searchGift, setSearchGift] = useState("");
  const [mainResults, setMainResults] = useState<ProductSearchResult[]>([]);
  const [giftResults, setGiftResults] = useState<ProductSearchResult[]>([]);
  const [selectedMain, setSelectedMain] = useState<ProductSearchResult | null>(null);
  const [giftEntries, setGiftEntries] = useState<GiftEntry[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [searching, setSearching] = useState({ main: false, gift: false });

  const mainTimer = useRef<ReturnType<typeof setTimeout>>();
  const giftTimer = useRef<ReturnType<typeof setTimeout>>();

  const fetchGifts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/gift-products");
      if (res.ok) setGifts(await res.json());
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGifts();
  }, [fetchGifts]);

  const searchProducts = async (
    q: string,
    setter: (r: ProductSearchResult[]) => void,
    setLoading: (v: boolean) => void
  ) => {
    if (!q.trim()) {
      setter([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/products/search?q=${encodeURIComponent(q.trim())}`);
      if (res.ok) setter(await res.json());
    } catch {
      setter([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchMain = (val: string) => {
    setSearchMain(val);
    clearTimeout(mainTimer.current);
    mainTimer.current = setTimeout(
      () => searchProducts(val, setMainResults, (v) => setSearching((s) => ({ ...s, main: v }))),
      300
    );
  };

  const handleSearchGift = (val: string) => {
    setSearchGift(val);
    clearTimeout(giftTimer.current);
    giftTimer.current = setTimeout(
      () => searchProducts(val, setGiftResults, (v) => setSearching((s) => ({ ...s, gift: v }))),
      300
    );
  };

  const addGiftEntry = (p: ProductSearchResult) => {
    if (giftEntries.some((e) => e.product.id === p.id)) return;
    setGiftEntries((prev) => [...prev, { product: p, quantity: 1 }]);
    setSearchGift("");
    setGiftResults([]);
  };

  const removeGiftEntry = (id: string) => {
    setGiftEntries((prev) => prev.filter((e) => e.product.id !== id));
  };

  const updateGiftQuantity = (id: string, delta: number) => {
    setGiftEntries((prev) =>
      prev.map((e) =>
        e.product.id === id
          ? { ...e, quantity: Math.max(1, e.quantity + delta) }
          : e
      )
    );
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Xóa quà tặng này?")) return;
    try {
      await fetch(`/api/gift-products?id=${id}`, { method: "DELETE" });
      fetchGifts();
    } catch {
      /* ignore */
    }
  };

  const handleSubmit = async () => {
    if (!selectedMain || giftEntries.length === 0) return;
    setSubmitting(true);
    let hasError = false;
    for (const entry of giftEntries) {
      try {
        const res = await fetch("/api/gift-products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            product_id: selectedMain.id,
            gift_product_id: entry.product.id,
            quantity: entry.quantity,
          }),
        });
        if (!res.ok) {
          const body = await res.json();
          alert(`Lỗi với "${entry.product.name}": ${body.error ?? "Thêm thất bại"}`);
          hasError = true;
          break;
        }
      } catch {
        alert(`Lỗi với "${entry.product.name}"`);
        hasError = true;
        break;
      }
    }
    if (!hasError) {
      setShowForm(false);
      setSelectedMain(null);
      setGiftEntries([]);
      setSearchMain("");
      setSearchGift("");
      setMainResults([]);
      setGiftResults([]);
      fetchGifts();
    }
    setSubmitting(false);
  };

  const resetForm = () => {
    setShowForm(false);
    setSelectedMain(null);
    setGiftEntries([]);
    setSearchMain("");
    setSearchGift("");
    setMainResults([]);
    setGiftResults([]);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-heading text-xl font-bold">Quà tặng kèm sản phẩm</h1>
          <p className="text-muted text-sm">
            Cấu hình quà tặng đi kèm khi mua sản phẩm
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-700"
        >
          <Plus size={16} />
          Thêm quà tặng
        </button>
      </div>

      {showForm && (
        <div className="card-bg rounded-xl border table-border p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-body">
                Sản phẩm chính
              </label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  value={searchMain}
                  onChange={(e) => handleSearchMain(e.target.value)}
                  placeholder="Tìm sản phẩm..."
                  className="input-base w-full rounded-lg py-2 pl-8 pr-3 text-sm outline-none focus:border-violet-500"
                />
              </div>
              {searching.main && (
                <div className="mt-1 text-xs text-muted">Đang tìm...</div>
              )}
              {mainResults.length > 0 && !selectedMain && (
                <div className="card-bg mt-1 max-h-40 overflow-y-auto rounded-lg border table-border shadow-sm">
                  {mainResults.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSelectedMain(p);
                        setSearchMain(p.name);
                        setMainResults([]);
                      }}
                      className="table-row-hover flex w-full items-center gap-2 px-3 py-2 text-left text-sm"
                    >
                      <div className="h-6 w-6 flex-shrink-0 overflow-hidden rounded bg-slate-100 ">
                        {p.thumbnail && (
                          <Image src={p.thumbnail} alt="" width={24} height={24} className="object-cover" />
                        )}
                      </div>
                      <span className="truncate text-heading">{p.name}</span>
                    </button>
                  ))}
                </div>
              )}
              {selectedMain && (
                <div className="mt-1 flex items-center gap-2 rounded-lg bg-violet-50 px-3 py-2 text-sm ">
                  <span className="flex-1 truncate font-medium text-violet-700 ">{selectedMain.name}</span>
                  <button
                    onClick={() => {
                      setSelectedMain(null);
                      setSearchMain("");
                    }}
                    className="text-xs text-muted hover:text-red-500"
                  >
                    Xoá
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-body">
                Sản phẩm quà tặng
              </label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  value={searchGift}
                  onChange={(e) => handleSearchGift(e.target.value)}
                  placeholder="Tìm sản phẩm quà tặng..."
                  className="input-base w-full rounded-lg py-2 pl-8 pr-3 text-sm outline-none focus:border-violet-500"
                />
              </div>
              {searching.gift && (
                <div className="mt-1 text-xs text-muted">Đang tìm...</div>
              )}
              {giftResults.length > 0 && (
                <div className="card-bg mt-1 max-h-40 overflow-y-auto rounded-lg border table-border shadow-sm">
                  {giftResults.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => addGiftEntry(p)}
                      className="table-row-hover flex w-full items-center gap-2 px-3 py-2 text-left text-sm"
                    >
                      <div className="h-6 w-6 flex-shrink-0 overflow-hidden rounded bg-slate-100 ">
                        {p.thumbnail && (
                          <Image src={p.thumbnail} alt="" width={24} height={24} className="object-cover" />
                        )}
                      </div>
                      <span className="truncate text-heading">{p.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {giftEntries.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold text-body">Danh sách quà tặng</p>
              <div className="space-y-2">
                {giftEntries.map((entry) => (
                  <div
                    key={entry.product.id}
                    className="flex items-center gap-3 rounded-lg border table-border px-3 py-2"
                  >
                    <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded bg-slate-100 ">
                      {entry.product.thumbnail && (
                        <Image src={entry.product.thumbnail} alt="" width={32} height={32} className="object-cover" />
                      )}
                    </div>
                    <span className="flex-1 truncate text-sm font-medium text-heading">
                      {entry.product.name}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateGiftQuantity(entry.product.id, -1)}
                        className="rounded p-0.5 text-muted hover:bg-slate-100 "
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-6 text-center text-sm font-semibold text-heading">
                        {entry.quantity}
                      </span>
                      <button
                        onClick={() => updateGiftQuantity(entry.product.id, 1)}
                        className="rounded p-0.5 text-muted hover:bg-slate-100 "
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <button
                      onClick={() => removeGiftEntry(entry.product.id)}
                      className="rounded p-1 text-muted hover:text-red-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              onClick={resetForm}
              className="rounded-lg border table-border px-4 py-2 text-sm font-medium text-body transition-colors hover:bg-slate-50 "
            >
              Huỷ
            </button>
            <button
              onClick={handleSubmit}
              disabled={!selectedMain || giftEntries.length === 0 || submitting}
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-700 disabled:opacity-50"
            >
              {submitting ? "Đang thêm..." : `Lưu (${giftEntries.length} món)`}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-100 " />
          ))}
        </div>
      ) : gifts.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-muted">
          <Gift size={40} strokeWidth={1} />
          <p className="text-sm">Chưa có quà tặng nào được cấu hình</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border table-border card-bg">
          <table className="w-full text-sm">
            <thead>
              <tr className="thead-bg border-b table-border text-left text-xs font-semibold uppercase text-muted">
                <th className="px-4 py-3">Sản phẩm chính</th>
                <th className="px-4 py-3">Quà tặng</th>
                <th className="px-4 py-3">Ngày tạo</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="table-divide">
              {Array.from(
                gifts
                  .reduce((acc, g) => {
                    const existing = acc.get(g.product_id);
                    if (existing) {
                      existing.gifts.push(g);
                    } else {
                      acc.set(g.product_id, {
                        product_id: g.product_id,
                        product_name: g.product_name,
                        product_slug: g.product_slug,
                        product_thumbnail: g.product_thumbnail,
                        gifts: [g],
                      });
                    }
                    return acc;
                  }, new Map<string, { product_id: string; product_name: string; product_slug: string; product_thumbnail: string | null; gifts: GiftRow[] }>())
                  .values()
              ).map((group) => (
                <tr key={group.product_id} className="table-row-hover">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded bg-slate-100 ">
                        {group.product_thumbnail && (
                          <Image src={group.product_thumbnail} alt="" width={32} height={32} className="object-cover" />
                        )}
                      </div>
                      <span className="font-medium text-heading">{group.product_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-1.5">
                      {group.gifts.map((g) => (
                        <div key={g.id} className="flex items-center gap-2">
                          <div className="h-6 w-6 flex-shrink-0 overflow-hidden rounded bg-slate-100 ">
                            {g.gift_thumbnail && (
                              <Image src={g.gift_thumbnail} alt="" width={24} height={24} className="object-cover" />
                            )}
                          </div>
                          <span className="text-sm text-heading">{g.gift_name}</span>
                          <span className="text-xs text-muted">x{g.quantity}</span>
                          <button
                            onClick={() => handleDelete(g.id)}
                            className="rounded p-0.5 text-muted transition-colors hover:text-red-500"
                            title="Xóa quà tặng này"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {new Date(
                      Math.min(...group.gifts.map((g) => new Date(g.created_at).getTime()))
                    ).toLocaleDateString("vi-VN")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => {
                        if (confirm(`Xóa tất cả quà tặng của "${group.product_name}"?`)) {
                          Promise.all(group.gifts.map((g) => fetch(`/api/gift-products?id=${g.id}`, { method: "DELETE" })))
                            .then(() => fetchGifts());
                        }
                      }}
                      className="rounded-lg p-1.5 text-muted transition-colors hover:bg-red-50 hover:text-red-500 "
                      title="Xóa tất cả"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
