import StatCard from "@/components/dashboard/StatCard";
import RevenueChart from "@/components/dashboard/RevenueChart";
import OrdersChart from "@/components/dashboard/OrdersChart";
import ReviewsChart from "@/components/dashboard/ReviewsChart";
import TrackingChart from "@/components/dashboard/TrackingChart";
import OutOfStockList from "@/components/dashboard/OutOfStockList";
import { getAdminClient } from "@/lib/supabase/admin";
import {
  getRevenueData,
  getOrdersData,
  getReviewsData,
  getRatingDistribution,
  getTrackingData,
  getOutOfStockProducts,
} from "@/lib/analytics-server";
import { Package, ShoppingCart, Users, Wrench } from "lucide-react";

export const metadata = {
  title: "Dashboard - NoobStore Admin",
};

export default async function DashboardPage() {
  const supabase = getAdminClient();

  const [
    { count: productCount },
    { count: orderCount },
    { count: userCount },
    { data: serviceOrderRows },
    revenueData,
    ordersData,
    reviewsData,
    ratingDistribution,
    outOfStockItems,
  ] = await Promise.all([
    supabase.from("products").select("*", { count: "exact", head: true }),
    supabase.from("orders").select("*", { count: "exact", head: true }),
    supabase.from("users").select("*", { count: "exact", head: true }),
    supabase.from("order_services").select("order_id"),
    getRevenueData(),
    getOrdersData(),
    getReviewsData(),
    getRatingDistribution(),
    getOutOfStockProducts(),
  ]);

  const serviceCount = new Set(serviceOrderRows?.map((r) => r.order_id)).size;

  const trackingData = getTrackingData();

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
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RevenueChart data={revenueData} />
        <OrdersChart data={ordersData} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ReviewsChart monthlyData={reviewsData} distribution={ratingDistribution} />
        <TrackingChart data={trackingData} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <OutOfStockList items={outOfStockItems} />
      </div>
    </div>
  );
}
