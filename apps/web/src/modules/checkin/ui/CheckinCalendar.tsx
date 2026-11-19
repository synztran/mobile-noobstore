"use client";

import { apiFetch } from "@/lib/api/fetch";
import { useEffect, useMemo, useRef, useState } from "react";
import { Gift, Clock3, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { useClaimCheckin, useCheckinCalendar } from "../client/queries";
import type { CheckinReward } from "../types";

const weekdays = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const monthFmt = new Intl.DateTimeFormat("vi-VN", { month: "long", year: "numeric", timeZone: "Asia/Ho_Chi_Minh" });

export function CheckinCalendar() {
  const [month, setMonth] = useState(() => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit" }).format(new Date()));
  const query = useCheckinCalendar(month);
  const claim = useClaimCheckin();
  const [toast, setToast] = useState("");
  const [rewards, setRewards] = useState<CheckinReward[]>([]);
  const eventDialog = useRef<HTMLDialogElement>(null);
  const [activeEventName, setActiveEventName] = useState("");
  const [activeEventHasVoucher, setActiveEventHasVoucher] = useState(false);
  const data = query.data;
  useEffect(() => {
    let cancelled = false;
    apiFetch("/api/checkin/rewards").then((response) => response.ok ? response.json() : []).then((items) => { if (!cancelled) setRewards(items); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);
  const today = data?.days.find((day) => day.state === "today");
  const offset = useMemo(() => {
    if (!data?.days.length) return 0;
    const [y, m, d] = data.days[0].date.split("-").map(Number);
    return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
  }, [data]);
  const headingDate = new Date(`${month}-01T12:00:00+07:00`);

  function shiftMonth(delta: number) {
    const [year, value] = month.split("-").map(Number);
    const date = new Date(Date.UTC(year, value - 1 + delta, 1));
    setMonth(`${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`);
  }

  async function checkIn() {
    try {
      const result = await claim.mutateAsync();
      setToast(result.alreadyCheckedIn ? "Bạn đã điểm danh hôm nay rồi." : `Bạn đã điểm danh thành công: +${result.pointsAwarded} điểm chuyên cần`);
      window.setTimeout(() => setToast(""), 2800);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Không thể điểm danh lúc này");
      window.setTimeout(() => setToast(""), 3000);
    }
  }
  function beginCheckin(event?: { name: string; hasVoucher: boolean } | null) {
    if (event) {
      setActiveEventName(event.name);
      setActiveEventHasVoucher(event.hasVoucher);
      eventDialog.current?.showModal();
    } else void checkIn();
  }

  if (query.isLoading) return <div className="mx-auto max-w-6xl space-y-5 p-4"><div className="skeleton h-20 w-2/3"/><div className="skeleton h-28 w-full"/><div className="skeleton h-[420px] w-full"/></div>;
  if (query.isError) return <div className="alert alert-error mx-auto max-w-3xl">Không tải được lịch điểm danh. Vui lòng thử lại.</div>;
  if (!data?.enabled) return <div className="mx-auto max-w-3xl rounded-2xl bg-base-100 p-8 text-center"><h1 className="text-2xl font-extrabold">Điểm danh đang tạm đóng</h1><p className="mt-2 text-base-content/70">Tính năng sẽ sớm mở lại.</p></div>;

  const total = data.days.reduce((sum, day) => sum + (day.state === "done" ? day.points : 0), 0);
  return <main className="mx-auto max-w-6xl space-y-5 px-4 py-6 pb-24">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><a href="/" className="link link-hover text-sm">‹ Trang chủ</a><h1 className="mt-3 text-3xl font-extrabold tracking-tight">Điểm danh tháng</h1><p className="mt-1 text-base-content/70">Điểm danh mỗi ngày để tích điểm chuyên cần.</p></div><div className="join rounded-full bg-base-100 p-1 shadow-sm"><button className="btn btn-circle btn-ghost btn-sm join-item" onClick={() => shiftMonth(-1)} aria-label="Tháng trước"><ChevronLeft/></button><span className="join-item flex min-w-36 items-center justify-center px-3 text-sm font-bold">{monthFmt.format(headingDate)}</span><button className="btn btn-circle btn-ghost btn-sm join-item" onClick={() => shiftMonth(1)} aria-label="Tháng sau"><ChevronRight/></button></div></header>
    <section className="grid gap-4 md:grid-cols-[1.3fr_.7fr]">
      <div className="rounded-2xl bg-neutral p-5 text-neutral-content"><div className="text-sm font-bold">ĐIỂM DANH CÒN DÙNG</div><div className="mt-1 text-4xl font-extrabold">{data.availablePoints} <span className="text-base">điểm</span></div><p className="mt-2 flex items-center gap-1 text-sm opacity-80"><Clock3 size={15}/>{data.earliestExpiry ? `Điểm gần nhất hết hạn ${new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(data.earliestExpiry))}` : "Chưa có điểm danh trong tháng này"}</p></div>
      <div className="rounded-2xl bg-base-100 p-5"><h2 className="font-bold">Tiến độ tháng này</h2><p className="mt-2 text-2xl font-extrabold">{total} <span className="text-sm font-semibold">điểm đã nhận</span></p><p className="mt-1 text-sm text-base-content/70">Điểm danh bỏ lỡ không làm mất điểm đã tích lũy.</p></div>
    </section>
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_290px]">
      <section className="rounded-2xl bg-base-100 p-4 shadow-sm sm:p-6" aria-label={`Lịch điểm danh ${month}`}>
        <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-extrabold">Lịch điểm danh</h2><span className="text-sm text-base-content/60">Thứ Hai đến Chủ Nhật</span></div>
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">{weekdays.map((day) => <div key={day} className="py-2 text-center text-xs font-bold text-base-content/60 sm:text-sm">{day}</div>)}
          {Array.from({ length: offset }, (_, index) => <div key={`empty-${index}`} />)}
          {data.days.map((day) => {
            const todayCell = day.state === "today";
            const stateClass = day.state === "done" ? "bg-[#d4eca2] text-[#293513]" : day.state === "missed" ? "bg-[#e4e2de] text-[#56423c]" : todayCell ? "bg-[#ffdbcf] text-[#63260f] ring-2 ring-[#bb5732]" : "bg-base-200 text-base-content/70";
            return <button key={day.date} type="button" disabled={!todayCell || claim.isPending} onClick={() => beginCheckin(day.event)} className={`relative flex min-h-14 flex-col items-start rounded-xl p-2 text-left sm:min-h-[76px] sm:p-2.5 ${stateClass} ${todayCell ? "cursor-pointer" : "cursor-default"}`} aria-label={`${day.date}, ${day.points} điểm, ${day.state}`}>
              {day.event && <Gift size={14} className="absolute right-2 top-2 text-[#9b3f1c]" aria-label="Ngày đặc biệt"/>}<span className="text-sm font-extrabold">{Number(day.date.slice(-2))}</span><span className="mt-1 text-xs font-semibold">{day.points} điểm</span>{day.event && <span className="mt-auto flex items-center gap-1 text-xs font-extrabold"><Gift size={12}/>Quà</span>}{day.state === "done" && <Check size={12} className="absolute right-2 bottom-2"/>}
            </button>;
          })}
        </div>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 rounded-lg bg-base-200 p-3 text-xs"><span className="flex items-center gap-2"><i className="h-3 w-3 rounded bg-[#d4eca2]"/>Đã điểm danh</span><span className="flex items-center gap-2"><i className="h-3 w-3 rounded bg-[#ffdbcf] ring-1 ring-[#bb5732]"/>Hôm nay</span><span className="flex items-center gap-2"><i className="h-3 w-3 rounded bg-[#e4e2de]"/>Đã qua, chưa điểm danh</span><span>Cuối tuần: 2 điểm</span></div>
        <div className="mt-4 rounded-xl bg-base-200 p-4 text-sm leading-relaxed"><h3 className="font-bold">Cách điểm danh</h3><p className="mt-2">Nhấn ngày hôm nay để nhận điểm. Ngày thường nhận 1 điểm, cuối tuần nhận 2 điểm. Bỏ lỡ ngày không mất điểm đã tích lũy.</p><p className="mt-2">Điểm danh hết hạn lúc 23:59 ngày cuối tháng. Đổi voucher tại <a className="link link-primary font-bold" href="/rewards">trang Đổi thưởng</a>. Quà đặc biệt chỉ hiển thị và nhận đúng ngày.</p></div>
      </section>
       <aside className="space-y-4"><section className="rounded-2xl bg-base-100 p-5"><h2 className="font-bold">Hôm nay</h2><p className="mt-1 text-sm text-base-content/70">{today ? `${today.points} điểm chuyên cần` : "Hôm nay đã điểm danh"}</p><button className="btn btn-primary mt-4 w-full" disabled={!today || claim.isPending} onClick={() => beginCheckin(today?.event)}>{claim.isPending ? "Đang điểm danh…" : today ? "Điểm danh hôm nay" : "Đã điểm danh"}</button><p className="mt-2 text-center text-xs text-base-content/60">Ngày thường +1 điểm · Cuối tuần +2 điểm</p></section>
        <section className="rounded-2xl bg-base-100 p-5"><div className="flex items-center justify-between"><h2 className="font-bold">Đổi điểm lấy voucher</h2><a href="/rewards" className="link link-primary text-xs font-bold">Xem tất cả</a></div>{rewards.length ? rewards.map((reward) => <div key={reward.id} className="mt-3 flex items-center justify-between border-t border-base-200 pt-3 text-sm"><span>{reward.name}<small className="block text-base-content/60">{reward.points_cost} điểm chuyên cần</small></span><span className="badge badge-ghost">{reward.stock == null ? "∞" : Math.max(0, reward.stock - reward.claimed_count)}</span></div>) : <p className="mt-3 text-sm text-base-content/70">Chưa có phần thưởng đổi bằng điểm chuyên cần.</p>}</section>
        <section className="rounded-2xl bg-base-200 p-5"><h2 className="font-bold">Tích điểm mỗi tháng</h2><p className="mt-2 text-sm leading-relaxed">Ngày thường nhận 1 điểm, cuối tuần nhận 2 điểm. Bỏ lỡ ngày vẫn giữ điểm đã tích lũy. Ngày đặc biệt có thể tặng thêm voucher.</p></section>
      </aside>
    </div>
    <dialog ref={eventDialog} className="modal" aria-labelledby="checkin-event-title" onCancel={(event) => event.preventDefault()}><div className="modal-box"><button className="btn btn-circle btn-ghost btn-sm absolute right-3 top-3" aria-label="Đóng" onClick={() => eventDialog.current?.close()}>×</button><h2 id="checkin-event-title" className="text-xl font-extrabold">Quà ngày đặc biệt</h2><p className="mt-2 text-sm">{activeEventName}. Điểm danh hôm nay để nhận điểm chuyên cần{activeEventHasVoucher ? " và voucher tặng riêng" : ""}.</p>{activeEventHasVoucher && <div className="mt-4 rounded-xl bg-base-200 p-4"><strong>Voucher sự kiện</strong><p className="mt-1 text-sm">Voucher được thêm vào tài khoản khi điểm danh, số lượng có hạn.</p></div>}<div className="modal-action"><button className="btn btn-ghost" onClick={() => eventDialog.current?.close()}>Để sau</button><button className="btn btn-primary" disabled={claim.isPending} onClick={async () => { await checkIn(); eventDialog.current?.close(); }}>{claim.isPending ? "Đang điểm danh…" : "Điểm danh và nhận quà"}</button></div></div><div className="modal-backdrop" /></dialog>
    {toast && <div role="status" className="toast toast-center"><div className="alert alert-neutral">{toast}</div></div>}
  </main>;
}
