"use client";

import { useHomeTestimonials } from "@/lib/react-query/home/api/useHomeQueries";
import { Star } from "lucide-react";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none">
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}

function TestimonialSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="flex w-[300px] flex-shrink-0 flex-col rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-5">
        <div className="h-4 w-24 rounded bg-surface-container-high" />
        <div className="mt-2 h-3 w-20 rounded bg-surface-container-high" />
        <div className="mt-2 space-y-2">
          <div className="h-3 w-full rounded bg-surface-container-high" />
          <div className="h-3 w-4/5 rounded bg-surface-container-high" />
        </div>
        <div className="mt-3 flex items-center gap-3 border-t border-outline-variant/15 pt-3">
          <div className="h-8 w-8 rounded-full bg-surface-container-high" />
          <div className="space-y-1">
            <div className="h-3 w-16 rounded bg-surface-container-high" />
            <div className="h-2 w-12 rounded bg-surface-container-high" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function HomeTestimonials() {
  const { data: testimonials = [], isLoading } = useHomeTestimonials();

  return (
    <section className="overflow-hidden px-6">
      <style>{`
        @keyframes testimonial-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
      <div className="mb-5 flex items-center gap-2">
        <GoogleIcon className="h-5 w-5" />
        <p className="text-xl font-black tracking-tight text-on-surface">
          Đánh giá từ khách hàng
        </p>
      </div>
      {isLoading ? (
        <div className="flex gap-4">
          {[1, 2, 3].map((i) => (
            <TestimonialSkeleton key={i} />
          ))}
        </div>
      ) : testimonials.length === 0 ? null : (
        <div className="relative group">
          <div
            className="flex w-max gap-4"
            style={{
              animation: "testimonial-scroll 40s linear infinite",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.animationPlayState = "paused";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.animationPlayState = "running";
            }}
          >
            {[...testimonials, ...testimonials].map((t, i) => (
              <div
                key={i}
                className="flex w-[300px] flex-shrink-0 flex-col rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-5"
              >
                <div className="flex items-center gap-2">
                  <GoogleIcon className="h-4 w-4" />
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-outline">
                    Google Reviews
                  </span>
                </div>
                <div className="mt-2 flex gap-0.5">
                  {Array.from({ length: 5 }, (_, si) => (
                    <Star
                      key={si}
                      size={13}
                      className={
                        si < t.rating
                          ? "fill-amber-400 text-amber-400"
                          : "text-outline-variant"
                      }
                      strokeWidth={1.5}
                    />
                  ))}
                </div>
                <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-on-surface">
                  {t.text}
                </p>
                <div className="mt-auto flex items-center gap-3 border-t border-outline-variant/15 pt-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-fixed text-[11px] font-black uppercase text-primary">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-on-surface">
                      {t.name}
                    </p>
                    <p className="text-[11px] font-medium text-outline">
                      {t.product}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
