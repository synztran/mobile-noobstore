"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Search, Star, Trash2, X } from "lucide-react";

interface HomeTestimonial {
  id: string;
  name: string | null;
  rating: number;
  text: string;
  product: string | null;
  date: string;
  image_url: string | null;
  is_active: boolean;
  order: number;
  created_at: string | null;
  updated_at: string | null;
}

interface FormValues {
  name: string;
  product: string;
  rating: string;
  text: string;
  date: string;
  image_url: string;
  is_active: boolean;
  order: string;
}

const emptyForm = (): FormValues => ({
  name: "",
  product: "",
  rating: "5",
  text: "",
  date: new Date().toLocaleDateString("vi-VN"),
  image_url: "",
  is_active: true,
  order: "0",
});

function toForm(item: HomeTestimonial): FormValues {
  return {
    name: item.name ?? "",
    product: item.product ?? "",
    rating: String(item.rating),
    text: item.text,
    date: item.date,
    image_url: item.image_url ?? "",
    is_active: item.is_active,
    order: String(item.order),
  };
}

export function HomeTestimonialsManager() {
  const [items, setItems] = useState<HomeTestimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormValues>(emptyForm);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/testimonials", {
        cache: "no-store",
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.error ?? "Không thể tải review");
      setItems(Array.isArray(payload) ? payload : []);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Không thể tải review"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setError("");
    setFormOpen(true);
  };

  const openEdit = (item: HomeTestimonial) => {
    setEditingId(item.id);
    setForm(toForm(item));
    setError("");
    setFormOpen(true);
  };

  const updateField = <K extends keyof FormValues>(
    key: K,
    value: FormValues[K]
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    const payload = {
      name: form.name.trim() || null,
      product: form.product.trim() || null,
      rating: Number(form.rating),
      text: form.text,
      date: form.date,
      image_url: form.image_url.trim() || null,
      is_active: form.is_active,
      order: Number(form.order),
    };
    try {
      const response = await fetch(
        editingId
          ? `/api/testimonials/${encodeURIComponent(editingId)}`
          : "/api/testimonials",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Không thể lưu review");
      setFormOpen(false);
      setNotice(editingId ? "Đã cập nhật review." : "Đã thêm review.");
      await load();
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Không thể lưu review"
      );
    } finally {
      setSaving(false);
    }
  };

  const remove = async (item: HomeTestimonial) => {
    if (
      !window.confirm(
        `Xóa review của ${item.name || "Khách hàng NoobStore"}? Review sẽ bị gỡ khỏi Home.`
      )
    ) {
      return;
    }
    setError("");
    setNotice("");
    try {
      const response = await fetch(
        `/api/testimonials/${encodeURIComponent(item.id)}`,
        {
          method: "DELETE",
        }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Không thể xóa review");
      setNotice("Đã xóa review.");
      await load();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Không thể xóa review"
      );
    }
  };

  const toggleActive = async (item: HomeTestimonial) => {
    setError("");
    setNotice("");
    try {
      const response = await fetch(
        `/api/testimonials/${encodeURIComponent(item.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_active: !item.is_active }),
        }
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error ?? "Không thể đổi trạng thái");
      setNotice(
        item.is_active ? "Review đã ẩn khỏi Home." : "Review đã hiện trên Home."
      );
      await load();
    } catch (toggleError) {
      setError(
        toggleError instanceof Error
          ? toggleError.message
          : "Không thể đổi trạng thái"
      );
    }
  };

  const normalizedSearch = search.trim().toLocaleLowerCase("vi");
  const filteredItems = normalizedSearch
    ? items.filter((item) =>
        [item.name, item.product, item.text]
          .filter((value): value is string => Boolean(value))
          .some((value) =>
            value.toLocaleLowerCase("vi").includes(normalizedSearch)
          )
      )
    : items;
  const pageCount = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageItems = filteredItems.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );
  const rangeStart = filteredItems.length
    ? (currentPage - 1) * pageSize + 1
    : 0;
  const rangeEnd = Math.min(currentPage * pageSize, filteredItems.length);

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950 sm:flex-row sm:items-center">
        <p>
          Rating và số lượng hiển thị được tính từ review đang bật trên website,
          không tự đồng bộ tổng số trên Google Maps.
        </p>
        <button
          className="btn btn-primary btn-sm shrink-0"
          onClick={openCreate}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Thêm review
        </button>
      </div>

      {error && (
        <div role="alert" className="alert alert-error">
          <span>{error}</span>
        </div>
      )}
      {notice && (
        <div role="status" className="alert alert-success">
          <span>{notice}</span>
        </div>
      )}

      {!loading && items.length > 0 && (
        <label className="input input-bordered flex max-w-xl items-center gap-2">
          <Search
            className="h-4 w-4 shrink-0 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="search"
            className="grow"
            placeholder="Tìm theo tên, sản phẩm hoặc nội dung review"
            aria-label="Tìm review trang chủ"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
          {search && (
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              onClick={() => {
                setSearch("");
                setPage(1);
              }}
              aria-label="Xóa tìm kiếm"
            >
              Xóa
            </button>
          )}
        </label>
      )}

      {loading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {[0, 1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-36 animate-pulse rounded-xl bg-slate-100"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
          Chưa có review trang chủ. Thêm review đầu tiên để hiển thị trên Home.
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
          Không tìm thấy review phù hợp với “{search.trim()}”.
        </div>
      ) : (
        <>
          <p className="text-sm text-slate-600" aria-live="polite">
            Hiển thị {rangeStart}–{rangeEnd} trên {filteredItems.length} review
            {normalizedSearch ? " khớp tìm kiếm" : ""}
          </p>
          <div className="grid gap-3 xl:grid-cols-2">
            {pageItems.map((item) => (
              <article
                key={item.id}
                className={`flex gap-4 rounded-xl border bg-white p-4 shadow-sm ${item.is_active ? "border-slate-200" : "border-dashed border-slate-300 opacity-70"}`}
              >
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt=""
                    loading="lazy"
                    className="h-24 w-24 shrink-0 rounded-lg border border-slate-200 object-cover"
                  />
                ) : (
                  <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-2xl font-bold text-slate-400">
                    {(item.name || "K").charAt(0)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-bold text-slate-900">
                        {item.name || "Khách hàng NoobStore"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {item.product || "Không gắn sản phẩm"} · {item.date} ·
                        thứ tự {item.order}
                      </p>
                    </div>
                    <span className="badge badge-warning gap-1">
                      <Star
                        className="h-3 w-3 fill-current"
                        aria-hidden="true"
                      />
                      {item.rating}/5
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm text-slate-700">
                    {item.text}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      className={`btn btn-xs ${item.is_active ? "btn-success" : "btn-ghost"}`}
                      onClick={() => void toggleActive(item)}
                    >
                      {item.is_active ? "Đang hiện trên Home" : "Đang ẩn"}
                    </button>
                    <button
                      className="btn btn-outline btn-xs"
                      onClick={() => openEdit(item)}
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                      Sửa
                    </button>
                    <button
                      className="btn btn-outline btn-error btn-xs"
                      onClick={() => void remove(item)}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      Xóa
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
          {pageCount > 1 && (
            <nav
              aria-label="Phân trang đánh giá trang chủ"
              className="flex items-center justify-between gap-3 border-t border-slate-200 pt-4"
            >
              <span className="text-sm text-slate-500">
                Trang {currentPage} / {pageCount} · 20 review/trang
              </span>
              <div className="join">
                <button
                  className="btn join-item btn-sm"
                  disabled={currentPage === 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  Trước
                </button>
                <button
                  className="btn join-item btn-sm"
                  disabled={currentPage === pageCount}
                  onClick={() =>
                    setPage((current) => Math.min(pageCount, current + 1))
                  }
                >
                  Sau
                </button>
              </div>
            </nav>
          )}
        </>
      )}

      {formOpen && (
        <div className="modal modal-open z-[100]">
          <div className="modal-box max-h-[90vh] max-w-2xl overflow-y-auto">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold">
                {editingId ? "Sửa review trang chủ" : "Thêm review trang chủ"}
              </h2>
              <button
                type="button"
                className="btn btn-circle btn-ghost btn-sm"
                aria-label="Đóng biểu mẫu"
                onClick={() => setFormOpen(false)}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <form className="space-y-4" onSubmit={save}>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="form-control">
                  <span className="label-text mb-1">
                    Tên người đánh giá (tùy chọn)
                  </span>
                  <input
                    className="input input-bordered"
                    maxLength={120}
                    value={form.name}
                    onChange={(event) =>
                      updateField("name", event.target.value)
                    }
                  />
                </label>
                <label className="form-control">
                  <span className="label-text mb-1">Sản phẩm (tùy chọn)</span>
                  <input
                    className="input input-bordered"
                    maxLength={160}
                    value={form.product}
                    onChange={(event) =>
                      updateField("product", event.target.value)
                    }
                  />
                </label>
                <label className="form-control">
                  <span className="label-text mb-1">Rating</span>
                  <select
                    className="select select-bordered"
                    value={form.rating}
                    onChange={(event) =>
                      updateField("rating", event.target.value)
                    }
                  >
                    {[5, 4, 3, 2, 1].map((rating) => (
                      <option key={rating} value={rating}>
                        {rating} / 5
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-control">
                  <span className="label-text mb-1">Ngày đánh giá</span>
                  <input
                    className="input input-bordered"
                    type="text"
                    maxLength={40}
                    placeholder="DD/MM/YYYY"
                    required
                    value={form.date}
                    onChange={(event) =>
                      updateField("date", event.target.value)
                    }
                  />
                </label>
                <label className="form-control sm:col-span-2">
                  <span className="label-text mb-1">
                    URL ảnh review (tùy chọn)
                  </span>
                  <input
                    className="input input-bordered"
                    type="url"
                    placeholder="https://..."
                    value={form.image_url}
                    onChange={(event) =>
                      updateField("image_url", event.target.value)
                    }
                  />
                </label>
                {form.image_url && (
                  <div className="sm:col-span-2">
                    <img
                      src={form.image_url}
                      alt="Xem trước ảnh review"
                      className="h-32 max-w-full rounded-lg border border-slate-200 object-cover"
                    />
                  </div>
                )}
                <label className="form-control sm:col-span-2">
                  <span className="label-text mb-1">Nội dung review</span>
                  <textarea
                    className="textarea textarea-bordered min-h-28"
                    maxLength={5000}
                    required
                    value={form.text}
                    onChange={(event) =>
                      updateField("text", event.target.value)
                    }
                  />
                </label>
                <label className="form-control">
                  <span className="label-text mb-1">Thứ tự hiển thị</span>
                  <input
                    className="input input-bordered"
                    type="number"
                    min={0}
                    step={1}
                    required
                    value={form.order}
                    onChange={(event) =>
                      updateField("order", event.target.value)
                    }
                  />
                </label>
                <label className="label cursor-pointer justify-start gap-3 sm:mt-5">
                  <input
                    className="toggle toggle-primary"
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(event) =>
                      updateField("is_active", event.target.checked)
                    }
                  />
                  <span className="label-text">Hiển thị trên Home</span>
                </label>
              </div>
              {error && (
                <div role="alert" className="alert alert-error">
                  <span>{error}</span>
                </div>
              )}
              <div className="modal-action">
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={saving}
                  onClick={() => setFormOpen(false)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving ? (
                    <span className="loading loading-spinner loading-sm" />
                  ) : editingId ? (
                    "Lưu thay đổi"
                  ) : (
                    "Thêm review"
                  )}
                </button>
              </div>
            </form>
          </div>
          <div className="modal-backdrop" />
        </div>
      )}
    </div>
  );
}
