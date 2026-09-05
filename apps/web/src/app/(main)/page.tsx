import { AnnouncementBanner } from "@/components/home/AnnouncementBanner";
import { CommunityGallery } from "@/components/home/CommunityGallery";
import { CommunityPromo } from "@/components/home/CommunityPromo";
import { CustomerTestimonial } from "@/components/home/CustomerTestimonial";
import { FlashSaleStrip } from "@/components/home/FlashSaleStrip";
import { OurStrongPoints } from "@/components/home/OurStrongPoints";
import { HeroSection } from "@/components/home/HeroSection";
import { HomeTestimonials } from "@/components/home/HomeTestimonials";
import { NewsletterCTA } from "@/components/home/NewsletterCTA";
import { NoteworthySection } from "@/components/home/NoteworthySection";
import { HomeSaleSection } from "@/components/home/SaleSection";
import { HomeFooter } from "@/components/home/HomeFooter";
import { LazyNearViewport } from "@/components/ui/LazyNearViewport";
import { getHeroCampaigns } from "@/lib/hero-server";
import { getSoonestFlashSale } from "@/modules/products/server/flash-sale";
import type { Metadata } from "next";
import { Suspense } from "react";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "NoobStore - Bàn phím cơ, Switch & Phụ kiện chính hãng",
  description:
    "NoobStore - Cửa hàng bàn phím cơ, switch, keycap và phụ kiện bàn phím chính hãng. Giao hàng toàn quốc, bảo hành uy tín.",
  openGraph: {
    title: "NoobStore - Bàn phím cơ, Switch & Phụ kiện chính hãng",
    description:
      "NoobStore - Cửa hàng bàn phím cơ, switch, keycap và phụ kiện bàn phím chính hãng.",
    siteName: "NoobStore",
    type: "website",
  },
};

export default function HomePage() {
  return (
    <div className="relative clear-both space-y-8">
      <Suspense fallback={<AnnouncementBanner />}>
        <AnnouncementBannerInitial />
      </Suspense>
      <Suspense fallback={<HeroFallback />}>
        <HeroSectionInitial />
      </Suspense>
      <NoteworthySection />
      <Suspense fallback={null}>
        <FlashSaleStripInitial />
      </Suspense>
      <HomeSaleSection />
      <LazyNearViewport>
        <OurStrongPoints />
      </LazyNearViewport>
      <LazyNearViewport>
        <CommunityPromo />
      </LazyNearViewport>
      <LazyNearViewport>
        <CommunityGallery />
      </LazyNearViewport>
      <LazyNearViewport>
        <CustomerTestimonial />
      </LazyNearViewport>
      <LazyNearViewport>
        <HomeTestimonials />
      </LazyNearViewport>
      <LazyNearViewport>
        <NewsletterCTA />
      </LazyNearViewport>
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
