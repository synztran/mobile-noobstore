import { TopNav } from "@/components/layout/TopNav";
import { ServiceBookingFlow } from "@/components/services/ServiceBookingFlow";
import { SERVICE_PAGE_HERO_IMAGE } from "@/lib/images";
import { ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default async function ServicesPage() {
	return (
		<>
			<TopNav showBack backHref="/" title="Dịch vụ" showCart />

			<main className="p-4 space-y-4 pb-24">
				{/* <div>
					<p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">
						Noobstore
					</p>
					<h1 className="text-2xl font-black uppercase text-on-surface leading-none">
						Dịch vụ
					</h1>
					<p className="text-sm text-on-surface-variant mt-2">
						Đặt lịch dịch vụ theo từng hạng mục trong một luồng duy
						nhất.
					</p>
				</div> */}

				{/* ── Hero Section ── */}
				<div className="relative h-[55vw] max-h-72 w-full overflow-hidden rounded-xl">
					<Image
						src={SERVICE_PAGE_HERO_IMAGE}
						alt="Dịch vụ bàn phím cơ Noobstore"
						fill
						priority
						sizes="100vw"
						className="object-cover object-center"
					/>
					{/* gradient: transparent at top, dark at bottom */}
					<div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/75" />
					{/* text anchored to bottom-left */}
					<div className="absolute bottom-0 left-0 right-0 p-2 mx-2 mb-1 backdrop-blur-sm bg-black/10 rounded-md">
						<p className="text-sm font-black uppercase tracking-widest text-primary-action mb-1">
							Noobstore - Keyboard services
						</p>
						<p className="text-xs text-white/70 mt-1">
							Đặt lịch dịch vụ — tất cả trong một đơn booking.
						</p>
					</div>
				</div>

				<Link
					href="/middleman"
					className="block rounded-2xl border border-base-200 bg-base-100 p-4 active:scale-[0.99] transition-transform">
					<div className="flex items-center justify-between gap-4">
						<div>
							<strong className="text-sm tracking-widest text-primary">
								Middleman (Giao dịch trung gian)
							</strong>
							<p className="text-xs">
								Bạn cần một nơi an toàn để bảo vệ giao dịch của
								bạn với người lạ ?
							</p>
						</div>
						<ChevronRight />
					</div>
				</Link>

				<ServiceBookingFlow />
			</main>
		</>
	);
}
