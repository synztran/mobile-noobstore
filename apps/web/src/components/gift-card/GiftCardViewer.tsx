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
import { useAuth } from "@/modules/user/client/AuthProvider";
import Image from "@/components/ui/AdaptiveImage";
import { LOGO_NOOB_STORE } from "@/lib/images";
import {
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Copy,
  FlipHorizontal2,
  Gift,
  Lock,
} from "lucide-react";
import { toast } from "@/lib/toast";
import {
  useCallback,
  useEffect,
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
  themeId: string | null;
  isScratched: boolean;
  canReveal: boolean;
}

// ─── Theme (derived from code hash — no theme column exists) ────────────────

const THEMES = [
  { id: "amber", from: "#f59e0b", to: "#b91c1c", glow: "rgba(245,158,11,0.55)" },
  { id: "emerald", from: "#10b981", to: "#065f46", glow: "rgba(16,185,129,0.5)" },
  { id: "indigo", from: "#6366f1", to: "#312e81", glow: "rgba(99,102,241,0.5)" },
  { id: "rose", from: "#ec4899", to: "#831843", glow: "rgba(236,72,153,0.5)" },
  { id: "sky", from: "#0ea5e9", to: "#075985", glow: "rgba(14,165,233,0.5)" },
] as const;

function themeFor(code: string) {
  let h = 0;
  for (let i = 0; i < code.length; i++) {
    h = (h * 31 + code.charCodeAt(i)) >>> 0;
  }
  return THEMES[h % THEMES.length];
}

function themeById(id: string | null, code: string) {
  return THEMES.find((theme) => theme.id === id) ?? themeFor(code);
}

