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
      className={`relative flex flex-col gap-8 overflow-hidden bg-on-surface px-6 py-8 text-surface transition-all duration-700 ${
        visible ? "opacity-100" : "translate-y-4 opacity-0"
      }`}
    >
      {isLoading ? (
        <div className="animate-pulse space-y-6">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 rounded-lg bg-surface-container" />
          ))}
        </div>
      ) : (
        <>
          {props.map(({ id, icon: iconName, heading, body }) => {
            const Icon = ICON_MAP[iconName] || Truck;
            return (
              <div key={id} className="relative z-10 flex items-start gap-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary-fixed/20">
                  <Icon size={24} className="text-primary-fixed-dim" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold uppercase leading-tight tracking-wide">
                    {heading}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-outline">
                    {body}
                  </p>
                </div>
              </div>
            );
          })}
        </>
      )}
    </section>
  );
}
