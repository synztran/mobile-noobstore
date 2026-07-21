"use client";

import type { HeroCampaign } from "@/app/api/home/hero/route";
import { useHomeHero } from "@/lib/react-query/home/api/useHomeQueries";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

const SLIDE_DURATION = 5000;

export function HeroSection({ initialSlides }: { initialSlides?: HeroCampaign[] }) {
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const { data: fetchedSlides = [], isLoading } = useHomeHero({
    enabled: !initialSlides || initialSlides.length === 0,
  });
  const slides = (initialSlides?.length ? initialSlides : fetchedSlides) as HeroCampaign[];

  const goTo = useCallback(
    (idx: number) => {
      setCurrent((idx + slides.length) % slides.length);
    },
    [slides.length]
  );

  // Auto-advance
  useEffect(() => {
    if (slides.length <= 1 || isPaused) return;
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % slides.length);
    }, SLIDE_DURATION);
    return () => clearInterval(timer);
  }, [slides.length, isPaused]);

  // Touch / swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    setIsPaused(true);
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 40) goTo(current + (delta < 0 ? 1 : -1));
    touchStartX.current = null;
    setIsPaused(false);
  };

  if (isLoading) {
    return (
      <section className="relative !mt-0 h-[680px] animate-pulse overflow-hidden bg-surface-container">
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/50 to-surface-container-high" />

        <div className="absolute inset-0 z-10 flex flex-col justify-end p-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div className="h-5 w-1 rounded-full bg-primary/40" />
              <div className="h-3 w-40 rounded bg-surface-container-high" />
            </div>

            <div className="space-y-3">
              <div className="h-10 w-5/6 rounded bg-surface-container-high" />
              <div className="h-10 w-2/3 rounded bg-surface-container-high" />
            </div>

            <div className="space-y-2">
              <div className="h-3 w-3/4 rounded bg-surface-container-high" />
              <div className="h-3 w-2/3 rounded bg-surface-container-high" />
            </div>

            <div className="mt-2 h-12 w-full rounded-xl bg-surface-container-high" />
          </div>

          <div className="mt-6 flex items-center justify-center gap-2">
            <div className="h-1.5 w-6 rounded-full bg-surface-container-high" />
            <div className="h-1.5 w-1.5 rounded-full bg-surface-container-high" />
            <div className="h-1.5 w-1.5 rounded-full bg-surface-container-high" />
          </div>
        </div>
      </section>
    );
  }

  if (slides.length === 0) return null;

  const slide = slides[current];

  return (
    <section
      className="relative !mt-0 h-[680px] select-none overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Slides */}
      {slides.map((s, i) => (
        <div
          key={s.id}
          className={`absolute inset-0 transition-all duration-700 ${
            i === current
              ? "scale-100 opacity-100 blur-0"
              : "pointer-events-none scale-105 opacity-0 blur-[2px]"
          }`}
        >
          <Image
            src={s.image_url || ""}
            alt={s.title}
            fill
            className="object-cover"
            priority={i === 0}
            fetchPriority={i === 0 ? "high" : "auto"}
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/40 to-surface/5" />
          <div className="absolute inset-0 bg-surface/5" />
        </div>
      ))}

      {/* Content */}
      <div className="absolute inset-0 z-10 flex flex-col justify-end p-4">
        <div
          key={current}
          className="flex animate-[fadeSlideUp_0.5s_ease_forwards] flex-col gap-4"
        >
          <div className="flex items-center gap-2">
            <div className="h-5 w-1 rounded-full bg-primary" />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-on-primary-fixed-variant drop-shadow-sm">
              {slide.subtitle}
            </p>
          </div>
          <p className="text-5xl font-black uppercase leading-tight tracking-tighter text-on-surface drop-shadow-sm">
            {slide.title}
          </p>
          <p className="max-w-xs text-sm leading-relaxed text-on-surface-variant drop-shadow-sm">
            {slide.description}
          </p>
          <Link
            href={slide.cta_link}
            className="mt-2 flex w-full items-center justify-between rounded-xl bg-primary px-6 py-4 text-xs font-black tracking-widest text-on-primary shadow-lg transition-transform active:scale-95"
          >
            <span>{slide.cta_text}</span>
            <ArrowRight size={16} />
          </Link>
        </div>

        {/* Dot indicators */}
        {slides.length > 1 && (
          <div className="mt-6 flex items-center justify-center gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                aria-label={`Go to slide ${i + 1}`}
                onClick={() => goTo(i)}
                className={`rounded-full transition-all duration-300 ${
                  i === current
                    ? "h-1.5 w-6 animate-[pulse-glow_2s_ease-in-out_infinite] bg-primary"
                    : "h-1.5 w-1.5 bg-on-surface/30"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
