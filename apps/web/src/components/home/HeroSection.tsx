import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export function HeroSection() {
	return (
		<section className="relative h-[707px] flex flex-col justify-end p-8 overflow-hidden">
			<Image
				src="https://lh3.googleusercontent.com/aida-public/AB6AXuDDva_45nSGDicEx_fEZ0bwK6sip9lQEJCc3TThFGgc9KR0uzMqsbcxEpquoDes4R1BNIufmFftnc9WqRHzyGpF4FbIWcb79CJ61Lw-BS_UtkL4_KMvKVzveSzA9ctX4d2fAH9FpQeyWTf9gmh0gYh4rKYO031I8CO7Q9XQsfnzSijuq5TcaaWK_l2YTjDkJ295fDbcqzebTnRqEyxnATCgaXmyKA1GqxTiOVXmTCaZMB99PJj2qNAwDsXQtXlsI4VmYz6Fk5tnNcc"
				alt="Premium mechanical keyboard close-up"
				fill
				className="object-cover"
				priority
				unoptimized
			/>
			<div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent" />
			<div className="relative z-10 flex flex-col gap-4">
				<p className="text-[10px] tracking-[0.2em] text-primary font-bold uppercase">
					SERIES 01 // CÓ SẴN NGAY BÂY GIỜ
				</p>
				<h1 className="text-4xl font-extrabold tracking-tighter uppercase leading-none text-on-surface">
					ĐỘ CHÍNH XÁC
					<br />
					ĐẾN TỪNG MILIMET
				</h1>
				<p className="text-sm text-on-surface-variant max-w-[280px]">
					Phay CNC từ nhôm 6061. Trải nghiệm tactile tuyệt vời dành
					cho những người đam mê.
				</p>
				<Link
					href="/shop"
					className="mt-4 bg-primary-gradient text-on-primary px-6 py-4 font-bold text-xs tracking-widest shadow-lg flex items-center justify-between w-full rounded-lg active:scale-95 transition-transform">
					<span>KHÁM PHÁ BỘ SƯU TẬP</span>
					<ArrowRight size={16} />
				</Link>
			</div>
		</section>
	);
}
