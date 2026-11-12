import { ArrowRight, Dices, Sparkles } from "lucide-react";
import Link from "next/link";

const PRIZES = ["Keycap", "Artisan", "Voucher"];

/**
 * Gacha entry point for the home community column.
 *
 * A terracotta-edged ticket on the same deep-espresso ink as OurStrongPoints.
 * One authored motion moment: the dice tile rolls on a slow beat, with a ring
 * pulse and two ambient sparkles. All loops are CSS so they stay off the main
 * thread, and they stop for reduced-motion users.
 */
export function GachaPromo() {
  return (
    <section
      aria-labelledby="home-gacha-title"
      className="relative isolate rounded-3xl bg-[linear-gradient(140deg,#f08a61_0%,#9b3f1c_42%,rgba(155,63,28,0.18)_74%,rgba(255,255,255,0.10)_100%)] p-[2px] shadow-ambient-sm transition-transform duration-200 ease-out [@media(hover:hover)]:hover:-translate-y-0.5"
    >
      <div className="relative overflow-hidden rounded-[22px] bg-[#1c0f0c] px-5 py-6 text-surface sm:px-6 lg:py-7">
        <style>{`
          @keyframes gacha-dice-roll {
            0%, 66%, 100% { transform: rotate(0deg) translateY(0); }
            72% { transform: rotate(-16deg) translateY(-3px); }
            79% { transform: rotate(12deg) translateY(0); }
            86% { transform: rotate(-7deg) translateY(-1px); }
            92% { transform: rotate(3deg) translateY(0); }
          }
          @keyframes gacha-ring-pulse {
            0%, 66%, 100% { opacity: 0; transform: scale(0.9); }
            72% { opacity: 0.45; transform: scale(1.05); }
            88% { opacity: 0; transform: scale(1.65); }
          }
          @keyframes gacha-twinkle {
            0%, 100% { opacity: 0.2; transform: translateY(0) scale(0.9); }
            50% { opacity: 0.9; transform: translateY(-3px) scale(1); }
          }
          .gacha-dice { animation: gacha-dice-roll 5.5s cubic-bezier(0.77, 0, 0.175, 1) infinite; }
          .gacha-ring { animation: gacha-ring-pulse 5.5s cubic-bezier(0.23, 1, 0.32, 1) infinite; }
          .gacha-spark-a { animation: gacha-twinkle 3.6s ease-in-out infinite; }
          .gacha-spark-b { animation: gacha-twinkle 4.4s ease-in-out 0.8s infinite; }
          @media (prefers-reduced-motion: reduce) {
            .gacha-dice, .gacha-ring, .gacha-spark-a, .gacha-spark-b { animation: none; }
            .gacha-ring { opacity: 0; }
          }
        `}</style>

        {/* Fine dot-grid texture — terracotta at 22% */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(rgba(155, 63, 28, 0.55) 1px, transparent 1px)",
            backgroundSize: "18px 18px",
            opacity: 0.22,
          }}
        />
        <Sparkles
          aria-hidden="true"
          className="gacha-spark-a pointer-events-none absolute right-6 top-6 h-4 w-4 text-primary-fixed/70"
        />
        <Sparkles
          aria-hidden="true"
          className="gacha-spark-b pointer-events-none absolute right-14 top-20 h-3 w-3 text-primary-fixed/50"
        />
        <Dices
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-9 -right-7 h-36 w-36 text-primary-fixed/[0.06]"
          strokeWidth={1}
        />

        <div className="relative z-10 flex items-start gap-4">
          <div className="relative flex h-14 w-14 shrink-0 items-center justify-center">
            <span
              aria-hidden="true"
              className="gacha-ring pointer-events-none absolute inset-0 rounded-2xl border border-primary-fixed/60"
            />
            <div className="gacha-dice flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#c96a45] to-primary ring-1 ring-white/15 shadow-[0_12px_24px_-14px_rgba(0,0,0,0.9)]">
              <Dices
                size={28}
                className="text-primary-fixed"
                strokeWidth={1.5}
                aria-hidden="true"
              />
            </div>
          </div>

          <div className="min-w-0">
            <h2
              id="home-gacha-title"
              className="text-balance text-xl font-extrabold leading-tight tracking-tight text-surface lg:text-2xl"
            >
              Quay gacha mỗi ngày
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-surface/70">
              Đổi điểm lấy lượt quay — trúng keycap, artisan và voucher.
            </p>
          </div>
        </div>

        <div className="relative z-10 mt-5 flex flex-wrap gap-1.5">
          {PRIZES.map((prize) => (
            <span
              key={prize}
              className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-primary-fixed/80"
            >
              {prize}
            </span>
          ))}
        </div>

        <Link
          href="/gacha"
          className="group relative z-10 mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-xs font-black uppercase tracking-[0.14em] text-on-primary transition-[filter,transform] duration-200 ease-out hover:brightness-110 active:scale-[0.99]"
        >
          <Dices size={15} aria-hidden="true" />
          Quay ngay
          <ArrowRight
            size={14}
            aria-hidden="true"
            className="transition-transform duration-200 ease-out group-hover:translate-x-0.5"
          />
        </Link>
        <p className="relative z-10 mt-2.5 text-center text-[11px] font-semibold text-surface/55">
          Nhận lượt quay miễn phí định kỳ
        </p>
      </div>
    </section>
  );
}
