"use client";

import { Bell, CircleHelp, CircleUserRound, Gavel, Heart, LogOut, MapPin, Package, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/modules/user/client/AuthProvider";
import { toast } from "@/lib/toast";

const NAV_ITEMS = [
  { icon: <CircleUserRound size={20} />, label: "Tổng quan", href: "/profile" },
  { icon: <ShoppingBag size={20} />, label: "Đơn hàng của tôi", href: "/profile/orders" },
  { icon: <Gavel size={20} />, label: "Đấu giá của tôi", href: "/profile/auctions" },
  { icon: <Heart size={20} />, label: "Sản phẩm yêu thích", href: "/wishlist" },
  { icon: <MapPin size={20} />, label: "Địa chỉ giao hàng", href: "/profile/addresses" },
  { icon: <Bell size={20} />, label: "Thông báo", href: "/profile/notifications" },
  { icon: <Package size={20} />, label: "Hàng sắp về", href: "/profile/stock-alerts" },
  { icon: <CircleHelp size={20} />, label: "Trợ giúp & Hỗ trợ", href: "/profile/support" },
];

export function DesktopAccountSidebar({ activeHref }: { activeHref: string }) {
  const router = useRouter();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
    router.push("/login");
  };

  return (
    <aside className="sticky top-8 flex h-[calc(100dvh-4rem)] min-h-[34rem] flex-col rounded-2xl bg-surface-container-lowest p-4 shadow-ambient-sm" aria-label="Tài khoản">
      <h2 className="px-3 pb-4 pt-2 text-lg font-extrabold text-on-surface">Tài khoản</h2>
      <nav className="space-y-1">
        {NAV_ITEMS.map(({ icon, label, href }) => {
          const active = href === activeHref;
          return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${active ? "bg-primary/10 text-primary" : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"}`}>
            <span aria-hidden="true">{icon}</span><span>{label}</span>
          </Link>;
        })}
      </nav>
      <button onClick={handleSignOut} className="mt-auto flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 font-bold text-error transition-colors hover:bg-error/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
        <LogOut className="h-5 w-5" aria-hidden="true" />Đăng xuất
      </button>
    </aside>
  );
}
