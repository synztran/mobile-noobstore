"use client";

import { GachaPromo } from "@/components/home/GachaPromo";
import { CommunityGallery } from "@/components/home/CommunityGallery";
import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { LazyNearViewport } from "@/components/ui/LazyNearViewport";

export function GachaFeatureSlot() {
  const [hasActiveEvent, setHasActiveEvent] = useState(false);

  useEffect(() => {
    let mounted = true;

    fetch("/api/gacha/active-event")
      .then((response) => (response.ok ? response.json() : { event: null }))
      .then((result: { event: { id: number } | null }) => {
        if (mounted) setHasActiveEvent(Boolean(result.event));
      })
      .catch(() => {
        if (mounted) setHasActiveEvent(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div
      className={`home-community-checkin-grid grid gap-6 ${
        hasActiveEvent
          ? "lg:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)] lg:items-start lg:gap-x-8 xl:gap-x-10"
          : "grid-cols-1"
      }`}
    >
      <div className="home-community-gallery min-h-[380px]">
        <LazyNearViewport>
          <CommunityGallery />
        </LazyNearViewport>
      </div>
      {hasActiveEvent && (
        <div className="home-checkin-slot flex flex-col gap-4 px-6 lg:gap-4 lg:px-0">
          <div className="home-community-title flex items-center gap-3">
            <span className="home-community-title-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-fixed text-primary motion-safe:animate-[community-feature-arrive_500ms_cubic-bezier(0.16,1,0.3,1)_both]">
              <Sparkles aria-hidden="true" className="h-5 w-5" />
            </span>
            <h2 className="text-lg font-black tracking-tight text-on-surface motion-safe:animate-[community-feature-arrive_500ms_cubic-bezier(0.16,1,0.3,1)_both] sm:text-xl">
              Khám phá tính năng mới
            </h2>
          </div>
          <GachaPromo />
        </div>
      )}
    </div>
  );
}
