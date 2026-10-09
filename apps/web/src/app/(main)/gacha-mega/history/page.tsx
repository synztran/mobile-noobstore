import { GachaHistoryView } from "@/modules/ga2-gacha/ui/GachaHistoryView";
import "@/modules/ga2-gacha/ga2-gacha.css";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Lịch Sử Quay Mega Gacha",
  description:
    "Xem lại toàn bộ nhật ký quay Mega Gacha Arcade — SSR, SR và vật phẩm đã trúng.",
};

export default async function GachaMegaHistoryPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-zinc-950 px-6 text-center">
        <div className="text-5xl">🎱</div>
        <div>
          <h2 className="mb-1 text-lg font-black text-white">
            Đăng nhập để xem lịch sử quay
          </h2>
          <p className="text-sm leading-relaxed text-zinc-400">
            Bạn cần đăng nhập để xem nhật ký quay thưởng Mega Gacha.
          </p>
        </div>
        <Link
          href="/login"
          className="rounded-xl border-2 border-pink-300 bg-gradient-to-b from-pink-500 to-rose-500 px-6 py-2 text-sm font-bold text-white shadow-lg transition-shadow hover:shadow-xl"
        >
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
      <div className="fixed inset-0 flex items-center justify-center bg-zinc-950 px-6 text-center text-zinc-400">
        <div>
          <div className="mb-4 text-5xl">🎰</div>
          <h2 className="mb-2 text-xl font-bold text-white">
            Không có sự kiện nào
          </h2>
          <p className="text-sm text-zinc-500">
            Hiện tại không có sự kiện quay thưởng nào đang diễn ra.
          </p>
          <Link
            href="/gacha-mega"
            className="mt-4 inline-block rounded-xl bg-pink-600 px-6 py-2 text-sm font-bold text-white"
          >
            Quay về máy gacha
          </Link>
        </div>
      </div>
    );
  }

  // Token count for the header HUD
  const { data: tokenRow } = await supabase
    .from("user_event_tokens")
    .select("token_count")
    .eq("user_id", user.id)
    .eq("event_id", event.id)
    .maybeSingle();

  return (
    // `font-plain` opts this view out of the arcade font stack (see
    // ga2-gacha.css): the history log is dense reading text, so it uses the
    // app's normal font instead of the display/tech faces. On md+ the page
    // also drops `100dvh` for the shell's actual content height
    // (64px top bar + the shell's 2×24px padding), so the grid never forces
    // the window to scroll behind the desktop chrome.
    <div className="ga-history-bg font-plain flex min-h-dvh justify-center md:min-h-[calc(100dvh-7rem)]">
      <GachaHistoryView
        eventId={event.id}
        tokenCount={tokenRow?.token_count ?? 0}
      />
    </div>
  );
}
