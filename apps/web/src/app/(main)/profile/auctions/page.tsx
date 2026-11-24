import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCachedUserBidHistory } from "@/modules/auction/server/ssr";
import { UserAuctionsClient } from "@/modules/auction/ui/UserAuctionsClient";
import { DesktopAccountSidebar } from "@/components/profile/DesktopAccountSidebar";

export const metadata: Metadata = {
  title: "Đấu giá của tôi | NoobStore",
};

export default async function UserAuctionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/profile/auctions");
  }

  const history = await getCachedUserBidHistory(user.id);

  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="hidden md:block">
          <DesktopAccountSidebar activeHref="/profile/auctions" />
        </div>
        <div className="md:col-span-3 space-y-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
              Lịch sử đấu giá của tôi
            </h1>
            <p className="text-xs text-muted-foreground">
              Theo dõi tình trạng các phiên đấu giá bạn đã tham gia và hoàn tất thanh toán khi thắng cuộc.
            </p>
          </div>

          <UserAuctionsClient initialHistory={history} />
        </div>
      </div>
    </div>
  );
}
