import { CommunityFeed } from "@/components/community/CommunityFeed";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cộng đồng - NoobStore",
  description:
    "Chia sẻ kiến thức, drama và build bàn phím cơ trong cộng đồng NoobStore.",
};

export default function CommunityPage() {
  return (
    <main className="min-main-content mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8">
        <p className="mb-2 text-[11px] font-black uppercase tracking-[0.2em] text-primary">
          NoobStore Community
        </p>
        <h1 className="text-2xl font-black tracking-tight text-on-surface">
          Cộng đồng bàn phím
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm font-medium text-on-surface-variant">
          Chia sẻ kiến thức, drama và build của bạn từ cộng đồng keeb Việt Nam.
        </p>
      </div>

      <CommunityFeed />
    </main>
  );
}
