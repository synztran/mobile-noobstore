import { ServicesChrome } from "@/components/services/ServicesChrome";
import { ServiceBookingSection } from "@/components/services/ServiceBookingSection";
import {
  ServiceContact,
  ServiceFaq,
  ServiceProcess,
} from "@/components/services/ServiceInfoSections";
import { ServiceShowcase } from "@/components/services/ServiceShowcase";
import Image from "@/components/ui/AdaptiveImage";
import { SERVICE_PAGE_HERO_IMAGE } from "@/lib/images";
import { CACHE_KEYS, readThroughCache } from "@/lib/redis/cache";
import {
  getBookingConfigData,
  type BookingSection,
} from "@/lib/services-server";
import { ArrowRight, ChevronRight, ShieldCheck } from "lucide-react";
import Link from "next/link";

/**
 * Service landing page.
 *
 * Two deliberate properties, both learned the hard way:
 *
 * 1. Nothing here is behind `withAuthRedirect`. Visitors arrive before they
 *    have an account, and gating the whole route meant the server rendered an
 *    empty shell — no LCP image, nothing for a crawler. Only the configurator
 *    is gated, inside `ServiceBookingSection`.
 *
 * 2. The page is a **server component** and awaits the booking config itself,
 *    so the service groups, their real prices and their handling times are in
 *    the first HTML response. Previously the only service content on this page
 *    lived inside the auth-gated client configurator, so a signed-out visitor
 *    or a crawler saw a hero, a "coming soon" teaser and a loading skeleton —
 *    no service named, no price, no turnaround. The reassurance sections (FAQ,
 *    process, guarantees, contact) sit here too rather than at the end of a
 *    flow most visitors never reach.
 */
export const revalidate = 120;

export default async function ServicesPage() {
  // Same read-through cache the public API route uses, so the page and the
  // configurator share one cached payload. A failure must not take the page
  // down: the booking section still renders, and the showcase simply omits
  // itself.
  const config = await readThroughCache(
    CACHE_KEYS.bookingConfig,
    120,
    getBookingConfigData
  ).catch((error: unknown) => {
    console.error("[services] booking config unavailable:", error);
    return null;
  });

  const sections: BookingSection[] = config?.sections ?? [];

  return (
    <ServicesChrome>
      {/*
        Bottom padding clears the fixed booking summary bar
        (`ServiceBookingSummaryBar` is `fixed bottom-0`, ~104px tall plus the
        safe-area inset). Without it the last card on the page — the Middleman
        link — sat 29px behind that bar at maximum scroll, i.e. partly
        unreadable and partly unclickable. The `env()` term is needed because
        the bar itself grows by the safe-area inset on notched devices.
      */}
      <main className="space-y-5 pb-[calc(7rem+env(safe-area-inset-bottom))]">
        {/*
          Hero uses the project's own scrim — the paper surface fading up out
          of the photo (as on the home hero) — not a black overlay, which the
          design system bans. No kicker label above the heading: the heading
          carries itself.
        */}
        <div
          id="tour-hero"
          className="relative h-[58vw] max-h-72 w-full overflow-hidden"
        >
          <Image
            src={SERVICE_PAGE_HERO_IMAGE}
            alt="Dịch vụ bàn phím cơ Noobstore"
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/45 to-surface/5" />
          <div className="absolute inset-0 z-10 flex flex-col justify-end p-5">
            <h1 className="max-w-[24ch] text-3xl font-extrabold leading-[1.15] tracking-[-0.02em] text-on-surface">
              Dịch vụ bàn phím cơ
            </h1>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-on-surface-variant">
              Đặt lịch dịch vụ — tất cả trong một đơn booking.
            </p>
            <Link
              href="#dat-lich"
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.08em] text-primary"
            >
              Đặt lịch dịch vụ
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        <div className="space-y-5 px-4">
          {/* What we do, what it costs, how long — in public view. */}
          <ServiceShowcase sections={sections} />

          {/*
            Stable scroll target for the hero link, plus the booking area the
            showcase cards deep-link into by group id.
          */}
          <div id="dat-lich" className="scroll-mt-24">
            <ServiceBookingSection
              sectionKeys={sections.map((section) => section.key)}
            />
          </div>

          {/* Reassurance: same copy and order the flow used to end with. */}
          <ServiceFaq />
          <ServiceProcess />
          <ServiceContact />

          {/*
            Middleman is not launched yet, so it belongs out of the decision
            path — but it used to sit in the prime slot under the hero *and* be
            unclickable, even though the page exists. Now it's linked, at the
            end of the page.
          */}
          <Link
            href="/middleman"
            className="flex items-center gap-4 rounded-2xl bg-surface-container p-4 shadow-ambient-sm transition-colors hover:bg-surface-container-high"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-container-highest text-on-surface-variant">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <p className="text-sm font-extrabold text-on-surface">
                  Middleman
                </p>
                <span className="rounded-full bg-surface-container-high px-2.5 py-0.5 text-xs font-bold text-on-surface-variant">
                  Sắp ra mắt
                </span>
              </div>
              <p className="mt-1 text-sm text-on-surface-variant">
                Giao dịch trung gian an toàn
              </p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-on-surface-variant" />
          </Link>
        </div>
      </main>
    </ServicesChrome>
  );
}
