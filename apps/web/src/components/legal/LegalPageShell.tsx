import Link from "next/link";
import clsx from "clsx";
import { ScrollText, ShieldCheck, Truck } from "lucide-react";

export type LegalPageKey = "policy" | "terms" | "delivery-terms";

const LEGAL_PAGES = [
  {
    key: "policy",
    href: "/policy",
    label: "Chính sách bảo mật",
    icon: ShieldCheck,
  },
  {
    key: "terms",
    href: "/terms",
    label: "Điều khoản & Điều kiện",
    icon: ScrollText,
  },
  {
    key: "delivery-terms",
    href: "/delivery-terms",
    label: "Chính sách giao hàng",
    icon: Truck,
  },
] as const;

/**
 * Shared shell for the legal/info pages (policy, terms, delivery-terms).
 * On desktop/tablet a sticky mini-sidebar lets customers jump between the
 * three pages; on mobile the aside is hidden and the content keeps its own
 * mobile padding. Server component — active highlighting is static per page.
 */
export function LegalPageShell({
  active,
  children,
}: {
  active: LegalPageKey;
  children: React.ReactNode;
}) {
  return (
    <div className="md:grid md:grid-cols-[220px_minmax(0,1fr)] md:items-start md:gap-10">
      <aside className="hidden md:sticky md:top-20 md:block">
        <nav className="rounded-2xl border border-outline-variant/20 bg-surface-container-low p-2">
          <p className="px-3 pb-2 pt-2 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
            Thông tin NoobStore
          </p>
          <div className="space-y-1">
            {LEGAL_PAGES.map(({ key, href, label, icon: Icon }) => {
              const isActive = key === active;
              return (
                <Link
                  key={key}
                  href={href}
                  aria-current={isActive ? "page" : undefined}
                  className={clsx(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-on-surface-variant hover:bg-on-surface/5 hover:text-on-surface"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </Link>
              );
            })}
          </div>
        </nav>
      </aside>

      <main className="px-6 py-6 md:max-w-3xl md:px-0 md:py-0">
        {children}
      </main>
    </div>
  );
}