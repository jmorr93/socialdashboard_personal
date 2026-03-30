"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface FollowerGrowthChartProps {
  data: Array<{
    date: string;
    tiktok: number;
    instagram: number;
  }>;
}

export function FollowerGrowthChart({ data }: FollowerGrowthChartProps) {
  return (
    <div className="bg-card-bg border border-card-border rounded-xl p-6">
      <h3 className="text-lg font-semibold mb-4 text-ink">Follower Growth</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E8D5D5" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12, fill: "#8C8C8C" }}
              tickLine={false}
              axisLine={{ stroke: "#E8D5D5" }}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "#8C8C8C" }}
              tickLine={false}
              axisLine={{ stroke: "#E8D5D5" }}
              tickFormatter={(v) =>
                v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)
              }
            />
            <Tooltip
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid #E8D5D5",
                backgroundColor: "#F5F3F0",
                fontSize: "13px",
                color: "#1A1A1A",
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="tiktok"
              name="TikTok"
              stroke="#00f2ea"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="instagram"
              name="Instagram"
              stroke="#CD4146"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
