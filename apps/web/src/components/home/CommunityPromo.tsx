import { FileCode2, MessageCircle } from "lucide-react";
import Link from "next/link";

export function CommunityPromo() {
  return (
    <section className="h-full px-4 md:px-0 lg:px-0">
      <div className="relative flex h-full flex-col justify-center overflow-hidden rounded-2xl bg-primary-gradient p-5 md:p-8 lg:rounded-3xl lg:p-10">
        {/* Ambient orb — desktop/tablet polish only */}
        <div className="pointer-events-none absolute -right-16 -top-16 hidden h-56 w-56 rounded-full bg-white/10 blur-3xl md:block" />
        <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-8">
          <div className="md:max-w-2xl">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/80">
              NoobStore Community
            </p>
            <h3 className="mt-1 text-lg font-black text-white md:text-2xl lg:text-3xl">
              Chia sẻ build, kiến thức & tài liệu
            </h3>
            <p className="mt-1 text-xs font-medium text-white/80 md:text-sm lg:max-w-md">
              Gia nhập cộng đồng keeb — chia sẻ tài liệu của bạn.
            </p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 md:mt-0 md:shrink-0">
            {/* <Link
              href="/community"
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-bold text-primary transition-transform active:scale-95"
            >
              <MessageCircle size={14} />
              Cộng đồng
            </Link> */}
            <Link
              href="/documents"
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-bold text-primary transition-transform active:scale-95"
            >
              <FileCode2 size={14} />
              Kho tài liệu
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
