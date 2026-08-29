"use client";

import { withAuthRedirect } from "@/components/auth/withAuthRedirect";
import { TopNav } from "@/components/layout/TopNav";
import { ServiceBookingFlow } from "@/components/services/ServiceBookingFlow";
import { ServicesTour } from "@/components/services/ServicesTour";
import { SERVICE_PAGE_HERO_IMAGE } from "@/lib/images";
import { ShieldCheck } from "lucide-react";
import Image from "@/components/ui/AdaptiveImage";
import { useCallback, useRef } from "react";

const ServicesPage = () => {
  const startTourRef = useRef<(() => void) | null>(null);
  const handleTourReady = useCallback((start: () => void) => {
    startTourRef.current = start;
  }, []);

  return (
    <>
      <TopNav
        showBack
        backHref="/"
        title="Dịch vụ"
        showHelp
        onHelpClick={() => startTourRef.current?.()}
      />

      <main className="space-y-5 pb-12">
        <div
          id="tour-hero"
          className="relative h-[55vw] max-h-72 w-full overflow-hidden"
        >
          <Image
            src={SERVICE_PAGE_HERO_IMAGE}
            alt="Dịch vụ bàn phím cơ Noobstore"
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-5">
            <p className="mb-1.5 text-[11px] font-black uppercase tracking-[0.2em] text-primary-action">
              Noobstore — Keyboard services
            </p>
            <p className="max-w-xs text-sm leading-relaxed text-white/80">
              Đặt lịch dịch vụ — tất cả trong một đơn booking.
            </p>
          </div>
        </div>

        <div className="space-y-4 px-4">
          <div className="relative flex items-center gap-4 overflow-hidden rounded-2xl bg-gradient-to-br from-surface-container-lowest to-surface-container-low p-4 shadow-ambient-sm">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-gradient text-white shadow-lg shadow-primary/20">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-on-surface">Middleman</p>
              <p className="mt-0.5 text-xs text-on-surface-variant">
                Giao dịch trung gian an toàn
              </p>
            </div>
            <span className="rounded-full bg-surface-container-high px-3 py-1 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
              Sắp ra mắt
            </span>
          </div>

          <ServiceBookingFlow />
        </div>
      </main>

      <ServicesTour onReady={handleTourReady} />
    </>
  );
};

export default withAuthRedirect(ServicesPage);
