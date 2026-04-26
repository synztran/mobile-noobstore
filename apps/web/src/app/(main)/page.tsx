import { AnnouncementBanner } from "@/components/home/AnnouncementBanner";
import { CommunityGallery } from "@/components/home/CommunityGallery";
import { CustomerTestimonial } from "@/components/home/CustomerTestimonial";
import { FlashSaleBanner } from "@/components/home/FlashSaleBanner";
import { HeroSection } from "@/components/home/HeroSection";
import { NewsletterCTA } from "@/components/home/NewsletterCTA";
import { NoteworthySection } from "@/components/home/NoteworthySection";

export default function HomePage() {
	return (
		<>
			<AnnouncementBanner />
			<HeroSection />
			<NoteworthySection />
			<FlashSaleBanner />
			<CommunityGallery />
			<CustomerTestimonial />
			<NewsletterCTA />
		</>
	);
}
