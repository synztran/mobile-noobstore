"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Gift, RotateCw, Ticket } from "lucide-react";

type Config = {
  enabled: boolean;
  weekday_points: number;
  weekend_points: number;
  holiday_weekday_points: number;
  holiday_weekend_points: number;
  monthly_voucher_quantity: number;
  monthly_voucher_terms: Record<string, unknown>;
};
type EventRow = {
  id: string;
  event_date: string;
  name: string;
  event_type: string;
  weekday_points: number | null;
  weekend_points: number | null;
  voucher_batch_id: string | null;
};
type BatchRow = {
  id: string;
  name: string;
  status: string;
  requested_count: number;
  created_count: number;
  failed_count: number;
};

export default function CheckinAdmin() {
  const [config, setConfig] = useState<Config>({
    enabled: false,
    weekday_points: 1,
    weekend_points: 2,
    holiday_weekday_points: 1,
    holiday_weekend_points: 2,
    monthly_voucher_quantity: 0,
    monthly_voucher_terms: {},
  });
  const [events, setEvents] = useState<EventRow[]>([]);
  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventName, setEventName] = useState("");
  const [quantity, setQuantity] = useState(25);
  const [voucherName, setVoucherName] = useState("");
  const [discountAmount, setDiscountAmount] = useState(30000);
  const [minimumOrder, setMinimumOrder] = useState(300000);
  const [eventVoucherQuantity, setEventVoucherQuantity] = useState(0);
  const [eventWeekdayPoints, setEventWeekdayPoints] = useState("");
  const [eventWeekendPoints, setEventWeekendPoints] = useState("");

  async function load() {
    setBusy(true);
    setError("");
    try {
      const [settingsResponse, batchResponse] = await Promise.all([
        fetch("/api/checkin", { cache: "no-store" }),
        fetch("/api/checkin/batches", { cache: "no-store" }),
      ]);
      const settingsBody = await settingsResponse.json();
      const batchBody = await batchResponse.json();
      if (!settingsResponse.ok || !batchResponse.ok)
        throw new Error(
          settingsBody.error ?? batchBody.error ?? "Unable to load"
        );
      setConfig(settingsBody.settings);
      setEvents(settingsBody.events);
      setBatches(batchBody);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load");
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);

  async function saveSettings(patch: Partial<Config>) {
    const response = await fetch("/api/checkin", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!response.ok)
      throw new Error((await response.json()).error ?? "Unable to save");
    setConfig((current) => ({ ...current, ...patch }));
  }
  async function saveEvent(event: FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_date: eventDate,
        name: eventName,
        event_type: "special",
        voucher_quantity: eventVoucherQuantity,
        voucher_terms: {
          reward_type: "amount_off",
          scope_type: "order_total",
          amount_off: discountAmount,
          percent_off: null,
          min_order_amount: minimumOrder,
          name: `${eventName} voucher`,
        },
        weekday_points:
          eventWeekdayPoints === "" ? null : Number(eventWeekdayPoints),
        weekend_points:
          eventWeekendPoints === "" ? null : Number(eventWeekendPoints),
      }),
    });
    const body = await response.json();
    if (!response.ok) {
      setError(body.error);
      return;
    }
    setEventDate("");
    setEventName("");
    setEventWeekdayPoints("");
    setEventWeekendPoints("");
    await load();
  }
  async function createBatch(event: FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/checkin/batches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quantity,
        event_date: eventDate || null,
        terms: {
          name: voucherName,
          reward_type: "amount_off",
          scope_type: "order_total",
          amount_off: discountAmount,
          min_order_amount: minimumOrder,
        },
      }),
    });
    const body = await response.json();
    if (!response.ok && response.status !== 202) {
      setError(body.error);
      return;
    }
    await load();
  }
  async function retry(id: string) {
    const response = await fetch(`/api/checkin/batches/${id}/retry`, {
      method: "POST",
    });
    if (!response.ok) setError((await response.json()).error ?? "Retry failed");
    await load();
  }

  if (busy)
    return (
      <div className="space-y-4">
        <div className="skeleton h-16 w-1/3" />
        <div className="skeleton h-64 w-full" />
      </div>
    );
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">Quản lý điểm danh</h1>
        <p className="mt-1 text-sm text-slate-600">
          Cấu hình điểm, ngày sự kiện và voucher tặng theo lượt.
        </p>
      </header>
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}
      <section className="rounded-xl bg-white p-5 shadow">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold">Trạng thái tính năng</h2>
            <p className="text-sm text-slate-600">
              Khi tắt, khách hàng không thể điểm danh; điểm và lịch sử vẫn được
              giữ.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={config.enabled}
            className={`toggle toggle-success ${config.enabled ? "toggle-md" : ""}`}
            onClick={() =>
              void saveSettings({ enabled: !config.enabled }).catch((e) =>
                setError(e.message)
              )
            }
          />
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              ["weekday_points", "Ngày thường"],
              ["weekend_points", "Cuối tuần"],
              ["holiday_weekday_points", "Ngày lễ trong tuần"],
              ["holiday_weekend_points", "Ngày lễ cuối tuần"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="form-control">
              <span className="label-text mb-1 font-semibold">{label}</span>
              <input
                className="input input-bordered"
                type="number"
                min="0"
                max="100"
                value={config[key]}
                onChange={(e) =>
                  setConfig({ ...config, [key]: Number(e.target.value) })
                }
                onBlur={() =>
                  void saveSettings({ [key]: config[key] }).catch((e) =>
                    setError(e.message)
                  )
                }
              />
            </label>
          ))}
        </div>
        <div className="mt-5 grid gap-4 border-t pt-4 sm:grid-cols-3">
          <label className="form-control">
            <span className="label-text mb-1 font-semibold">
              Voucher đầu mỗi tháng
            </span>
            <input
              className="input input-bordered"
              type="number"
              min="0"
              max="1000"
              value={config.monthly_voucher_quantity}
              onChange={(e) =>
                setConfig({
                  ...config,
                  monthly_voucher_quantity: Number(e.target.value),
                })
              }
              onBlur={() =>
                void saveSettings({
                  monthly_voucher_quantity: config.monthly_voucher_quantity,
                }).catch((e) => setError(e.message))
              }
            />
          </label>
          <label className="form-control">
            <span className="label-text mb-1 font-semibold">
              Tên voucher tháng
            </span>
            <input
              className="input input-bordered"
              value={String(config.monthly_voucher_terms?.name ?? "")}
              onChange={(e) =>
                setConfig({
                  ...config,
                  monthly_voucher_terms: {
                    ...config.monthly_voucher_terms,
                    name: e.target.value,
                  },
                })
              }
              onBlur={() =>
                void saveSettings({
                  monthly_voucher_terms: config.monthly_voucher_terms,
                }).catch((e) => setError(e.message))
              }
            />
          </label>
          <label className="form-control">
            <span className="label-text mb-1 font-semibold">Giảm giá (₫)</span>
            <input
              className="input input-bordered"
              type="number"
              min="1"
              value={Number(config.monthly_voucher_terms?.amount_off ?? 30000)}
              onChange={(e) =>
                setConfig({
                  ...config,
                  monthly_voucher_terms: {
                    ...config.monthly_voucher_terms,
                    amount_off: Number(e.target.value),
                    reward_type: "amount_off",
                    scope_type: "order_total",
                  },
                })
              }
              onBlur={() =>
                void saveSettings({
                  monthly_voucher_terms: config.monthly_voucher_terms,
                }).catch((e) => setError(e.message))
              }
            />
          </label>
        </div>
      </section>
      <section className="grid gap-5 lg:grid-cols-2">
        <form
          onSubmit={saveEvent}
          className="space-y-4 rounded-xl bg-white p-5 shadow"
        >
          <h2 className="flex items-center gap-2 font-bold">
            <Gift size={18} />
            Ngày lễ hoặc sự kiện
          </h2>
          <p className="text-sm text-slate-600">
            Thêm ngày đặc biệt ngoài lịch lễ cố định. Điểm có thể dùng mặc định
            hoặc nhập override.
          </p>
          <label className="form-control">
            <span className="label-text mb-1">Tên sự kiện</span>
            <input
              className="input input-bordered"
              required
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
            />
          </label>
          <label className="form-control">
            <span className="label-text mb-1">Ngày</span>
            <input
              className="input input-bordered"
              type="date"
              required
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="form-control">
              <span className="label-text mb-1">
                Điểm ngày thường (để trống = mặc định)
              </span>
              <input
                className="input input-bordered"
                type="number"
                min="0"
                max="100"
                value={eventWeekdayPoints}
                onChange={(e) => setEventWeekdayPoints(e.target.value)}
              />
            </label>
            <label className="form-control">
              <span className="label-text mb-1">
                Điểm cuối tuần (để trống = mặc định)
              </span>
              <input
                className="input input-bordered"
                type="number"
                min="0"
                max="100"
                value={eventWeekendPoints}
                onChange={(e) => setEventWeekendPoints(e.target.value)}
              />
            </label>
          </div>
          <label className="form-control">
            <span className="label-text mb-1">
              Voucher cần tạo cho ngày này
            </span>
            <input
              className="input input-bordered"
              type="number"
              min="0"
              max="1000"
              value={eventVoucherQuantity}
              onChange={(e) => setEventVoucherQuantity(Number(e.target.value))}
            />
          </label>
          <button className="btn btn-primary" type="submit">
            Thêm ngày sự kiện
          </button>
          <div className="space-y-2 border-t pt-3">
            {events.map((ev) => (
              <div
                className="flex items-center justify-between rounded-lg bg-base-200 p-3 text-sm"
                key={ev.id}
              >
                <span>
                  <strong>{ev.name}</strong>
                  <span className="ml-2 text-slate-500">{ev.event_date}</span>
                </span>
                <span className="badge">
                  {ev.voucher_batch_id ? "Có voucher" : "Không voucher"}
                </span>
              </div>
            ))}
          </div>
        </form>
        <form
          onSubmit={createBatch}
          className="space-y-4 rounded-xl bg-white p-5 shadow"
        >
          <h2 className="flex items-center gap-2 font-bold">
            <Ticket size={18} />
            Tạo lô voucher sự kiện
          </h2>
          <label className="form-control">
            <span className="label-text mb-1">Tên voucher</span>
            <input
              className="input input-bordered"
              required
              value={voucherName}
              onChange={(e) => setVoucherName(e.target.value)}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="form-control">
              <span className="label-text mb-1">Giảm (₫)</span>
              <input
                className="input input-bordered"
                type="number"
                min="1"
                required
                value={discountAmount}
                onChange={(e) => setDiscountAmount(Number(e.target.value))}
              />
            </label>
            <label className="form-control">
              <span className="label-text mb-1">Đơn tối thiểu (₫)</span>
              <input
                className="input input-bordered"
                type="number"
                min="0"
                required
                value={minimumOrder}
                onChange={(e) => setMinimumOrder(Number(e.target.value))}
              />
            </label>
          </div>
          <label className="form-control">
            <span className="label-text mb-1">Số voucher (tối đa 1.000)</span>
            <input
              className="input input-bordered"
              type="number"
              min="1"
              max="1000"
              required
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
          </label>
          <button className="btn btn-primary" type="submit">
            Tạo mã voucher
          </button>
          <p className="text-xs text-slate-500">
            Mã riêng, gán một lần cho mỗi khách đủ điều kiện. Mã lỗi có thể
            retry.
          </p>
          <div className="space-y-2 border-t pt-3">
            {batches.map((batch) => (
              <div
                className="flex items-center justify-between rounded-lg bg-base-200 p-3 text-sm"
                key={batch.id}
              >
                <span>
                  {batch.name}: {batch.created_count}/{batch.requested_count}
                  <span className="badge ml-2">{batch.status}</span>
                </span>
                {batch.failed_count > 0 && (
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => void retry(batch.id)}
                  >
                    <RotateCw size={14} />
                    Retry {batch.failed_count}
                  </button>
                )}
              </div>
            ))}
          </div>
        </form>
      </section>
    </div>
  );
}
