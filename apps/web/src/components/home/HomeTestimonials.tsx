"use client";

import { useHomeTestimonials } from "@/lib/react-query/home/api/useHomeQueries";
import { Star } from "lucide-react";
import { useState } from "react";

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
      <div className="mr-4 flex w-[300px] flex-shrink-0 flex-col rounded-3xl border border-outline-variant/30 bg-surface-container-lowest p-5 lg:w-[340px] lg:p-6">
        <div className="flex items-center justify-between">
          <div className="h-5 w-20 rounded-full bg-surface-container-high" />
          <div className="h-3 w-16 rounded bg-surface-container-high" />
        </div>
        <div className="mt-4 space-y-2">
          <div className="h-3 w-full rounded bg-surface-container-high" />
          <div className="h-3 w-11/12 rounded bg-surface-container-high" />
          <div className="h-3 w-4/5 rounded bg-surface-container-high" />
        </div>
        <div className="mt-6 flex items-center gap-3 border-t border-outline-variant/20 pt-4">
          <div className="h-10 w-10 rounded-full bg-surface-container-high" />
          <div className="space-y-1.5">
            <div className="h-3 w-20 rounded bg-surface-container-high" />
            <div className="h-2.5 w-16 rounded bg-surface-container-high" />
          </div>
        </div>
      </div>
    </div>
  );
}

