"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
  BarChart,
  Bar,
} from "recharts";

type TimeRange = "7d" | "30d" | "90d";

interface DailyMetric {
  date: string;
  tiktokFollowers: number;
  instagramFollowers: number;
  tiktokReach: number;
  instagramReach: number;
  tiktokImpressions: number;
  instagramImpressions: number;
}

export default function GrowthPage() {
  const supabase = createClient();
  const [data, setData] = useState<DailyMetric[]>([]);
  const [range, setRange] = useState<TimeRange>("30d");
  const [postingData, setPostingData] = useState<
    Array<{ date: string; tiktok: number; instagram: number }>
  >([]);

  useEffect(() => {
    loadData();
  }, [range]);

  async function loadData() {
    const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
    const dateFrom = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    // Get platforms
    const { data: platforms } = await supabase.from("platforms").select("*");
    const tiktok = platforms?.find((p) => p.name === "tiktok");
    const instagram = platforms?.find((p) => p.name === "instagram");

    // Get account metrics
    const { data: metrics } = await supabase
      .from("account_metrics_daily")
      .select("*")
      .gte("date", dateFrom)
      .order("date", { ascending: true });

    if (metrics) {
      const byDate = new Map<string, DailyMetric>();
      for (const m of metrics) {
        const existing = byDate.get(m.date) || {
          date: m.date,
          tiktokFollowers: 0,
          instagramFollowers: 0,
          tiktokReach: 0,
          instagramReach: 0,
          tiktokImpressions: 0,
          instagramImpressions: 0,
        };

        if (m.platform_id === tiktok?.id) {
          existing.tiktokFollowers = m.follower_count;
          existing.tiktokReach = m.total_reach || 0;
          existing.tiktokImpressions = m.total_impressions || 0;
        } else if (m.platform_id === instagram?.id) {
          existing.instagramFollowers = m.follower_count;
          existing.instagramReach = m.total_reach || 0;
          existing.instagramImpressions = m.total_impressions || 0;
        }

        byDate.set(m.date, existing);
      }
      setData(Array.from(byDate.values()));
    }

    // Posting frequency
    const { data: videos } = await supabase
      .from("videos")
      .select("published_at, platform_id")
      .gte("published_at", dateFrom)
      .order("published_at");

    if (videos) {
      const postsByDate = new Map<
        string,
        { tiktok: number; instagram: number }
      >();
      for (const v of videos) {
        const date = v.published_at.split("T")[0];
        const existing = postsByDate.get(date) || {
          tiktok: 0,
          instagram: 0,
        };
        if (v.platform_id === tiktok?.id) existing.tiktok++;
        else if (v.platform_id === instagram?.id) existing.instagram++;
        postsByDate.set(date, existing);
      }
      setPostingData(
        Array.from(postsByDate.entries()).map(([date, counts]) => ({
          date,
          ...counts,
        }))
      );
    }
  }

  const chartData = data.map((d) => ({
    ...d,
    date: new Date(d.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold">Growth & Trends</h2>
          <p className="text-stone text-sm mt-1">
            Track your follower growth, reach, and posting consistency
          </p>
        </div>
        <div className="flex gap-1 bg-blush/30 rounded-lg p-0.5">
          {(["7d", "30d", "90d"] as TimeRange[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                range === r
                  ? "bg-paper text-foreground shadow-sm"
                  : "text-stone hover:text-ink"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Follower Growth */}
      <div className="bg-card-bg border border-card-border rounded-xl p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">Follower Growth</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8D5D5" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(v) =>
                  v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)
                }
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid #E8D5D5",
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="tiktokFollowers"
                name="TikTok"
                stroke="#00f2ea"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="instagramFollowers"
                name="Instagram"
                stroke="#CD4146"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Reach over time */}
      <div className="bg-card-bg border border-card-border rounded-xl p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">Daily Reach</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8D5D5" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(v) =>
                  v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)
                }
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid #E8D5D5",
                }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="tiktokReach"
                name="TikTok Reach"
                stroke="#00f2ea"
                fill="#00f2ea"
                fillOpacity={0.1}
              />
              <Area
                type="monotone"
                dataKey="instagramReach"
                name="Instagram Reach"
                stroke="#CD4146"
                fill="#CD4146"
                fillOpacity={0.1}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Posting Frequency */}
      <div className="bg-card-bg border border-card-border rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">Posting Frequency</h3>
        {postingData.length === 0 ? (
          <p className="text-stone text-center py-8">
            No posting data yet
          </p>
        ) : (
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={postingData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8D5D5" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) =>
                    new Date(v).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  }
                />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="tiktok"
                  name="TikTok"
                  fill="#00f2ea"
                  radius={[2, 2, 0, 0]}
                  stackId="a"
                />
                <Bar
                  dataKey="instagram"
                  name="Instagram"
                  fill="#CD4146"
                  radius={[2, 2, 0, 0]}
                  stackId="a"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
