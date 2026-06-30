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
import { formatVND } from "@/lib/currency";
import type { MonthlyRevenue } from "@/lib/analytics-server";

interface Props {
  data: MonthlyRevenue[];
}

export default function RevenueChart({ data }: Props) {
  const total = data.reduce((s, d) => s + d.revenue, 0);
  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);
  const yTickCount = 5;

  return (
    <ChartCard
      title="Doanh thu"
      subtitle={`Tổng: ${formatVND(total)}`}
    >
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => `${(Number(v) / 1_000_000).toFixed(0)}tr`}
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
              domain={[0, Math.ceil(maxRevenue * 1.2 / 1_000_000) * 1_000_000]}
              ticks={Array.from({ length: yTickCount }, (_, i) =>
                Math.round((maxRevenue * 1.2 * i) / (yTickCount - 1) / 1_000_000) * 1_000_000
              )}
            />
            <Tooltip
              formatter={(value) => [formatVND(Number(value)), "Doanh thu"]}
              contentStyle={{
                borderRadius: 8,
                border: "1px solid #e2e8f0",
                fontSize: 12,
              }}
            />
            <Bar
              dataKey="revenue"
              fill="#9b3f1c"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