function TestimonialCard({
  name,
  rating,
  text,
  product,
  image_url,
}: {
  name: string | null;
  rating: number;
  text: string;
  product: string | null;
  image_url: string | null;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  return (
    <article className="group/card relative mr-4 flex w-[300px] flex-shrink-0 flex-col overflow-hidden rounded-3xl border border-outline-variant/30 bg-surface-container-lowest p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/10 lg:w-[340px] lg:p-6">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-1 -top-7 select-none font-serif text-[104px] leading-none text-primary/[0.07]"
      >
        &rdquo;
      </span>

      <div className="relative flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-container px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-on-surface-variant">
          <GoogleIcon className="h-3.5 w-3.5" />
          Google
        </span>
        <span
          className="flex items-center gap-0.5"
          aria-label={`${rating} trên 5 sao`}
        >
          {Array.from({ length: 5 }, (_, si) => (
            <Star
              key={si}
              size={13}
              className={
                si < rating
                  ? "fill-amber-400 text-amber-400"
                  : "text-outline-variant"
              }
              strokeWidth={1.5}
            />
          ))}
        </span>
      </div>

      <p className="relative mt-4 line-clamp-4 text-[15px] font-medium leading-relaxed text-on-surface">
        &ldquo;{text}&rdquo;
      </p>

      <div className="relative mt-auto flex items-center gap-3 border-t border-outline-variant/20 pt-4">
        {image_url && !imageFailed ? (
          <img
            src={image_url}
            alt="Ảnh review khách hàng"
            loading="lazy"
            onError={() => setImageFailed(true)}
            className="h-12 w-12 shrink-0 rounded-xl border border-outline-variant/30 object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-sm font-black uppercase text-white ring-2 ring-surface-container-lowest">
            {(name || "K").charAt(0)}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-on-surface">
            {name || "Khách hàng NoobStore"}
          </p>
          {product && (
            <span className="mt-1 inline-flex max-w-full items-center gap-1 truncate rounded-full bg-primary-fixed/70 px-2 py-0.5 text-[10px] font-bold text-primary">
              {product}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

export function HomeTestimonials() {
  const { data, isLoading } = useHomeTestimonials();
  const testimonials = data?.testimonials ?? [];
  const summary = data?.summary;

  // Constant reading pace: 356px is card + gap at lg, ~80px/s feels readable.
  // Tying duration to the review count keeps speed stable as reviews grow.
  const marqueeSeconds = Math.max(
    50,
    Math.round((testimonials.length * 356) / 80)
  );

  return (
    <section className="space-y-4 overflow-hidden rounded-md border border-outline-variant/30 bg-surface-container-lowest p-4 md:space-y-6 lg:space-y-6 lg:rounded-none lg:border-none lg:bg-transparent">
      <div className="flex flex-col gap-4 rounded-md sm:flex-row sm:items-start sm:justify-between md:rounded-none md:border-none md:bg-transparent md:p-0 lg:p-0">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-primary">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            Đánh giá khách hàng
          </p>
          <h2 className="text-xl font-black tracking-tight text-on-surface md:text-2xl lg:text-2xl">
            Khách hàng nói gì về NoobStore
          </h2>
          <p className="hidden text-sm text-on-surface-variant md:block lg:block">
            Đánh giá thật từ những người đã nhận hàng.
          </p>
        </div>

        {!isLoading && (summary?.count ?? 0) > 0 && (
          <div className="flex shrink-0 flex-col items-end gap-2">
            {/* Button viết đánh giá Google (bên trái badge thông tin) */}
            <a
              href={
                process.env.NEXT_PUBLIC_GOOGLE_REVIEW_URL ||
                "https://maps.app.goo.gl/RujaNa6xfJ1yRqEj8"
              }
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-[60px] max-w-max items-center gap-2 rounded-2xl border border-outline-variant/30 bg-white px-2.5 py-2.5 text-left text-xs font-bold text-on-surface shadow-ambient-sm transition-all hover:bg-surface-container-low active:scale-95 dark:bg-surface-container-lowest"
            >
              <span className="relative flex h-9 w-9 shrink-0 items-center justify-center">
                <GoogleIcon className="h-8 w-8" />
                <span className="absolute bottom-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-surface-container-lowest p-0.5">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                </span>
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <div className="flex items-baseline justify-between gap-1">
                  <div className="flex items-center">
                    <p className="mt-0.5 text-xs font-semibold tracking-wide">
                      {summary?.count ?? 0} đánh giá
                    </p>
                  </div>
                  <div>
                    <span className="text-base font-black leading-none text-on-surface">
                      {summary?.averageRating?.toFixed(1) ?? "—"}
                    </span>
                    <span className="text-xs font-semibold text-on-surface-variant">
                      / 5
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-medium text-on-surface-variant">
                  Chia sẻ trải nghiệm của bạn
                </span>
              </span>
            </a>

            {/* Badge thông tin đánh giá */}
            {/* <div className="flex min-h-[60px] shrink-0 items-center gap-2 rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-2.5 shadow-ambient-sm">
              <span className="relative flex h-9 w-9 shrink-0 items-center justify-center">
                <GoogleIcon className="h-8 w-8" />
                <span className="absolute bottom-0 right-0 flex h-4 w-4 items-center justify-center rounded-full border-2 border-surface-container-lowest bg-surface-container-lowest">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                </span>
              </span>
              <div>
                <p className="flex items-baseline gap-1">
                  <span className="text-lg font-black leading-none text-on-surface">
                    {summary?.averageRating?.toFixed(1) ?? "—"}
                  </span>
                  <span className="text-xs font-semibold text-on-surface-variant">
                    / 5
                  </span>
                </p>
                <div className="flex items-center">
                  <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-outline">
                    {summary?.count ?? 0} đánh giá
                  </p>
                </div>
              </div>
            </div> */}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex gap-4 overflow-hidden">
          {[1, 2, 3, 4].map((i) => (
            <TestimonialSkeleton key={i} />
          ))}
        </div>
      ) : testimonials.length === 0 ? null : (
        <div className="group relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 hidden w-16 bg-gradient-to-r from-surface-container-low to-transparent sm:w-24 lg:block" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 hidden w-16 bg-gradient-to-l from-surface-container-low to-transparent sm:w-24 lg:block" />
          <div
            className="testimonial-track flex w-max"
            style={
              {
                "--testimonial-duration": `${marqueeSeconds}s`,
              } as React.CSSProperties
            }
          >
            {[...testimonials, ...testimonials].map((t, i) => (
              <TestimonialCard key={i} {...t} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
