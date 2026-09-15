import { GachaMachine } from "@/modules/gacha/ui/GachaMachine";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import Link from "next/link";

export async function generateMetadata(): Promise<Metadata> {
  const supabase = await createClient();
  const { data: event } = await supabase
    .from("gacha_events")
    .select("name, description")
    .eq("is_active", true)
    .lte("start_at", new Date().toISOString())
    .gte("end_at", new Date().toISOString())
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!event) {
    return {
      title: "Gacha",
      description:
        "Tham gia sự kiện quay thưởng để nhận phần thưởng hấp dẫn từ NoobStore.",
    };
  }

  const description =
    event.description?.slice(0, 160) ||
    `Tham gia sự kiện ${event.name} để nhận phần thưởng hấp dẫn từ NoobStore.`;

  return {
    title: event.name,
    description,
    openGraph: {
      title: event.name,
      description,
      url: "https://www.noobstore.xyz/gacha",
    },
    twitter: {
      title: event.name,
      description,
    },
  };
}

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
      <div className="fixed top-0 my-auto h-[100dvh] w-screen translate-y-1/2 text-center">
        <p className="text-base-content/60">
          Không có sự kiện nào đang diễn ra.
        </p>
      </div>
    );
  }

  // `relative` gives the machine's viewport-edge tabs (TokenBadge on the left,
  // MachineActions on the right) a positioned ancestor: on desktop/tablet the
  // DesktopShell column sits right of the fixed sidebar, so the tabs anchor to
  // the content edge instead of the viewport edge — otherwise the token badge
  // lands underneath the sidebar and is hidden by it. On mobile the wrapper
  // still spans the full viewport, so the tabs stay flush with the screen edges.
  return (
    <div className="relative max-h-screen px-4">
      <GachaMachine eventId={event.id} />
    </div>
  );
}
