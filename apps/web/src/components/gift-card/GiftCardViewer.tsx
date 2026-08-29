"use client";

import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import Link from "next/link";
import Image from "@/components/ui/AdaptiveImage";
import { LOGO_NOOB_STORE } from "@/lib/images";
import Icon from "@/components/ui/Icon";
import { toast } from "@/lib/toast";
import {
  useCallback,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

// ─── Props ──────────────────────────────────────────────────────────────────

export interface GiftCardViewerProps {
  code: string;
  pointsValue: number;
  note: string | null;
  batchLabel: string | null;
  expiresAt: string | null;
  isActive: boolean;
  isRedeemed: boolean;
  isExpired: boolean;
  restricted: boolean;
}

// ─── Theme (derived from code hash — no theme column exists) ────────────────

const THEMES = [
  { from: "#f59e0b", to: "#b91c1c", glow: "rgba(245,158,11,0.55)" }, // amber
  { from: "#10b981", to: "#065f46", glow: "rgba(16,185,129,0.5)" }, // emerald
  { from: "#6366f1", to: "#312e81", glow: "rgba(99,102,241,0.5)" }, // indigo
  { from: "#ec4899", to: "#831843", glow: "rgba(236,72,153,0.5)" }, // rose
  { from: "#0ea5e9", to: "#075985", glow: "rgba(14,165,233,0.5)" }, // sky
] as const;

function themeFor(code: string) {
  let h = 0;
  for (let i = 0; i < code.length; i++) {
    h = (h * 31 + code.charCodeAt(i)) >>> 0;
  }
  return THEMES[h % THEMES.length];
}

function formatPoints(v: number) {
  return v.toLocaleString("vi-VN");
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function GiftCardViewer(props: GiftCardViewerProps) {
  const {
    code,
    pointsValue,
    note,
    batchLabel,
    expiresAt,
    isActive,
    isRedeemed,
    isExpired,
    restricted,
  } = props;

  const reducedMotion = useReducedMotion();
  const stageRef = useRef<HTMLDivElement>(null);
  const [flipped, setFlipped] = useState(false);

  const rotateXMV = useMotionValue(0);
  const rotateYMV = useMotionValue(0);
  const flipYMV = useMotionValue(0);
  const springX = useSpring(rotateXMV, { stiffness: 200, damping: 26 });
  const springY = useSpring(rotateYMV, { stiffness: 200, damping: 26 });
  const combinedY = useTransform(
    [springY, flipYMV],
    (latest: number[]) => latest[0] + latest[1]
  );

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (reducedMotion) return;
      const el = stageRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      rotateYMV.set(px * 14); // 14deg max tilt
      rotateXMV.set(-py * 12);
    },
    [rotateXMV, rotateYMV, reducedMotion]
  );

  const onPointerLeave = useCallback(() => {
    rotateXMV.set(0);
    rotateYMV.set(0);
  }, [rotateXMV, rotateYMV]);

  const toggleFlip = useCallback(() => {
    const next = !flipped;
    setFlipped(next);
    if (reducedMotion) {
      flipYMV.jump(next ? 180 : 0);
    } else {
      animate(flipYMV, next ? 180 : 0, {
        type: "spring",
        stiffness: 140,
        damping: 18,
      });
    }
  }, [flipped, flipYMV, reducedMotion]);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Đã sao chép mã thẻ");
    } catch {
      toast.error("Không thể sao chép");
    }
  }, [code]);

  // Card availability
  const usable = isActive && !isRedeemed && !isExpired && restricted;
  const statusText = isRedeemed
    ? "Đã được sử dụng"
    : isExpired
      ? "Đã hết hạn"
      : !isActive
        ? "Đã bị vô hiệu hóa"
        : !restricted
          ? "Chưa cấp phát"
          : "Hoạt động";
  const statusClass = usable
    ? "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30"
    : "bg-rose-500/15 text-rose-300 ring-rose-400/30";

  const t = themeFor(code);
  const cardGradient = `linear-gradient(135deg, ${t.from}, ${t.to})`;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-between gap-6 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-5 py-8">
      {/* Header */}
      <div className="flex w-full max-w-md items-center justify-between">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-300 transition-colors hover:bg-white/10"
        >
          <Icon name="arrow_back" className="text-sm" />
          Quay lại
        </button>
        <div className="flex items-center gap-2">
          <span className="text-sm font-black uppercase tracking-widest text-white">
            NoobStore
          </span>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ring-1 ${statusClass}`}
        >
          <Icon
            name={usable ? "check_circle" : "error_outline"}
            className="text-sm"
          />
          {statusText}
        </span>
      </div>

      {/* 3D Card stage */}
      <div
        className="w-full max-w-md [perspective:1400px]"
        style={{ touchAction: "pan-y" }}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
      >
        <motion.div
          ref={stageRef}
          className="relative aspect-[1.586/1] w-full cursor-pointer select-none"
          style={{
            transformStyle: "preserve-3d",
            rotateX: springX,
            rotateY: combinedY,
          }}
          onClick={toggleFlip}
          role="button"
          aria-label={flipped ? "Lật ngửa thẻ" : "Lật thẻ xem chi tiết"}
          aria-pressed={flipped}
        >
          {/* ── Front face ── */}
          <div
            className="absolute inset-0 overflow-hidden rounded-3xl p-5 shadow-[0_24px_70px_-12px_rgba(0,0,0,0.8)]"
            style={{
              transform: "translateZ(0px)",
              backfaceVisibility: "hidden",
              background: cardGradient,
            }}
          >
            {/* Glow + noise layers */}
            <div
              className="absolute -right-12 -top-16 h-56 w-56 rounded-full opacity-60 blur-3xl"
              style={{ background: t.glow }}
            />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(255,255,255,0.35),transparent_45%)]" />
            {/* Shine ellipse (LuckyBall style) */}
            <div
              className="pointer-events-none absolute left-[12%] top-[12%] rounded-full"
              style={{
                width: "38%",
                height: "26%",
                background: "rgba(255,255,255,0.40)",
                filter: "blur(8px)",
              }}
            />

            <div
              className="flex h-full flex-col justify-between"
              style={{ transform: "translateZ(28px)" }}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-1.5">
                  <Icon name="redeem" className="text-xl text-white/90" />
                  <span className="text-xs font-black uppercase tracking-[0.2em] text-white/90">
                    Gift Card
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {restricted && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-black/25 px-2 py-1 text-[10px] font-bold text-white/90">
                      <Icon name="lock" className="text-xs" />
                      Riêng tư
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-white/70">
                    <Icon name="flip_horizontal_2" className="text-sm" />
                    Lật để xem mã
                  </span>
                </div>
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-white/70">
                  Giá trị quy đổi
                </p>
                <p className="text-5xl font-black tabular-nums text-white antialiased">
                  {formatPoints(pointsValue)}
                  <span className="ml-2 align-baseline text-base font-bold text-white/80">
                    điểm
                  </span>
                </p>
                {batchLabel && (
                  <p className="mt-1 text-xs font-semibold text-white/80">
                    {batchLabel}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ── Back face ── */}
          <div
            className="absolute inset-0 flex flex-col justify-between rounded-2xl bg-slate-950 p-6 ring-1 ring-white/10"
            style={{
              transform: "rotateY(180deg) translateZ(2px)",
              backfaceVisibility: "hidden",
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                Mã thẻ
              </span>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                  Giá trị
                </p>
                <p className="text-2xl font-black tabular-nums text-white">
                  {formatPoints(pointsValue)} điểm
                </p>
              </div>
              <code className="block rounded-xl bg-white/5 px-3 py-2.5 text-center font-mono text-sm font-bold tracking-[0.15em] text-amber-300">
                {code}
              </code>
              {expiresAt && (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                  <Icon name="schedule" className="text-sm" />
                  Hết hạn:{" "}
                  <span className="text-slate-200">
                    {new Date(expiresAt).toLocaleDateString("vi-VN")}
                  </span>
                </div>
              )}
              {note && (
                <p className="text-xs leading-relaxed text-slate-400">{note}</p>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  void copy();
                }}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-black text-slate-950 transition-transform active:scale-95"
              >
                <Icon name="content_copy" className="text-base" />
                Sao chép
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFlip();
                }}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition-transform active:scale-95"
              >
                Mặt trước
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Footer / CTA */}
      <div className="w-full max-w-md space-y-3">
        {!restricted ? (
          <p className="flex items-center justify-center gap-1.5 text-center text-xs font-semibold text-slate-400">
            <Icon name="lock" className="text-sm" />
            Thẻ chưa được cấp phát, không thể sử dụng
          </p>
        ) : (
          <p className="flex items-center justify-center gap-1.5 text-center text-xs font-semibold text-slate-400">
            <Icon name="lock" className="text-sm" />
            Thẻ này chỉ dành cho khách hàng được chỉ định
          </p>
        )}
        {usable ? (
          <Link
            href="/rewards/gift-card"
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-3.5 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-amber-900/40 transition-transform active:scale-[0.98]"
          >
            <Icon name="redeem" className="text-lg" />
            Nạp thẻ quà tặng
          </Link>
        ) : (
          <button
            type="button"
            disabled
            className="w-full cursor-not-allowed rounded-2xl bg-white/5 px-5 py-3.5 text-sm font-black uppercase tracking-widest text-slate-500"
          >
            Thẻ không khả dụng
          </button>
        )}
        <p className="text-center text-[11px] leading-relaxed text-slate-500">
          Nạp thẻ để cộng điểm vào tài khoản NoobStore của bạn.
        </p>
      </div>
    </div>
  );
}
