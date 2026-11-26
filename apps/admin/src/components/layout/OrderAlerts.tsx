"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, Volume2, VolumeX, X } from "lucide-react";
import { formatVND } from "@/lib/currency";
import type { OrderAlert, OrderAlertCursor } from "@/lib/order-alerts";

export default function OrderAlerts() {
  const [alerts, setAlerts] = useState<OrderAlert[]>([]);
  const [toast, setToast] = useState<OrderAlert | null>(null);
  const [sound, setSound] = useState(false);
  const [watchOrders, setWatchOrders] = useState(true);
  const [watchPreferenceReady, setWatchPreferenceReady] = useState(false);
  const [status, setStatus] = useState("Đang kết nối thông báo…");
  const audio = useRef<AudioContext | null>(null);
  const soundEnabled = useRef(false);

  useEffect(() => {
    setWatchOrders(localStorage.getItem("admin-order-alerts-enabled") !== "false");
    setWatchPreferenceReady(true);
  }, []);

  function toggleOrderWatch() {
    const next = !watchOrders;
    localStorage.setItem("admin-order-alerts-enabled", String(next));
    setWatchOrders(next);
    setStatus(next ? "Đang kết nối thông báo…" : "Đã tắt theo dõi đơn mới");
  }

  function chime() {
    const context = audio.current;
    if (!context || context.state !== "running") return;
    [660, 880].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const start = context.currentTime + index * 0.18;
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.15, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.3);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.32);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    });
  }

  async function toggleSound() {
    if (!navigator.locks) {
      setStatus("Trình duyệt không hỗ trợ khóa âm thanh giữa các tab. Hãy dùng Chrome, Edge, Firefox hoặc Safari mới.");
      return;
    }
    if (soundEnabled.current) {
      soundEnabled.current = false;
      setSound(false);
      return;
    }
    try {
      audio.current ??= new AudioContext();
      await audio.current.resume();
      soundEnabled.current = audio.current.state === "running";
      setSound(soundEnabled.current);
      chime();
    } catch {
      setStatus("Không bật được âm thanh. Hãy thử lại.");
    }
  }

  useEffect(() => {
    if (!watchPreferenceReady || !watchOrders) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    let cursor: OrderAlertCursor | null = null;
    const controller = new AbortController();

    async function playOnce(orders: OrderAlert[]) {
      if (!soundEnabled.current || !navigator.locks) return;
      // An exclusive lock makes the localStorage check/write atomic across tabs.
      await navigator.locks.request("admin-order-alert-sound", () => {
        if (stopped || !soundEnabled.current || audio.current?.state !== "running") return;
        try {
          const key = "admin-order-alert-sounded";
          const seen = JSON.parse(localStorage.getItem(key) ?? "[]") as string[];
          if (!Array.isArray(seen)) return;
          const fresh = orders.filter(order => !seen.includes(order.id));
          if (!fresh.length) return;
          localStorage.setItem(key, JSON.stringify([...seen, ...fresh.map(order => order.id)].slice(-1000)));
          chime();
        } catch {
          // Fail silent if shared storage is unavailable; never duplicate sounds.
        }
      });
    }

    async function poll() {
      try {
        const params = cursor ? `?cursor=${encodeURIComponent(JSON.stringify(cursor))}` : "";
        const response = await fetch(`/api/orders/alerts${params}`, {
          cache: "no-store", signal: controller.signal,
        });
        if (response.status === 401 || response.status === 403) {
          setStatus("Thông báo đã dừng. Vui lòng đăng nhập lại.");
          return;
        }
        if (!response.ok) throw new Error("Unavailable");
        const data = await response.json() as { orders: OrderAlert[]; cursor: OrderAlertCursor };
        if (stopped) return;
        cursor = data.cursor;
        if (data.orders.length) {
          setToast(data.orders[data.orders.length - 1]);
          setAlerts(previous => [...data.orders.slice().reverse(), ...previous]
            .filter((order, index, list) => list.findIndex(item => item.id === order.id) === index).slice(0, 50));
          await playOnce(data.orders);
        }
        setStatus("Kiểm tra đơn mới mỗi 5 giây");
      } catch {
        if (!stopped) setStatus("Mất kết nối thông báo. Đang thử lại…");
      }
      if (!stopped) timer = setTimeout(poll, 5000);
    }
    void poll();
    return () => {
      stopped = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, [watchPreferenceReady, watchOrders]);

  useEffect(() => () => { void audio.current?.close(); }, []);

  return (
    <div className="flex items-center gap-1">
      <button type="button" className="btn btn-sm btn-ghost" onClick={() => void toggleSound()}
        aria-pressed={sound} title={status}>
        {sound ? <Volume2 size={16} /> : <VolumeX size={16} />}
        <span className="hidden md:inline">{sound ? "Tắt âm" : "Bật âm báo"}</span>
      </button>
      <button type="button" className="btn btn-sm btn-ghost" onClick={toggleOrderWatch}
        aria-pressed={watchOrders} title={watchOrders ? "Tắt theo dõi đơn mới" : "Bật theo dõi đơn mới"}>
        <Bell size={16} />
        <span className="hidden md:inline">{watchOrders ? "Theo dõi đơn" : "Đã tắt theo dõi"}</span>
      </button>
      {sound && <button type="button" className="btn btn-xs btn-ghost" onClick={chime}>Thử âm</button>}
      <details className="dropdown dropdown-end">
        <summary className="btn btn-sm btn-ghost" aria-label={`Đơn mới: ${alerts.length}`} title={status}>
          <Bell size={16} /><span className="badge badge-sm">{alerts.length}</span>
        </summary>
        <div className="dropdown-content z-50 mt-2 w-80 max-w-[90vw] rounded-xl border bg-white p-3 shadow-lg">
          <div className="flex items-center justify-between">
            <strong className="text-sm">Đơn hàng mới</strong>
            <button type="button" className="btn btn-xs btn-ghost" aria-label="Đóng danh sách thông báo"
              onClick={event => event.currentTarget.closest("details")?.removeAttribute("open")}><X size={16} /></button>
          </div>
          <p className="text-xs text-slate-500" role="status">{status}</p>
          <div className="mt-2 max-h-80 space-y-2 overflow-auto">
            {alerts.length === 0 && <p className="py-4 text-sm text-slate-500">Chưa có đơn mới trong phiên này.</p>}
            {alerts.map(order => <div key={order.id} className="flex items-start gap-2 rounded-lg bg-slate-50 p-2">
              <Link href={`/orders?q=${encodeURIComponent(order.order_number)}&by=order`}
                className="flex-1 text-sm" onClick={() => setAlerts(items => items.filter(item => item.id !== order.id))}>
                <strong>Đơn hàng mới · {order.order_number}</strong><br />{formatVND(order.total_price)}
              </Link>
              <button type="button" aria-label={`Bỏ thông báo ${order.order_number}`}
                onClick={() => setAlerts(items => items.filter(item => item.id !== order.id))}><X size={16} /></button>
            </div>)}
          </div>
        </div>
      </details>
      <div className="sr-only" role="status" aria-live="polite">{alerts[0] ? `Đơn hàng mới ${alerts[0].order_number}` : ""}</div>
      {toast && <div className="toast toast-end toast-top z-50 mt-16">
        <div className="alert border border-emerald-200 bg-white text-slate-900 shadow-lg">
          <Bell size={20} className="text-emerald-600" />
          <Link href={`/orders?q=${encodeURIComponent(toast.order_number)}&by=order`}
            onClick={() => {
              setAlerts(items => items.filter(item => item.id !== toast.id));
              setToast(null);
            }}>
            <strong>Đơn hàng mới · {toast.order_number}</strong>
            <p>{formatVND(toast.total_price)} · Xem đơn hàng</p>
          </Link>
          <button type="button" className="btn btn-sm btn-ghost" aria-label="Đóng thông báo"
            onClick={() => setToast(null)}><X size={16} /></button>
        </div>
      </div>}
    </div>
  );
}
