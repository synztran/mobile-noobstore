import { GachaMachine } from "@/components/gacha/GachaMachine";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function GachaPage() {
	const supabase = await createClient();

	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		return (
			<div className="flex flex-col items-center justify-center min-h-screen gap-5 px-6 text-center">
				<div className="text-5xl">🎰</div>
				<div>
					<h2 className="text-lg font-black mb-1">
						Đăng nhập để chơi Gacha
					</h2>
					<p className="text-sm text-base-content/60 leading-relaxed">
						Bạn cần đăng nhập để sử dụng máy Gacha, xem lịch sử quay
						và nhận phần thưởng.
					</p>
				</div>
				<Link href="/login" className="btn btn-primary btn-sm px-6">
					Đăng nhập ngay
				</Link>
			</div>
		);
	}

	const { data: event } = await supabase
		.from("gacha_events")
		.select("id")
		.eq("is_active", true)
		.lte("start_at", new Date().toISOString())
		.gte("end_at", new Date().toISOString())
		.order("id", { ascending: true })
		.limit(1)
		.maybeSingle();

	if (!event) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<p className="text-base-content/60">
					Không có sự kiện nào đang diễn ra.
				</p>
			</div>
		);
	}

	return (
		<div className="max-h-screen px-4">
			<GachaMachine eventId={event.id} />
		</div>
	);
}
