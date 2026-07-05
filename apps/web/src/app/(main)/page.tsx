import { AnnouncementBanner } from "@/components/home/AnnouncementBanner";
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
      {/* <HomePressStrip /> */}
      <NewsletterCTA />
      <HomeFooter />
    </div>
  );
}
