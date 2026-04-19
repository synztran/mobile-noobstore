import { CommunityGallery } from "@/components/home/CommunityGallery";
import { CustomerTestimonial } from "@/components/home/CustomerTestimonial";
import { FlashSaleBanner } from "@/components/home/FlashSaleBanner";
import { HeroSection } from "@/components/home/HeroSection";
import { NewArrivalsSection } from "@/components/home/NewArrivalsSection";
import { QuickCategories } from "@/components/home/QuickCategories";
import { Suspense } from "react";

export default function HomePage() {
	return (
		<>
			<HeroSection />
			<QuickCategories />

			<Suspense
				fallback={
					<div className="h-[600px] bg-surface-container animate-pulse" />
				}>
				<NewArrivalsSection />
			</Suspense>

			<FlashSaleBanner />
			<CommunityGallery />
			<CustomerTestimonial />
		</>
	);
}
