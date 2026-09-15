"use client";

import type { TrustProp } from "@/app/api/home/trust-props/route";
import { useHomeTrustProps } from "@/lib/react-query/home/api/useHomeQueries";
import { Award, ShieldCheck, Truck, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const ICON_MAP: Record<string, React.ElementType> = {
  truck: Truck,
  "shield-check": ShieldCheck,
  award: Award,
  zap: Zap,
};

/**
 * Trust-props band — "Vì sao chọn NoobStore".
 *
 * Flat deep-espresso ink (#221210 — a near-black warmed toward the brand) with
 * a fine terracotta dot-grid texture and an oversized watermark icon instead
 * of any gradient. Items are solid surface cards with hard terracotta icon
 * tiles — a print-like, tactile look that matches the keycap-shop character.
 */
export function OurStrongPoints() {
  const { data: props = [], isLoading } = useHomeTrustProps();
  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className={`relative overflow-hidden bg-[#221210] px-6 py-8 text-surface transition-all duration-700 md:rounded-3xl lg:px-8 ${
        visible ? "opacity-100" : "translate-y-4 opacity-0"
      }`}
    >
      {/* Fine dot-grid texture — terracotta at 12% */}
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
      {/* Oversized watermark icon, bleeding off the right edge */}
      <ShieldCheck
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-10 -right-10 h-56 w-56 text-primary-fixed/[0.06]"
        strokeWidth={1}
      />

      {isLoading ? (
        <div className="relative z-10 grid animate-pulse gap-4 sm:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-white/5" />
          ))}
        </div>
      ) : (
        <div
          className={`relative z-10 gap-4 sm:grid sm:grid-cols-2 ${
            props.length > 2 ? "lg:grid-cols-4" : "lg:grid-cols-2"
          }`}
        >
          {props.map(({ id, icon: iconName, heading, body }) => {
            const Icon = ICON_MAP[iconName] || Truck;
            return (
              <div
                key={id}
                className="group flex items-start gap-3.5 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary-fixed/30 hover:bg-white/[0.06]"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary transition-transform duration-300 group-hover:scale-105">
                  <Icon size={22} className="text-primary-fixed" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-black uppercase leading-tight tracking-[0.12em] text-primary-fixed">
                    {heading}
                  </p>
                  <p className="mt-1.5 text-xs leading-relaxed text-surface/70">
                    {body}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
