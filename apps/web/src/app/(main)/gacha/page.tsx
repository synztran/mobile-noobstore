import { GachaMachine } from "@/components/gacha/GachaMachine";
import { createClient } from "@/lib/supabase/server";

export default async function GachaPage() {
	const supabase = await createClient();
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
		<div className="max-h-screen py-6 px-4">
			<GachaMachine eventId={event.id} />
		</div>
	);
}
