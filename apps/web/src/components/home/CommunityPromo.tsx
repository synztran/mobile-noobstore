import { FileCode2, MessageCircle } from "lucide-react";
import Link from "next/link";

export function CommunityPromo() {
  return (
    <section className="px-4">
      <div className="relative overflow-hidden rounded-2xl bg-primary-gradient p-5">
        <div className="relative z-10">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/80">
            NoobStore Community
          </p>
          <h3 className="mt-1 text-lg font-black text-white">
            Chia sẻ build, kiến thức & tài liệu
          </h3>
          <p className="mt-1 text-xs font-medium text-white/80">
            Gia nhập cộng đồng keeb — chia sẻ tài liệu của bạn.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
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
