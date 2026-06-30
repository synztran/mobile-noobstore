"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import ChartCard from "./ChartCard";
import type { MonthlyReviews, RatingDistribution } from "@/lib/analytics-server";

interface Props {
  monthlyData: MonthlyReviews[];
  distribution: RatingDistribution[];
}

const RATING_COLORS = ["#ef4444", "#f97316", "#eab308", "#84cc16", "#22c55e"];

export default function ReviewsChart({ monthlyData, distribution }: Props) {
  const totalReviews = monthlyData.reduce((s, d) => s + d.count, 0);

  return (
    <ChartCard
      title="Đánh giá"
      subtitle={`${totalReviews} đánh giá`}
    >
      <div className="grid grid-cols-1 gap-6">
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid #e2e8f0",
                  fontSize: 12,
                }}
              />
              <Bar
                dataKey="count"
                name="Số lượng"
                fill="#9b3f1c"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Phân bố sao
          </p>
          <div className="space-y-1.5">
            {[...distribution].reverse().map((d) => (
              <div key={d.rating} className="flex items-center gap-2">
                <span className="w-6 text-right text-xs font-medium text-slate-600">
                  {d.rating}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${totalReviews > 0 ? (d.count / totalReviews) * 100 : 0}%`,
                      backgroundColor: RATING_COLORS[d.rating - 1],
                    }}
                  />
                </div>
                <span className="w-8 text-right text-xs text-slate-400">
                  {d.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ChartCard>
  );
}
