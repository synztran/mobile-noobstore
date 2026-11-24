"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
  isExpired: boolean;
}

function getTimeLeft(targetDate: string): TimeLeft {
  const diff = new Date(targetDate).getTime() - Date.now();
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0, isExpired: true };
  }

  const seconds = Math.floor((diff / 1000) % 60);
  const minutes = Math.floor((diff / 1000 / 60) % 60);
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  return { days, hours, minutes, seconds, totalMs: diff, isExpired: false };
}

export function AuctionTimer({
  endsAt,
  startsAt,
  variant = "badge",
}: {
  endsAt: string;
  startsAt?: string;
  variant?: "badge" | "card" | "banner";
}) {
  const [target, setTarget] = useState(endsAt);
  const [isUpcoming, setIsUpcoming] = useState(false);
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => getTimeLeft(endsAt));

  useEffect(() => {
    const now = Date.now();
    const startMs = startsAt ? new Date(startsAt).getTime() : 0;
    if (startMs > now) {
      setIsUpcoming(true);
      setTarget(startsAt!);
      setTimeLeft(getTimeLeft(startsAt!));
    } else {
      setIsUpcoming(false);
      setTarget(endsAt);
      setTimeLeft(getTimeLeft(endsAt));
    }
  }, [endsAt, startsAt]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeLeft(target));
    }, 1000);
    return () => clearInterval(timer);
  }, [target]);

  const isUrgent = !isUpcoming && !timeLeft.isExpired && timeLeft.totalMs < 5 * 60 * 1000;

  if (timeLeft.isExpired) {
    if (variant === "badge") {
      return (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-neutral-900/85 backdrop-blur-md text-neutral-300 border border-white/15 shadow-md">
          <Clock size={12} />
          <span>{isUpcoming ? "Sắp diễn ra" : "Đã kết thúc"}</span>
        </div>
      );
    }
    return (
      <div className="inline-flex items-center gap-1.5 text-xs text-neutral-400 font-medium">
        <Clock size={13} />
        <span>{isUpcoming ? "Đang mở..." : "Đã kết thúc"}</span>
      </div>
    );
  }

  const pad = (n: number) => String(n).padStart(2, "0");

  if (variant === "badge") {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold shadow-md backdrop-blur-md ${
          isUrgent
            ? "bg-rose-600/95 text-white border border-rose-400/50 animate-pulse"
            : isUpcoming
            ? "bg-amber-600/95 text-white border border-amber-400/50"
            : "bg-neutral-900/85 text-white border border-white/20"
        }`}
      >
        <Clock
          size={12}
          className={
            isUrgent
              ? "text-white"
              : isUpcoming
              ? "text-amber-200"
              : "text-amber-400"
          }
        />
        <span className="text-[11px] font-medium text-white/90">
          {isUpcoming ? "Bắt đầu sau:" : isUrgent ? "Sắp hết:" : "Còn lại:"}
        </span>
        <span className="font-mono font-bold tracking-tight text-white">
          {timeLeft.days > 0 ? `${timeLeft.days}d ` : ""}
          {pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
        </span>
      </div>
    );
  }

  if (variant === "banner") {
    const endFormatted = endsAt
      ? new Date(endsAt).toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";

    return (
      <div
        className={`p-3 sm:p-3.5 rounded-2xl border space-y-2.5 transition-all ${
          isUrgent
            ? "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400 shadow-sm"
            : "bg-surface-container-low border-surface-border text-foreground"
        }`}
      >
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                isUrgent ? "bg-rose-500 animate-ping" : "bg-emerald-500 animate-pulse"
              }`}
            />
            <span className="font-bold uppercase tracking-wider text-[11px] truncate">
              {isUpcoming
                ? "Thời gian đếm ngược"
                : isUrgent
                ? "⚡ Bù giờ Anti-snipe"
                : "Thời gian còn lại"}
            </span>
          </div>
          {endFormatted && (
            <span className="text-[11px] text-muted-foreground whitespace-nowrap flex-shrink-0">
              Kết thúc {endFormatted}
            </span>
          )}
        </div>

        <div className="grid grid-cols-4 gap-1.5 sm:gap-2 text-center">
          <div className="py-2 px-1 rounded-xl bg-white border border-surface-border shadow-2xs">
            <span className="block font-mono text-base sm:text-xl font-extrabold text-foreground leading-none">
              {pad(timeLeft.days)}
            </span>
            <span className="block text-[9px] uppercase tracking-wider text-muted-foreground font-semibold mt-1">
              Ngày
            </span>
          </div>
          <div className="py-2 px-1 rounded-xl bg-white border border-surface-border shadow-2xs">
            <span className="block font-mono text-base sm:text-xl font-extrabold text-foreground leading-none">
              {pad(timeLeft.hours)}
            </span>
            <span className="block text-[9px] uppercase tracking-wider text-muted-foreground font-semibold mt-1">
              Giờ
            </span>
          </div>
          <div className="py-2 px-1 rounded-xl bg-white border border-surface-border shadow-2xs">
            <span className="block font-mono text-base sm:text-xl font-extrabold text-foreground leading-none">
              {pad(timeLeft.minutes)}
            </span>
            <span className="block text-[9px] uppercase tracking-wider text-muted-foreground font-semibold mt-1">
              Phút
            </span>
          </div>
          <div
            className={`py-2 px-1 rounded-xl border shadow-2xs ${
              isUrgent
                ? "bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400"
                : "bg-primary-fixed border-primary/20 text-primary"
            }`}
          >
            <span className="block font-mono text-base sm:text-xl font-extrabold text-primary leading-none">
              {pad(timeLeft.seconds)}
            </span>
            <span className="block text-[9px] uppercase tracking-wider text-primary/80 font-bold mt-1">
              Giây
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Variant "card"
  return (
    <div className="grid grid-cols-4 gap-2 text-center">
      <div className="p-2 rounded-lg bg-surface-container border border-border/40">
        <div className="text-lg font-bold font-mono">{timeLeft.days}</div>
        <div className="text-[10px] text-muted-foreground uppercase">Ngày</div>
      </div>
      <div className="p-2 rounded-lg bg-surface-container border border-border/40">
        <div className="text-lg font-bold font-mono">{pad(timeLeft.hours)}</div>
        <div className="text-[10px] text-muted-foreground uppercase">Giờ</div>
      </div>
      <div className="p-2 rounded-lg bg-surface-container border border-border/40">
        <div className="text-lg font-bold font-mono">{pad(timeLeft.minutes)}</div>
        <div className="text-[10px] text-muted-foreground uppercase">Phút</div>
      </div>
      <div
        className={`p-2 rounded-lg border ${
          isUrgent
            ? "bg-rose-500/10 border-rose-500/40 text-rose-500"
            : "bg-surface-container border-border/40 text-primary"
        }`}
      >
        <div className="text-lg font-bold font-mono">{pad(timeLeft.seconds)}</div>
        <div className="text-[10px] uppercase font-semibold">Giây</div>
      </div>
    </div>
  );
}
