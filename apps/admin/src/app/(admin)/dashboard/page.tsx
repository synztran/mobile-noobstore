import StatCard from "@/components/dashboard/StatCard";
import { getAdminClient } from "@/lib/supabase/admin";
import { Package, ShoppingCart, Users, Wrench } from "lucide-react";

export const metadata = {
	title: "Dashboard - NoobStore Admin",
};

export default async function DashboardPage() {
	const supabase = getAdminClient();

	// Fetch statistics
	const [
		{ count: productCount },
		{ count: orderCount },
		{ count: userCount },
		{ data: serviceOrderRows },
	] = await Promise.all([
		supabase.from("products").select("*", { count: "exact", head: true }),
		supabase.from("orders").select("*", { count: "exact", head: true }),
		supabase.from("users").select("*", { count: "exact", head: true }),
		supabase
			.from("order_services")
			.select("order_id")
			.not("order_id", "is", null), // distinct service orders counted below
	]);

	const serviceCount = new Set(serviceOrderRows?.map((r) => r.order_id)).size;

	const stats = [
		{
			label: "Total Products",
			value: productCount || 0,
			icon: Package,
			color: "bg-blue-100 text-blue-600",
		},
		{
			label: "Total Orders",
			value: orderCount || 0,
			icon: ShoppingCart,
			color: "bg-green-100 text-green-600",
		},
		{
			label: "Total Users",
			value: userCount || 0,
			icon: Users,
			color: "bg-purple-100 text-purple-600",
		},
		{
			label: "Service Bookings",
			value: serviceCount || 0,
			icon: Wrench,
			color: "bg-orange-100 text-orange-600",
		},
	];

	return (
		<div className="space-y-8">
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
				{stats.map((stat) => (
					<StatCard key={stat.label} {...stat} />
				))}
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<div className="bg-white rounded-lg shadow p-6">
					<h3 className="text-lg font-semibold mb-4 text-slate-900">
						Recent Orders
					</h3>
					<div className="text-center text-slate-500 py-8">
						No recent orders yet
					</div>
				</div>

				<div className="bg-white rounded-lg shadow p-6">
					<h3 className="text-lg font-semibold mb-4 text-slate-900">
						Quick Stats
					</h3>
					<div className="space-y-3">
						<div className="flex justify-between">
							<span className="text-slate-600">
								Low Stock Items
							</span>
							<span className="font-semibold text-slate-900">
								0
							</span>
						</div>
						<div className="flex justify-between">
							<span className="text-slate-600">
								Pending Orders
							</span>
							<span className="font-semibold text-slate-900">
								0
							</span>
						</div>
						<div className="flex justify-between">
							<span className="text-slate-600">
								Active Services
							</span>
							<span className="font-semibold text-slate-900">
								0
							</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
