"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface VideoHookData {
  id: string;
  title: string;
  platform_name: string;
  duration_seconds: number;
  avg_watch_time_seconds: number;
  hook_score: number;
  view_count: number;
  published_at: string;
}

export default function HookScoresPage() {
  const supabase = createClient();
  const [videos, setVideos] = useState<VideoHookData[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const { data } = await supabase
      .from("videos")
      .select("*, platforms(name)")
      .not("avg_watch_time_seconds", "is", null)
      .not("duration_seconds", "is", null)
      .order("published_at", { ascending: false });

    if (data) {
      const withScores = data
        .map((v) => {
          const platform = v.platforms as unknown as { name: string };
          return {
            id: v.id,
            title: v.title || "Untitled",
            platform_name: platform?.name || "unknown",
            duration_seconds: v.duration_seconds!,
            avg_watch_time_seconds: v.avg_watch_time_seconds!,
            hook_score: v.avg_watch_time_seconds! / v.duration_seconds!,
            view_count: v.view_count,
            published_at: v.published_at,
          };
        })
        .sort((a, b) => b.hook_score - a.hook_score);

      setVideos(withScores);
    }
  }

  function getScoreColor(score: number): string {
    if (score >= 0.6) return "#CD4146";
    if (score >= 0.4) return "#E8B4B4";
    return "#8C8C8C";
  }

  function getScoreLabel(score: number): string {
    if (score >= 0.6) return "Strong";
    if (score >= 0.4) return "Average";
    return "Weak";
  }

  const chartData = videos.slice(0, 20).map((v) => ({
    name: v.title.length > 25 ? v.title.slice(0, 25) + "..." : v.title,
    hookScore: Math.round(v.hook_score * 100),
    color: getScoreColor(v.hook_score),
  }));

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold">Hook Score Leaderboard</h2>
        <p className="text-stone text-sm mt-1">
          Videos ranked by retention strength (avg watch time / duration).
          Higher = people watch longer.
        </p>
      </div>

      {videos.length === 0 ? (
        <div className="bg-card-bg border border-card-border rounded-xl p-12 text-center">
          <p className="text-stone">
            No videos with watch time data yet. This will populate once
            Metricool syncs watch time metrics.
          </p>
        </div>
      ) : (
        <>
          {/* Chart */}
          <div className="bg-card-bg border border-card-border rounded-xl p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">
              Top 20 Videos by Hook Score
            </h3>
            <div className="h-[500px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8D5D5" />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 12 }}
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={180}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(value) => [`${value}%`, "Hook Score"]}
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid #E8D5D5",
                    }}
                  />
                  <Bar dataKey="hookScore" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Table */}
          <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-card-border bg-blush/20">
                  <th className="text-left px-4 py-3 font-medium">#</th>
                  <th className="text-left px-4 py-3 font-medium">Video</th>
                  <th className="text-left px-4 py-3 font-medium">Platform</th>
                  <th className="text-right px-4 py-3 font-medium">
                    Duration
                  </th>
                  <th className="text-right px-4 py-3 font-medium">
                    Avg Watch
                  </th>
                  <th className="text-right px-4 py-3 font-medium">
                    Hook Score
                  </th>
                  <th className="text-right px-4 py-3 font-medium">Rating</th>
                  <th className="text-right px-4 py-3 font-medium">Views</th>
                </tr>
              </thead>
              <tbody>
                {videos.map((v, i) => (
                  <tr
                    key={v.id}
                    className="border-b border-card-border last:border-0 hover:bg-blush/20"
                  >
                    <td className="px-4 py-3 text-stone font-mono">
                      {i + 1}
                    </td>
                    <td className="px-4 py-3 font-medium max-w-[250px] truncate">
                      {v.title}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          v.platform_name === "tiktok"
                            ? "bg-tiktok/10 text-tiktok"
                            : "bg-instagram/10 text-instagram"
                        }`}
                      >
                        {v.platform_name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {Math.round(v.duration_seconds)}s
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {Math.round(v.avg_watch_time_seconds)}s
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-bold">
                      {(v.hook_score * 100).toFixed(0)}%
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          v.hook_score >= 0.6
                            ? "bg-blush/40 text-secondary"
                            : v.hook_score >= 0.4
                              ? "bg-dusty-rose/30 text-ink"
                              : "bg-primary/10 text-primary"
                        }`}
                      >
                        {getScoreLabel(v.hook_score)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {v.view_count.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
