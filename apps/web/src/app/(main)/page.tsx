import { AnnouncementBanner } from "@/components/home/AnnouncementBanner";
import { DesktopHomeDock } from "@/components/home/DesktopHomeDock";
import { CommunityPromo } from "@/components/home/CommunityPromo";
import { FlashSaleStrip } from "@/components/home/FlashSaleStrip";
import { GachaFeatureSlot } from "@/components/home/GachaFeatureSlot";
import { HomeBlogSection } from "@/components/home/HomeBlogSection";
import { HotDropsSection } from "@/components/home/HotDropsSection";
import { NewArrivalsSection } from "@/components/home/NewArrivalsSection";
import { NewsletterCTA } from "@/components/home/NewsletterCTA";
import { OurStrongPoints } from "@/components/home/OurStrongPoints";
import { HeroSection } from "@/components/home/HeroSection";
import { HomeTestimonials } from "@/components/home/HomeTestimonials";
import { NoteworthySection } from "@/components/home/NoteworthySection";
import { HomeSaleSection } from "@/components/home/SaleSection";
import { HomeFooter } from "@/components/home/HomeFooter";
import { LazyNearViewport } from "@/components/ui/LazyNearViewport";
import { getHeroCampaigns } from "@/lib/hero-server";
import { getSoonestFlashSale } from "@/modules/products/server/flash-sale";
import type { Metadata } from "next";
import { buildOg } from "@/lib/og";
import { Suspense } from "react";

export const revalidate = 300;

// The root layout's title template is "%s - NoobStore", so this title carries
// no suffix of its own (it would render "… - NoobStore - NoobStore").
export const metadata: Metadata = buildOg({
  title: "NoobStore - Bàn phím cơ, Switch & Phụ kiện chính hãng",
  description:
    "NoobStore - Cửa hàng bàn phím cơ, switch, keycap và phụ kiện bàn phím cơ chính hãng. Giao hàng toàn quốc, bảo hành uy tín.",
  url: "/",
});

export default function HomePage() {
  return (
    <div className="relative clear-both mx-auto max-w-7xl space-y-4 md:space-y-6 lg:space-y-6">
      <Suspense fallback={<AnnouncementBanner />}>
        <AnnouncementBannerInitial />
      </Suspense>
      <Suspense fallback={<HeroFallback />}>
        <HeroSectionInitial />
      </Suspense>
      <DesktopHomeDock />
      <div className="space-y-4 px-4 md:space-y-6 md:px-0 lg:space-y-6 lg:px-0">
        <NoteworthySection />
        <Suspense fallback={<HomeProductRailFallback />}>
          <NewArrivalsSection />
        </Suspense>
        <Suspense fallback={null}>
          <FlashSaleStripInitial />
        </Suspense>
        <HomeSaleSection />
        <Suspense fallback={<HomeProductRailFallback />}>
          <HotDropsSection />
        </Suspense>
      </div>
      <div className="hidden lg:block">
        <GachaFeatureSlot />
      </div>
      <div className="space-y-6 lg:grid lg:grid-cols-2 lg:items-stretch lg:gap-6 lg:space-y-0">
        <LazyNearViewport className="h-full">
          <OurStrongPoints />
        </LazyNearViewport>
        <LazyNearViewport className="h-full">
          <CommunityPromo />
        </LazyNearViewport>
      </div>
      <LazyNearViewport>
        <div className="px-4 md:px-0 lg:px-0">
          <HomeTestimonials />
        </div>
      </LazyNearViewport>
      {/* <Suspense fallback={<HomeBlogFallback />}>
        <HomeBlogSection />
      </Suspense> */}
      <div className="px-4 md:px-0 lg:px-0">
        <NewsletterCTA />
      </div>
      <HomeFooter />
    </div>
  );
}

async function HeroSectionInitial() {
  const heroCampaigns = await getHeroCampaigns();
  return <HeroSection initialSlides={heroCampaigns} />;
}

async function FlashSaleStripInitial() {
  return <FlashSaleStrip />;
}

async function AnnouncementBannerInitial() {
  const sale = await getSoonestFlashSale();
  return (
    <AnnouncementBanner
      flashSale={
        sale
          ? {
              text: `⚡ Flash Sale: ${sale.name} — giảm đến hết giờ!`,
              href: `/shop/${sale.slug}`,
              endsAt: sale.sale_ends_at,
            }
          : null
      }
    />
  );
}

function HeroFallback() {
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
      </div>
    </section>
  );
}

function HomeProductRailFallback() {
  return (
    <section
      aria-hidden="true"
      className="rounded-md bg-surface md:p-4 lg:rounded-3xl lg:p-4"
    >
      <div className="mb-4 h-7 w-48 animate-pulse rounded-lg bg-surface-container" />
      <div className="hide-scrollbar flex gap-4 overflow-hidden px-6 pb-2 lg:gap-5 lg:px-0">
        {Array.from({ length: 5 }, (_, index) => (
          <div
            key={index}
            className="w-[min(62vw,260px)] shrink-0 animate-pulse space-y-3 sm:w-[min(46vw,280px)] lg:w-[calc((100%-2*1.25rem)/2.6)]"
          >
            <div className="aspect-square rounded-2xl bg-surface-container" />
            <div className="h-3 w-1/3 rounded bg-surface-container" />
            <div className="h-4 w-4/5 rounded bg-surface-container" />
            <div className="h-4 w-1/2 rounded bg-surface-container" />
          </div>
        ))}
      </div>
    </section>
  );
}

function HomeBlogFallback() {
  return (
    <section aria-hidden="true" className="px-6 lg:px-0">
      <div className="mb-4 h-7 w-36 animate-pulse rounded-lg bg-surface-container" />
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div
            key={index}
            className="animate-pulse overflow-hidden rounded-2xl bg-surface-container-low"
          >
            <div className="aspect-[16/9] bg-surface-container" />
            <div className="space-y-3 p-4">
              <div className="h-4 w-20 rounded-full bg-surface-container" />
              <div className="h-4 w-full rounded bg-surface-container" />
              <div className="h-3 w-2/3 rounded bg-surface-container" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
