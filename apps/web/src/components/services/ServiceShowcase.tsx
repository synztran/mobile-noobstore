"use client";

import type { BookingSection } from "@/app/api/services/booking-config/route";
import Image from "@/components/ui/AdaptiveImage";
import { formatVND } from "@/lib/currency";
import { ChevronRight, Clock } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { getSectionIcon } from "./sectionIcons";

/**
 * The public face of the services page — a **jump rail**, not a catalogue.
 *
 * Every row is real data from the same `getBookingConfigData()` payload the
 * booking flow uses (its own photo, lowest real `base_price`, shortest handling
 * time) and every row scrolls straight to that group in the flow, which is why
 * the id is the group's own `section.key` — the anchor `ServiceSectionCard`
 * exposes. All six used to point at one generic `#dat-lich`, so tapping any of
 * them landed in the same place; see `ServiceBookingSection` for what happens
 * when the flow isn't mounted (the same ids resolve to the login gate).
 *
 * It used to render six 16:9 photo cards, which was a second copy of the group
 * list the flow renders below it: 983px of scrolling to show the same six
 * groups twice, with the first booking control 2127px down the page. The photos
 * survive as 48px thumbnails, so the rows still read as *this group* rather
 * than a generic link list, and the whole rail now costs ~380px.
 *
 * Nothing here is invented: a group with no priced service omits the "từ" line
 * instead of claiming "từ 0 ₫", and one with no recorded turnaround omits the
 * day count rather than guessing.
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

function RailRow({
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
    <motion.li
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{
        duration: 0.3,
        ease: "easeOut",
        delay: Math.min(index * 0.04, 0.2),
      }}
    >
      <Link
        href={`#${section.key}`}
        className="flex items-center gap-3 rounded-2xl bg-surface-container p-3 transition-colors hover:bg-surface-container-high"
      >
        {/* All six groups ship an image today, but a group without one falls
            back to its own icon rather than an empty media frame. */}
        {section.heroImageUrl ? (
          <figure className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl">
            <Image
              src={section.heroImageUrl}
              alt=""
              fill
              sizes="48px"
              className="object-cover"
            />
          </figure>
        ) : (
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary-container text-on-secondary-fixed-variant">
            <SectionIcon className="h-5 w-5" />
          </span>
        )}

        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-extrabold text-on-surface">
            {section.title}
          </span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs">
            {from !== null ? (
              <span className="font-extrabold text-primary">
                từ {formatVND(from)}
              </span>
            ) : null}
            {days !== null ? (
              <span className="inline-flex items-center gap-1 font-bold text-on-surface-variant">
                <Clock className="h-3.5 w-3.5" />
                {days} ngày
              </span>
            ) : null}
          </span>
        </span>

        <ChevronRight className="h-4 w-4 shrink-0 text-on-surface-variant" />
      </Link>
    </motion.li>
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
        {/* Names the row's actual behaviour: these jump to the group below. */}
        <span className="shrink-0 text-xs font-bold text-on-surface-variant">
          Chạm để chọn nhóm
        </span>
      </div>

      <ul className="grid gap-2 sm:grid-cols-2">
        {sections.map((section, idx) => (
          <RailRow key={section.key} section={section} index={idx} />
        ))}
      </ul>
    </section>
  );
}
