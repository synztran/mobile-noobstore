"use client";

import { createClient } from "@/lib/supabase/client";
import AdminSearchPalette from "@/components/layout/AdminSearchPalette";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import {
  ArrowLeft,
  Award,
  Bell,
  Building2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Coins,
  DollarSign,
  FerrisWheel,
  FileText,
  Gift,
  LayoutDashboard,
  List,
  LogOut,
  Menu,
  Package,
  PackageSearch,
  Puzzle,
  MessageSquareText,
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
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  {
    label: "Products",
    icon: Package,
    children: [
      { label: "Categories", href: "/categories", icon: Tag },
      { label: "Products", href: "/products", icon: Package },
      {
        label: "Variants",
        href: "/products/variants",
        icon: PackageSearch,
      },
      { label: "Components", href: "/products/components", icon: Puzzle },
      { label: "Gift Products", href: "/products/gifts", icon: Gift },
    ],
  },
  { label: "Inventory", href: "/inventory", icon: ClipboardList },
  { label: "Orders", href: "/orders", icon: ShoppingCart },
  {
    label: "Cart Monitoring",
    icon: ShoppingBag,
    children: [
      { label: "All Carts", href: "/carts", icon: ShoppingBag },
      { label: "Abandoned Recovery", href: "/carts/abandoned", icon: Bell },
    ],
  },
  { label: "Users", href: "/users", icon: Users },
  { label: "Ranks", href: "/ranks", icon: Award },
  { label: "Notifications", href: "/notifications", icon: FileText },
  { label: "Stock Alerts", href: "/stock-alerts", icon: Bell },
  { label: "Blog", href: "/blog", icon: Newspaper },
  { label: "Reviews", href: "/reviews", icon: MessageSquareText },
  { label: "Support", href: "/support", icon: ShieldAlert },
  {
    label: "Services",
    icon: Wrench,
    children: [
      { label: "Services", href: "/services", icon: Wrench },
      { label: "Options", href: "/services/options", icon: Settings2 },
      {
        label: "Option Values",
        href: "/services/option-values",
        icon: List,
      },
    ],
  },
  { label: "Vouchers", href: "/vouchers", icon: Tickets },
  { label: "Fees", href: "/fees", icon: DollarSign },
  { label: "Rewards", href: "/rewards", icon: Gift },
  { label: "Points", href: "/points", icon: Coins },
  { label: "Content", href: "/content", icon: FileText },
  { label: "Gacha", href: "/gacha", icon: FerrisWheel },
  { label: "Audit Log", href: "/audit-log", icon: ShieldAlert },
  {
    label: "Tools",
    icon: Wrench,
    children: [
      { label: "Crawling", href: "/crawling", icon: Search },
      { label: "Vendors", href: "/vendors", icon: Building2 },
    ],
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([
    "Services",
    "Products",
  ]);
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
  const pathname = usePathname();
  const router = useRouter();

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

  return (
    <div className="flex h-screen bg-[rgb(var(--admin-bg))]">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? "w-64" : "w-20"
        } flex flex-col bg-slate-900 text-white transition-all duration-300`}
      >
        {/* Header */}
        <div className={`flex min-h-[70px] items-center border-b border-slate-700 p-4 ${sidebarOpen ? "justify-between" : "justify-center"}`}>
          {sidebarOpen && <h1 className="text-xl font-bold">CMS Admin</h1>}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded p-1 hover:bg-slate-700"
          >
            {sidebarOpen ? (
              <ArrowLeft className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {navigation.map((item) => {
            const Icon = item.icon;

            if (item.children) {
              const isExpanded = expandedGroups.includes(item.label);
              const isActive = item.children.some((c) =>
                pathname.startsWith(c.href)
              );
              return (
                <div key={item.label}>
                  <button
                    onClick={() => toggleGroup(item.label)}
                    onMouseEnter={(e) => {
                      if (!sidebarOpen)
                        openFlyout(item.label, e.currentTarget.getBoundingClientRect().top);
                    }}
                    onMouseLeave={() => !sidebarOpen && scheduleCloseFlyout()}
                    className={`flex w-full items-center rounded-lg px-4 py-2 transition-colors ${
                      isActive ? "bg-slate-700" : "hover:bg-slate-700"
                    }`}
                    title={!sidebarOpen ? item.label : ""}
                    aria-haspopup={!sidebarOpen ? "menu" : undefined}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    {sidebarOpen && (
                      <>
                        <span className="ml-3 flex-1 text-left">
                          {item.label}
                        </span>
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </>
                    )}
                  </button>
                  {sidebarOpen && isExpanded && (
                    <div className="ml-4 mt-1 space-y-1 border-l border-slate-700 pl-3">
                      {item.children.map((child) => {
                        const ChildIcon = child.icon;
                        const childActive =
                          pathname === child.href ||
                          (child.href !== "/services" &&
                            pathname.startsWith(child.href));
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                              childActive
                                ? "bg-slate-600 text-white"
                                : "text-slate-300 hover:bg-slate-700 hover:text-white"
                            }`}
                          >
                            <ChildIcon className="h-4 w-4 shrink-0" />
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
                className={`flex items-center space-x-3 rounded-lg px-4 py-2 transition-colors ${
                  isActive ? "bg-slate-700" : "hover:bg-slate-700"
                }`}
                title={!sidebarOpen ? item.label : ""}
              >
                <Icon className="h-5 w-5" />
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-slate-700 p-4">
          <button
            onClick={handleLogout}
            className="flex w-full items-center space-x-3 rounded-lg px-4 py-2 transition-colors hover:bg-red-600"
            title={!sidebarOpen ? "Logout" : ""}
          >
            <LogOut className="h-5 w-5" />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </div>

      {flyout && !sidebarOpen && (
        <div
          onMouseEnter={cancelCloseFlyout}
          onMouseLeave={scheduleCloseFlyout}
          style={{ top: flyout.top, left: 96 }}
          className="fixed z-50 min-w-[200px] rounded-lg border border-slate-700 bg-slate-900 p-1.5 shadow-2xl"
        >
          <div className="px-3 pb-1 pt-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
            {flyout.label}
          </div>
          {navigation
            .find((n) => n.label === flyout.label && n.children)
            ?.children?.map((child) => {
              const ChildIcon = child.icon;
              const childActive =
                pathname === child.href ||
                (child.href !== "/services" &&
                  pathname.startsWith(child.href));
              return (
                <Link
                  key={child.href}
                  href={child.href}
                  onClick={() => setFlyout(null)}
                  className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                    childActive
                      ? "bg-slate-600 text-white"
                      : "text-slate-300 hover:bg-slate-700 hover:text-white"
                  }`}
                >
                  <ChildIcon className="h-4 w-4 shrink-0" />
                  {child.label}
                </Link>
              );
            })}
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="card-bg flex min-h-[70px] items-center justify-between border-b table-border px-8 py-4">
          <h2 className="text-xl font-semibold text-heading">
            Admin Dashboard
          </h2>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setPaletteOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-500 transition-colors hover:bg-slate-50"
            >
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Search...</span>
              <kbd className="rounded border border-slate-200 px-1 text-[10px] text-slate-400">
                ⌘K
              </kbd>
            </button>
            <AdminSearchPalette
              open={paletteOpen}
              onClose={() => setPaletteOpen(false)}
            />
            <ThemeToggle />
          </div>
        </div>

        {/* Content */}
        <main className="flex-1 overflow-auto p-8">{children}</main>
      </div>
    </div>
  );
}
