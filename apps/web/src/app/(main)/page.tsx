import { AnnouncementBanner } from "@/components/home/AnnouncementBanner";
import { CategoryStrip } from "@/components/home/CategoryStrip";
import { CommunityGallery } from "@/components/home/CommunityGallery";
import { CustomerTestimonial } from "@/components/home/CustomerTestimonial";
import { OurStrongPoints } from "@/components/home/OurStrongPoints";
import { HeroSection } from "@/components/home/HeroSection";
import { HomePressStrip } from "@/components/home/HomePressStrip";
import { HomeTestimonials } from "@/components/home/HomeTestimonials";
import { NewsletterCTA } from "@/components/home/NewsletterCTA";
import { NoteworthySection } from "@/components/home/NoteworthySection";
import { HomeSaleSection } from "@/components/home/SaleSection";
import { HomeFooter } from "@/components/home/HomeFooter";
import type { Metadata } from "next";

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
      <AnnouncementBanner />
      <HeroSection />
      <NoteworthySection />
      <HomeSaleSection />
      <OurStrongPoints />
      <CommunityGallery />
      <CustomerTestimonial />
      <HomeTestimonials />
      <NewsletterCTA />
      <HomeFooter />
    </div>
  );
}
