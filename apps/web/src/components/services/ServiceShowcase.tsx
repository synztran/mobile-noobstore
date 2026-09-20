"use client";

import type { BookingSection } from "@/app/api/services/booking-config/route";
import Image from "@/components/ui/AdaptiveImage";
import { formatVND } from "@/lib/currency";
import { ArrowRight, Clock } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { getSectionIcon } from "./sectionIcons";

/**
 * The public face of the services page.
 *
 * Before this existed, a signed-out visitor (and every crawler) got a hero, a
 * "coming soon" teaser and a loading skeleton — no service was named, no price
 * shown, no duration given, because all of it lived inside the auth-gated
 * configurator. This renders the real thing instead, from the same
 * `getBookingConfigData()` payload the booking flow uses: each group's own
 * photo, title, hint, its lowest real `base_price`, and its shortest handling
 * time.
 *
 * Everything shown here is data or copy that already existed. Nothing about
 * price or turnaround is invented, which is why unbookable or free-only groups
 * simply omit the line they cannot answer.
 *
 * Data arrives as a prop from the server component so it is present in the
 * first HTML response — a client component fetching on mount would defeat the
 * point.
 */

/** Lowest real price across a group's services, or null when there is none. */
function lowestPrice(section: BookingSection): number | null {
  const prices = section.services
    .map((service) => service.base_price)
    .filter((price) => price > 0);
  return prices.length > 0 ? Math.min(...prices) : null;
}

/** Shortest handling time in the group, or null when none is recorded. */
function shortestHandling(section: BookingSection): number | null {
  const days = section.services
    .map((service) => service.handling_days)
    .filter((value) => value > 0);
  return days.length > 0 ? Math.min(...days) : null;
}

function ShowcaseCard({
  section,
  index,
}: {
  section: BookingSection;
  index: number;
}) {
  const SectionIcon = getSectionIcon(section.key);
  const from = lowestPrice(section);
  const days = shortestHandling(section);

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.3, ease: "easeOut", delay: Math.min(index * 0.05, 0.2) }}
      className="overflow-hidden rounded-2xl bg-surface-container"
    >
      {/*
        Same-page anchor to the booking section, via `next/link` per the
        repo's linking rule (a bare `<a>` is reserved for `target="_blank"`
        externals). It lands on the gate for a signed-out visitor and on the
        group selector once signed in, so it never dead-ends.
      */}
      <Link href="#dat-lich" className="block">
        {/* `lubricant` ships an empty hero URL, so the frame is conditional. */}
        {section.heroImageUrl ? (
          <figure className="relative aspect-[16/9] w-full">
            <Image
              src={section.heroImageUrl}
              alt={`${section.title} tại Noobstore`}
              fill
              sizes="(max-width: 640px) 100vw, 50vw"
              className="object-cover"
            />
          </figure>
        ) : null}

        <div className="space-y-2 p-4">
          <div className="flex items-center gap-2.5">
            {/* Olive carries group identity; terracotta stays for action. */}
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-secondary-container text-on-secondary-fixed-variant">
              <SectionIcon className="h-4 w-4" />
            </span>
            <h3 className="min-w-0 text-sm font-extrabold text-on-surface">
              {section.title}
            </h3>
          </div>

          {section.hint ? (
            <p className="line-clamp-2 text-sm leading-relaxed text-on-surface-variant">
              {section.hint}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5">
            {from !== null ? (
              <span className="text-sm font-extrabold text-primary">
                từ {formatVND(from)}
              </span>
            ) : null}

            {days !== null ? (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-on-surface-variant">
                <Clock className="h-3.5 w-3.5" />
                {days} ngày
              </span>
            ) : null}

            <span className="ml-auto inline-flex items-center gap-1 text-xs font-bold tracking-[0.08em] text-on-surface-variant uppercase">
              Đặt lịch
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}

export function ServiceShowcase({ sections }: { sections: BookingSection[] }) {
  // No services to show (empty catalogue or a failed fetch) — render nothing
  // rather than an empty frame; the booking section below still works.
  if (sections.length === 0) return null;

  return (
    <section aria-labelledby="dich-vu-nhom" className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2
          id="dich-vu-nhom"
          className="text-base font-extrabold text-on-surface"
        >
          Dịch vụ tại Noobstore
        </h2>
        <span className="shrink-0 text-xs font-bold text-on-surface-variant">
          {sections.length} nhóm
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {sections.map((section, idx) => (
          <ShowcaseCard key={section.key} section={section} index={idx} />
        ))}
      </div>
    </section>
  );
}
