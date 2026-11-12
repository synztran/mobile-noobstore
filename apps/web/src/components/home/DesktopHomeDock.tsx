import {
  ArrowUpRight,
  BookOpenText,
  Cable,
  Gamepad2,
  Keyboard,
  FileText,
  Mouse,
  Sparkles,
  Wrench,
} from "lucide-react";
import Link from "next/link";

const QUICK_CATEGORIES = [
  { label: "Bàn phím", href: "/shop?category=keyboards", icon: Keyboard },
  { label: "Switch", href: "/shop?category=switches", icon: Cable },
  { label: "Keycap", href: "/shop?search=keycap", icon: Gamepad2 },
  { label: "Phụ kiện", href: "/shop?category=accessories", icon: Wrench },
  { label: "Chuột", href: "/shop?search=chu%E1%BB%99t", icon: Mouse },
];

export function DesktopHomeDock() {
  return (
    <section
      aria-label="Khám phá NoobStore"
      className="hidden rounded-2xl bg-surface-container-low lg:block"
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center justify-between gap-4 py-4 xl:grid-cols-[auto_minmax(0,1fr)_auto] xl:gap-6">
        <nav aria-label="Danh mục nhanh" className="min-w-0">
          <p className="mb-2 text-xs font-bold text-on-surface-variant">
            Đi thẳng tới danh mục
          </p>
          <div className="flex flex-wrap gap-2">
            {QUICK_CATEGORIES.map(({ label, href, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="inline-flex items-center gap-2 rounded-xl border border-outline-variant/40 bg-surface px-3.5 py-2.5 text-xs font-bold text-on-surface shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/5 hover:text-primary hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {Icon && (
                  <Icon aria-hidden="true" className="h-4 w-4 text-primary" />
                )}
                {label}
              </Link>
            ))}
          </div>
        </nav>

        <div className="ml-auto flex items-center gap-1 border-l border-outline-variant/50 pl-3 xl:gap-2 xl:pl-5">
          <Link
            href="/checkin"
            className="group flex items-center gap-3 rounded-xl border border-primary/15 bg-surface px-3 py-2.5 text-on-surface transition-colors hover:border-primary/35 hover:bg-primary/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary xl:min-w-[240px]"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-fixed text-primary">
              <Sparkles aria-hidden="true" className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-bold">Điểm danh</span>
              <span className="mt-0.5 block text-[10px] leading-snug text-on-surface-variant">
                Tích điểm mỗi ngày
              </span>
            </span>
            <ArrowUpRight
              aria-hidden="true"
              className="h-4 w-4 shrink-0 text-primary transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            />
          </Link>
          <Link
            href="/documents"
            className="group flex items-center gap-3 rounded-xl border border-primary/15 bg-surface px-3 py-2.5 text-on-surface transition-colors hover:border-primary/35 hover:bg-primary/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary xl:min-w-[240px]"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-fixed text-primary">
              <BookOpenText aria-hidden="true" className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-bold">Kho tài liệu</span>
              <span className="mt-0.5 block text-[10px] leading-snug text-on-surface-variant">
                Chia sẻ kiến thức cùng cộng đồng
              </span>
            </span>
            <ArrowUpRight
              aria-hidden="true"
              className="h-4 w-4 shrink-0 text-primary transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            />
          </Link>
        </div>
      </div>
    </section>
  );
}
