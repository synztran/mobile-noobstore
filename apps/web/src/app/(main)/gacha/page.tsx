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
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 px-6 text-center">
        <div className="text-5xl">🎰</div>
        <div>
          <h2 className="mb-1 text-lg font-black">
            Đăng nhập để tham gia event
          </h2>
          <p className="text-sm leading-relaxed text-base-content/60">
            Bạn cần đăng nhập để tham gia event, xem lịch sử quay và nhận phần
            thưởng.
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
      <div className="flex min-h-screen items-center justify-center">
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