function formatPoints(v: number) {
  return v.toLocaleString("vi-VN");
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function GiftCardViewer(props: GiftCardViewerProps) {
  const { user, loading: authLoading } = useAuth();
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
    themeId,
    isScratched,
    canReveal,
  } = props;

  const reducedMotion = useReducedMotion();
  const stageRef = useRef<HTMLDivElement>(null);
  const [flipped, setFlipped] = useState(false);
  const [scratched, setScratched] = useState(isScratched);
  const scratchCanvasRef = useRef<HTMLCanvasElement>(null);
  const scratchPointsRef = useRef<{ x: number; y: number } | null>(null);
  const scratchCompleteRef = useRef(isScratched || !canReveal);
  const scratchCoverageCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const scratchLastCoverageCheckRef = useRef(0);
  const scratchAudioRef = useRef<InstanceType<typeof AudioContext> | null>(null);
  const scratchNoiseRef = useRef<AudioBufferSourceNode | null>(null);
  const scratchGainRef = useRef<GainNode | null>(null);
  const scratchSoundTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    scratchNoiseRef.current?.stop();
    void scratchAudioRef.current?.close();
  }, []);

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
    if (!scratched) {
      toast.error("Hãy cào lớp phủ để xem mã thẻ trước");
      return;
    }
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Đã sao chép mã thẻ");
    } catch {
      toast.error("Không thể sao chép");
    }
  }, [code, scratched]);

  useEffect(() => {
    const canvas = scratchCanvasRef.current;
    if (!canvas || scratched) return;
    const rect = canvas.getBoundingClientRect();
    const scale = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * scale);
    canvas.height = Math.round(rect.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const coverageCanvas = document.createElement("canvas");
    coverageCanvas.width = canvas.width;
    coverageCanvas.height = canvas.height;
    scratchCoverageCanvasRef.current = coverageCanvas;
    const coverageCtx = coverageCanvas.getContext("2d");
    if (!coverageCtx) return;
    coverageCtx.fillStyle = "#000";
    coverageCtx.fillRect(0, 0, canvas.width, canvas.height);
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, "#cbd5e1");
    gradient.addColorStop(0.5, "#f8fafc");
    gradient.addColorStop(1, "#94a3b8");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.globalAlpha = 0.24;
    for (let i = -canvas.height; i < canvas.width; i += 5 * scale) {
      ctx.strokeStyle = i % (20 * scale) === 0 ? "#fff" : "#64748b";
      ctx.lineWidth = 0.7 * scale;
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + canvas.height, canvas.height);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.16;
    for (let i = 0; i < 180; i++) {
      const x = ((i * 67) % 997) / 997 * canvas.width;
      const y = ((i * 139) % 991) / 991 * canvas.height;
      ctx.fillStyle = i % 2 ? "#fff" : "#334155";
      ctx.fillRect(x, y, scale, scale);
    }
    ctx.restore();
    ctx.fillStyle = "#334155";
    ctx.font = `bold ${Math.round(12 * scale)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText("CÀO ĐỂ XEM MÃ", canvas.width / 2, canvas.height / 2 + 4 * scale);
    return () => {
      canvas.width = 0;
      canvas.height = 0;
      coverageCanvas.width = 0;
      coverageCanvas.height = 0;
      scratchCoverageCanvasRef.current = null;
    };
  }, [scratched]);

  const playScratchSound = useCallback(() => {
    try {
      const AudioContextCtor = window.AudioContext;
      if (!AudioContextCtor) return;
      const audio = scratchAudioRef.current ?? new AudioContextCtor();
      scratchAudioRef.current = audio;
      if (audio.state === "suspended") void audio.resume();

      if (!scratchNoiseRef.current) {
        const buffer = audio.createBuffer(1, audio.sampleRate, audio.sampleRate);
        const samples = buffer.getChannelData(0);
        for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
        const noise = audio.createBufferSource();
        const filter = audio.createBiquadFilter();
        const gain = audio.createGain();
        noise.buffer = buffer;
        noise.loop = true;
        filter.type = "highpass";
        filter.frequency.value = 900;
        gain.gain.value = 0;
        noise.connect(filter).connect(gain).connect(audio.destination);
        noise.start();
        scratchNoiseRef.current = noise;
        scratchGainRef.current = gain;
      }

      const gain = scratchGainRef.current;
      if (!gain) return;
      gain.gain.cancelScheduledValues(audio.currentTime);
    gain.gain.setTargetAtTime(0.045, audio.currentTime, 0.008);
    if (scratchSoundTimerRef.current) clearTimeout(scratchSoundTimerRef.current);
    scratchSoundTimerRef.current = setTimeout(() => {
      gain.gain.setTargetAtTime(0, audio.currentTime, 0.012);
      scratchSoundTimerRef.current = null;
    }, 65);
    } catch {
      // Audio is optional; scratching must remain available if browser audio is blocked.
    }
  }, []);

  const stopScratchSound = useCallback(() => {
    const audio = scratchAudioRef.current;
    const gain = scratchGainRef.current;
    if (!audio || !gain) return;
    if (scratchSoundTimerRef.current) clearTimeout(scratchSoundTimerRef.current);
    scratchSoundTimerRef.current = null;
    gain.gain.cancelScheduledValues(audio.currentTime);
    gain.gain.setTargetAtTime(0, audio.currentTime, 0.025);
  }, []);

  const scratch = useCallback((e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!canReveal || scratchCompleteRef.current || scratched) return;
    const canvas = scratchCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const coverageCanvas = scratchCoverageCanvasRef.current;
    const coverageCtx = coverageCanvas?.getContext("2d");
    if (!coverageCanvas || !coverageCtx) return;
    const rect = canvas.getBoundingClientRect();
    const samples = e.nativeEvent.getCoalescedEvents?.() ?? [e.nativeEvent];
    playScratchSound();
    ctx.globalCompositeOperation = "destination-out";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 38 * (canvas.width / rect.width);
    coverageCtx.globalCompositeOperation = "destination-out";
    coverageCtx.lineCap = "round";
    coverageCtx.lineJoin = "round";
    coverageCtx.lineWidth = ctx.lineWidth;
    for (const sample of samples) {
      const x = (sample.clientX - rect.left) * (canvas.width / rect.width);
      const y = (sample.clientY - rect.top) * (canvas.height / rect.height);
      const previous = scratchPointsRef.current;
      ctx.beginPath();
      coverageCtx.beginPath();
      if (previous) {
        const middleX = (previous.x + x) / 2;
        const middleY = (previous.y + y) / 2;
        ctx.moveTo(previous.x, previous.y);
        ctx.quadraticCurveTo(previous.x, previous.y, middleX, middleY);
        ctx.lineTo(x, y);
        coverageCtx.moveTo(previous.x, previous.y);
        coverageCtx.quadraticCurveTo(previous.x, previous.y, middleX, middleY);
        coverageCtx.lineTo(x, y);
      } else {
        ctx.moveTo(x, y);
        ctx.lineTo(x + 0.1, y + 0.1);
        coverageCtx.moveTo(x, y);
        coverageCtx.lineTo(x + 0.1, y + 0.1);
      }
      ctx.stroke();
      coverageCtx.stroke();
      scratchPointsRef.current = { x, y };
    }
    const now = performance.now();
    if (now - scratchLastCoverageCheckRef.current < 120) return;
    scratchLastCoverageCheckRef.current = now;
    const pixels = coverageCtx.getImageData(0, 0, coverageCanvas.width, coverageCanvas.height).data;
    let remaining = 0;
    for (let i = 3; i < pixels.length; i += 4) if (pixels[i] > 0) remaining++;
    if (remaining / (coverageCanvas.width * coverageCanvas.height) > 0.08) return;
    scratchCompleteRef.current = true;
    setScratched(true);
    fetch("/api/gift-cards/scratch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    })
      .then((response) => {
        if (!response.ok) throw new Error("Could not save scratch status");
      })
      .catch(() => toast.error("Không thể lưu trạng thái cào. Vui lòng thử lại."));
  }, [canReveal, code, playScratchSound, scratched]);

  // Card availability
  const usable = isActive && !isRedeemed && !isExpired && restricted;
  const redeemPath = `/rewards/gift-card?code=${encodeURIComponent(code)}`;
  const loginHref = `/login?next=${encodeURIComponent(`/gift-card/${encodeURIComponent(code)}`)}`;
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

  const t = themeById(themeId, code);
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
          <ArrowLeft className="h-3.5 w-3.5" />
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
          {usable ? (
            <CheckCircle2 className="h-3.5 w-3.5" />
          ) : (
            <CircleAlert className="h-3.5 w-3.5" />
          )}
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
          className="relative aspect-[1.586/1] w-full select-none"
          style={{
            transformStyle: "preserve-3d",
            rotateX: springX,
            rotateY: combinedY,
          }}
        >
          {/* ── Front face ── */}
          <div
            className={`absolute inset-0 overflow-hidden rounded-3xl p-5 shadow-[0_24px_70px_-12px_rgba(0,0,0,0.8)] ${canReveal ? "cursor-pointer" : "cursor-default"}`}
            onClick={(e) => { if (canReveal && !flipped && !(e.target instanceof HTMLCanvasElement)) toggleFlip(); }}
            role={canReveal ? "button" : undefined}
            aria-label={canReveal ? "Lật thẻ để xem mã" : undefined}
            tabIndex={canReveal ? 0 : -1}
            onKeyDown={(e) => { if (canReveal && !flipped && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); toggleFlip(); } }}
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
                  <Gift className="h-5 w-5 text-white/90" />
                  <span className="text-xs font-black uppercase tracking-[0.2em] text-white/90">
                    Gift Card
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {restricted && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-black/25 px-2 py-1 text-[10px] font-bold text-white/90">
                      <Lock className="h-3 w-3" />
                      Riêng tư
                    </span>
                  )}
                  {canReveal && (
                    <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-white/70">
                      <FlipHorizontal2 className="h-3.5 w-3.5" />
                      Lật để xem mã
                    </span>
                  )}
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
          {canReveal && <div
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
              <div className="relative overflow-hidden rounded-xl">
                {restricted ? (
                  <>
                    <code className="block bg-white/5 px-3 py-2.5 text-center font-mono text-sm font-bold tracking-[0.15em] text-amber-300">
                      {code}
                    </code>
                    {!scratched && (
                      <canvas
                        ref={scratchCanvasRef}
                        aria-label="Cào lớp phủ để hiện mã thẻ"
                        className="absolute inset-0 h-full w-full touch-none cursor-[url('/scratch-cursor.svg')_12_12,_crosshair]"
                        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); scratchPointsRef.current = null; scratch(e); }}
                        onPointerMove={(e) => { if (e.buttons === 1) scratch(e); }}
                        onPointerUp={(e) => { scratchPointsRef.current = null; stopScratchSound(); if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); }}
                        onPointerCancel={() => { scratchPointsRef.current = null; stopScratchSound(); }}
                      />
                    )}
                  </>
                ) : (
                  <p className="flex min-h-11 items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-sm font-semibold leading-relaxed text-slate-200" role="status">
                    <Lock className="h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />
                    Bạn không thể sử dụng mã gift card này.
                  </p>
                )}
              </div>
              {expiresAt && (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                  <Clock3 className="h-3.5 w-3.5" />
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
                disabled={!scratched || !canReveal}
                onClick={(e) => {
                  e.stopPropagation();
                  void copy();
                }}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-black text-slate-950 transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
              >
                <Copy className="h-4 w-4" />
                Sao chép
              </button>
              <button
                type="button"
                disabled={!canReveal}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFlip();
                }}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
              >
                  {flipped ? "Mặt trước" : "Mặt sau"}
              </button>
            </div>
          </div>}
        </motion.div>
      </div>

      {/* Footer / CTA */}
      <div className="w-full max-w-md space-y-3">
        {user && restricted && !canReveal && (
            <p className="flex items-center justify-center gap-1.5 text-center text-xs font-semibold text-slate-400">
              <Lock className="h-3.5 w-3.5" />
              Thẻ này chỉ dành cho khách hàng được chỉ định
            </p>
        )}
        {!user && !authLoading ? (
          <Link
            href={loginHref}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-3.5 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-amber-900/40 transition-transform active:scale-[0.98]"
          >
            <Gift className="h-4 w-4" />
            Đăng nhập để sử dụng
          </Link>
        ) : usable ? (
          <Link
            href={redeemPath}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-3.5 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-amber-900/40 transition-transform active:scale-[0.98]"
          >
            <Gift className="h-4 w-4" />
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
