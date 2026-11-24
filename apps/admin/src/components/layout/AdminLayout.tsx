"use client";

import { createClient } from "@/lib/supabase/client";
import AdminSearchPalette from "@/components/layout/AdminSearchPalette";
import OrderAlerts from "@/components/layout/OrderAlerts";
import {
  ArrowLeft,
  Award,
  Bell,
  AlertTriangle,
  CalendarCheck,
  Building2,
  ChevronDown,
  ClipboardList,
  Coins,
  DollarSign,
  GitFork,
  FerrisWheel,
  FileText,
  Gavel,
  Gift,
  ImagePlus,
  LayoutDashboard,
  List,
  LogOut,
  Menu,
  Package,
  PackageSearch,
  Puzzle,
  MessageSquareText,
  ScanLine,
  Search,
  Newspaper,
  Settings2,
  ShieldAlert,
  ShoppingBag,
  ShoppingCart,
  Tag,
  Tickets,
  Users,
  Wrench,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type NavItem =
  | { label: string; href: string; icon: React.ElementType; children?: never }
  | {
      label: string;
      href?: never;
      icon: React.ElementType;
      children: {
        label: string;
        href: string;
        icon: React.ElementType;
      }[];
    };

const navigation: NavItem[] = [
  { label: "Audit Log", href: "/audit-log", icon: ShieldAlert },
  { label: "Auctions", href: "/auctions", icon: Gavel },
  { label: "Checkout Error Codes", href: "/checkout-error-codes", icon: AlertTriangle },
  { label: "Blog", href: "/blog", icon: Newspaper },
  {
    label: "Cart Monitoring",
    icon: ShoppingBag,
    children: [
      { label: "All Carts", href: "/carts", icon: ShoppingBag },
      { label: "Abandoned Recovery", href: "/carts/abandoned", icon: Bell },
    ],
  },
  { label: "Content", href: "/content", icon: FileText },
  {
    label: "Community",
    icon: MessageSquareText,
    children: [
      { label: "Documents", href: "/community/documents", icon: FileText },
    ],
  },
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Điểm danh", href: "/checkin", icon: CalendarCheck },
  { label: "Fees", href: "/fees", icon: DollarSign },
  { label: "Gacha", href: "/gacha", icon: FerrisWheel },
  { label: "Inventory", href: "/inventory", icon: ClipboardList },
  { label: "Notifications", href: "/notifications", icon: FileText },
  {
    label: "Orders",
    icon: ShoppingCart,
    children: [
      { label: "Orders", href: "/orders", icon: ShoppingCart },
      { label: "Quick Order", href: "/orders/quick", icon: Zap },
    ],
  },
  { label: "Points", href: "/points", icon: Coins },
  {
    label: "Products",
    icon: Package,
    children: [
      { label: "Categories", href: "/categories", icon: Tag },
      { label: "Products", href: "/products", icon: Package },
      { label: "Variants", href: "/products/variants", icon: PackageSearch },
      { label: "Components", href: "/products/components", icon: Puzzle },
      { label: "Gift Products", href: "/products/gifts", icon: Gift },
      { label: "Ảnh sản phẩm", href: "/products/photo-settings", icon: ImagePlus },
    ],
  },
  { label: "Ranks", href: "/ranks", icon: Award },
  { label: "Reviews", href: "/reviews", icon: MessageSquareText },
  { label: "Rewards", href: "/rewards", icon: Gift },
  {
    label: "Services",
    icon: Wrench,
    children: [
      { label: "Services", href: "/services", icon: Wrench },
      { label: "Options", href: "/services/options", icon: Settings2 },
      { label: "Option Values", href: "/services/option-values", icon: List },
    ],
  },
  { label: "Stock Alerts", href: "/stock-alerts", icon: Bell },
  { label: "Support", href: "/support", icon: ShieldAlert },
  {
    label: "Tools",
    icon: Wrench,
    children: [
      { label: "Crawling", href: "/crawling", icon: Search },
      { label: "Diagrams", href: "/diagrams", icon: GitFork },
      { label: "Keycap Check", href: "/keycap-check", icon: ScanLine },
      { label: "Vendors", href: "/vendors", icon: Building2 },
    ],
  },
  { label: "Users", href: "/users", icon: Users },
  { label: "Vouchers", href: "/vouchers", icon: Tickets },
];

const EXACT_MATCH_ROUTES = ["/orders", "/carts", "/services", "/diagrams"];

function isChildActive(pathname: string, href: string) {
  if (EXACT_MATCH_ROUTES.includes(href)) {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(href);
}

function findPageTitle(pathname: string) {
  for (const item of navigation) {
    if (item.children) {
      const child = item.children.find((c) => isChildActive(pathname, c.href));
      if (child) return child.label;
    } else if (isChildActive(pathname, item.href)) {
      return item.label;
    }
  }
  return "NoobStore";
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([
    "Services",
    "Products",
    "Orders",
  ]);

  // Ensure active group is expanded on navigation
  useEffect(() => {
    for (const item of navigation) {
      if (item.children?.some((c) => isChildActive(pathname, c.href))) {
        setExpandedGroups((prev) =>
          prev.includes(item.label) ? prev : [...prev, item.label]
        );
      }
      if (item.label === "Tools" && isChildActive(pathname, "/diagrams")) {
        setExpandedGroups((prev) =>
          prev.includes(item.label) ? prev : [...prev, item.label]
        );
      }
    }
  }, [pathname]);
  const [flyout, setFlyout] = useState<{ label: string; top: number } | null>(
    null
  );
  const flyoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // cmd+K global shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen((p) => !p);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (sidebarOpen) setFlyout(null);
  }, [sidebarOpen]);

  function toggleGroup(label: string) {
    setExpandedGroups((prev) =>
      prev.includes(label) ? prev.filter((g) => g !== label) : [...prev, label]
    );
  }

  function openFlyout(label: string, top: number) {
    if (flyoutTimer.current) clearTimeout(flyoutTimer.current);
    setFlyout({ label, top });
  }

  function scheduleCloseFlyout() {
    if (flyoutTimer.current) clearTimeout(flyoutTimer.current);
    flyoutTimer.current = setTimeout(() => setFlyout(null), 120);
  }

  function cancelCloseFlyout() {
    if (flyoutTimer.current) clearTimeout(flyoutTimer.current);
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const activeIcon =
    navigation.find((item) =>
      item.children
        ? item.children.some((c) => isChildActive(pathname, c.href))
        : isChildActive(pathname, item.href)
    )?.icon ?? null;

  return (
    <div className="flex h-screen overflow-hidden bg-[rgb(var(--admin-bg))]">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-[76px]"
        } flex shrink-0 flex-col border-r border-[rgb(var(--admin-border))] bg-[rgb(var(--admin-surface))] transition-[width] duration-200`}
      >
        {/* Brand */}
        <div
          className={`flex h-16 shrink-0 items-center border-b border-[rgb(var(--admin-border))] px-4 ${
            sidebarOpen ? "justify-between" : "justify-center"
          }`}
        >
          {sidebarOpen && (
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-[11px] font-bold text-white">
                N
              </span>
              <span className="text-sm font-semibold tracking-tight text-heading">
                NoobStore
              </span>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-md p-1.5 text-[rgb(var(--admin-text-muted))] transition-colors hover:bg-[rgb(var(--admin-hover))] hover:text-[rgb(var(--admin-text))]"
            title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {sidebarOpen ? (
              <ArrowLeft className="h-4 w-4" />
            ) : (
              <Menu className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
          {navigation.map((item) => {
            const Icon = item.icon;

            if (item.children) {
              const isExpanded = expandedGroups.includes(item.label);
              const isActive = item.children.some((c) =>
                isChildActive(pathname, c.href)
              );
              return (
                <div key={item.label}>
                  <button
                    onClick={() => toggleGroup(item.label)}
                    onMouseEnter={(e) => {
                      if (!sidebarOpen)
                        openFlyout(
                          item.label,
                          e.currentTarget.getBoundingClientRect().top
                        );
                    }}
                    onMouseLeave={() =>
                      !sidebarOpen && scheduleCloseFlyout()
                    }
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition-colors ${
                      isActive
                        ? "bg-[rgb(var(--admin-hover))] font-medium text-[rgb(var(--admin-text))]"
                        : "text-[rgb(var(--admin-text-secondary))] hover:bg-[rgb(var(--admin-hover))] hover:text-[rgb(var(--admin-text))]"
                    }`}
                    title={!sidebarOpen ? item.label : ""}
                    aria-haspopup={!sidebarOpen ? "menu" : undefined}
                  >
                    <Icon
                      className={`h-[18px] w-[18px] shrink-0 ${
                        isActive
                          ? "text-[rgb(var(--admin-text))]"
                          : "text-[rgb(var(--admin-text-muted))]"
                      }`}
                    />
                    {sidebarOpen && (
                      <>
                        <span className="flex-1 text-left">{item.label}</span>
                        <ChevronDown
                          className={`h-3.5 w-3.5 ${
                            isExpanded ? "" : "-rotate-90"
                          } transition-transform text-[rgb(var(--admin-text-muted))]`}
                        />
                      </>
                    )}
                  </button>
                  {sidebarOpen && isExpanded && (
                    <div className="ml-[18px] border-l border-[rgb(var(--admin-border))] pb-1 pl-2 pt-0.5">
                      {item.children.map((child) => {
                        const ChildIcon = child.icon;
                        const childActive = isChildActive(pathname, child.href);
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={`mt-0.5 flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] transition-colors ${
                              childActive
                                ? "bg-[rgb(var(--admin-hover))] font-medium text-[rgb(var(--admin-text))]"
                                : "text-[rgb(var(--admin-text-secondary))] hover:bg-[rgb(var(--admin-hover))] hover:text-[rgb(var(--admin-text))]"
                            }`}
                          >
                            <ChildIcon className="h-3.5 w-3.5 shrink-0 text-[rgb(var(--admin-text-muted))]" />
                            {child.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition-colors ${
                  isActive
                    ? "bg-[rgb(var(--admin-hover))] font-medium text-[rgb(var(--admin-text))]"
                    : "text-[rgb(var(--admin-text-secondary))] hover:bg-[rgb(var(--admin-hover))] hover:text-[rgb(var(--admin-text))]"
                }`}
                title={!sidebarOpen ? item.label : ""}
              >
                <Icon
                  className={`h-[18px] w-[18px] shrink-0 ${
                    isActive
                      ? "text-[rgb(var(--admin-text))]"
                      : "text-[rgb(var(--admin-text-muted))]"
                  }`}
                />
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="shrink-0 border-t border-[rgb(var(--admin-border))] p-3">
          <button
            onClick={handleLogout}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] text-[rgb(var(--admin-text-secondary))] transition-colors hover:bg-red-50 hover:text-red-600 ${
              sidebarOpen ? "" : "justify-center"
            }`}
            title={!sidebarOpen ? "Logout" : ""}
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {flyout && !sidebarOpen && (
        <div
          onMouseEnter={cancelCloseFlyout}
          onMouseLeave={scheduleCloseFlyout}
          style={{ top: flyout.top, left: 92 }}
          className="fixed z-50 min-w-[200px] rounded-xl border border-[rgb(var(--admin-border))] bg-white p-1.5 shadow-lg"
        >
          <div className="px-2.5 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wider text-[rgb(var(--admin-text-muted))]">
            {flyout.label}
          </div>
          {navigation
            .find((n) => n.label === flyout.label && n.children)
            ?.children?.map((child) => {
              const ChildIcon = child.icon;
              const childActive = isChildActive(pathname, child.href);
              return (
                <Link
                  key={child.href}
                  href={child.href}
                  onClick={() => setFlyout(null)}
                  className={`flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] transition-colors ${
                    childActive
                      ? "bg-[rgb(var(--admin-hover))] font-medium text-[rgb(var(--admin-text))]"
                      : "text-[rgb(var(--admin-text-secondary))] hover:bg-[rgb(var(--admin-hover))] hover:text-[rgb(var(--admin-text))]"
                  }`}
                >
                  <ChildIcon className="h-4 w-4 shrink-0 text-[rgb(var(--admin-text-muted))]" />
                  {child.label}
                </Link>
              );
            })}
        </div>
      )}

      {/* Main Column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Bar */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-[rgb(var(--admin-border))] bg-[rgb(var(--admin-surface))] px-6">
          <div className="flex items-center gap-2.5">
            {activeIcon && (
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[rgb(var(--admin-hover))] text-[rgb(var(--admin-text-secondary))]">
                {(() => {
                  const Icon = activeIcon as React.ElementType;
                  return <Icon className="h-4 w-4" />;
                })()}
              </span>
            )}
            <h2 className="text-[15px] font-semibold tracking-tight text-heading">
              {findPageTitle(pathname)}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <OrderAlerts />
            <button
              onClick={() => setPaletteOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-[rgb(var(--admin-border))] bg-[rgb(var(--admin-surface))] px-3 py-1.5 text-[13px] text-[rgb(var(--admin-text-muted))] transition-colors hover:border-[rgb(var(--admin-border-strong))] hover:text-[rgb(var(--admin-text-secondary))]"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Search</span>
              <kbd className="rounded border border-[rgb(var(--admin-border))] bg-[rgb(var(--admin-hover))] px-1 text-[10px] text-[rgb(var(--admin-text-muted))]">
                ⌘K
              </kbd>
            </button>
            <AdminSearchPalette
              open={paletteOpen}
              onClose={() => setPaletteOpen(false)}
            />
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
