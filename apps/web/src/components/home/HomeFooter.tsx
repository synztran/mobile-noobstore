import Icon from "@/components/ui/Icon";
import { Globe, MessageCircleMore } from "lucide-react";
import Link from "next/link";

export function HomeFooter() {
  return (
    <footer className="!mt-0 bg-surface-container p-4">
      <div className="flex flex-col items-center gap-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
        <div className="flex w-full justify-between gap-4 text-[10px]">
          <Link href="/policy">Chính sách bảo mật</Link>
          <Link href="/terms">Điều khoản</Link>
          <Link href="#">Vận chuyển</Link>
        </div>
        <p className="opacity-50">© 2026 NoobStore</p>
      </div>
    </footer>
  );
}
