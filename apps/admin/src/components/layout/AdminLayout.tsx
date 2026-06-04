"use client";

import { createClient } from "@/lib/supabase/client";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import {
	ChevronDown,
	ChevronRight,
	FerrisWheel,
	FileText,
	LayoutDashboard,
	List,
	LogOut,
	Menu,
	Package,
	PackageSearch,
	Puzzle,
	Settings2,
	ShoppingCart,
	Tag,
	Tickets,
	Users,
	Wrench,
	X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

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
		],
	},
	{ label: "Orders", href: "/orders", icon: ShoppingCart },
	{ label: "Users", href: "/users", icon: Users },
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
	{ label: "Content", href: "/content", icon: FileText },
  { label: "Gacha", href: "/gacha", icon: FerrisWheel },
];

export default function AdminLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const [sidebarOpen, setSidebarOpen] = useState(true);
	const [expandedGroups, setExpandedGroups] = useState<string[]>([
		"Services",
		"Products",
	]);
	const pathname = usePathname();
	const router = useRouter();

	function toggleGroup(label: string) {
		setExpandedGroups((prev) =>
			prev.includes(label)
				? prev.filter((g) => g !== label)
				: [...prev, label],
		);
	}

	async function handleLogout() {
		const supabase = createClient();
		await supabase.auth.signOut();
		router.push("/login");
	}

	return (
		<div className="flex h-screen bg-slate-100 dark:bg-slate-900">
			{/* Sidebar */}
			<div
				className={`${
					sidebarOpen ? "w-64" : "w-20"
				} bg-slate-900 text-white transition-all duration-300 flex flex-col`}>
				{/* Header */}
				<div className="p-4 border-b border-slate-700 flex items-center justify-between">
					{sidebarOpen && (
						<h1 className="text-xl font-bold">CSM Admin</h1>
					)}
					<button
						onClick={() => setSidebarOpen(!sidebarOpen)}
						className="p-1 hover:bg-slate-700 rounded">
						{sidebarOpen ? (
							<X className="w-5 h-5" />
						) : (
							<Menu className="w-5 h-5" />
						)}
					</button>
				</div>

				{/* Navigation */}
				<nav className="flex-1 p-4 space-y-1 overflow-y-auto">
					{navigation.map((item) => {
						const Icon = item.icon;

						if (item.children) {
							const isExpanded = expandedGroups.includes(
								item.label,
							);
							const isActive = item.children.some((c) =>
								pathname.startsWith(c.href),
							);
							return (
								<div key={item.label}>
									<button
										onClick={() => toggleGroup(item.label)}
										className={`w-full flex items-center px-4 py-2 rounded-lg transition-colors ${
											isActive
												? "bg-slate-700"
												: "hover:bg-slate-700"
										}`}
										title={!sidebarOpen ? item.label : ""}>
										<Icon className="w-5 h-5 shrink-0" />
										{sidebarOpen && (
											<>
												<span className="flex-1 text-left ml-3">
													{item.label}
												</span>
												{isExpanded ? (
													<ChevronDown className="w-4 h-4" />
												) : (
													<ChevronRight className="w-4 h-4" />
												)}
											</>
										)}
									</button>
									{sidebarOpen && isExpanded && (
										<div className="mt-1 ml-4 pl-3 border-l border-slate-700 space-y-1">
											{item.children.map((child) => {
												const ChildIcon = child.icon;
												const childActive =
													pathname === child.href ||
													(child.href !==
														"/services" &&
														pathname.startsWith(
															child.href,
														));
												return (
													<Link
														key={child.href}
														href={child.href}
														className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
															childActive
																? "bg-slate-600 text-white"
																: "text-slate-300 hover:bg-slate-700 hover:text-white"
														}`}>
														<ChildIcon className="w-4 h-4 shrink-0" />
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
								className={`flex items-center space-x-3 px-4 py-2 rounded-lg transition-colors ${
									isActive
										? "bg-slate-700"
										: "hover:bg-slate-700"
								}`}
								title={!sidebarOpen ? item.label : ""}>
								<Icon className="w-5 h-5" />
								{sidebarOpen && <span>{item.label}</span>}
							</Link>
						);
					})}
				</nav>

				{/* Footer */}
				<div className="p-4 border-t border-slate-700">
					<button
						onClick={handleLogout}
						className="w-full flex items-center space-x-3 px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
						title={!sidebarOpen ? "Logout" : ""}>
						<LogOut className="w-5 h-5" />
						{sidebarOpen && <span>Logout</span>}
					</button>
				</div>
			</div>

			{/* Main Content */}
			<div className="flex-1 flex flex-col overflow-hidden">
				{/* Top Bar */}
				<div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-8 py-4 flex items-center justify-between">
					<h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
						Admin Dashboard
					</h2>
					<ThemeToggle />
				</div>

				{/* Content */}
				<main className="flex-1 overflow-auto p-8">{children}</main>
			</div>
		</div>
	);
}
