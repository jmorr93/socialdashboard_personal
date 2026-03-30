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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from "recharts";

interface PillarStats {
  name: string;
  color: string;
  videoCount: number;
  avgViews: number;
  avgEngagement: number;
  avgHookScore: number;
  totalViews: number;
}

export default function PillarPerformancePage() {
  const supabase = createClient();
  const [stats, setStats] = useState<PillarStats[]>([]);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    const { data: pillars } = await supabase
      .from("content_pillars")
      .select("*")
      .order("sort_order");

    if (!pillars) return;

    const pillarStats: PillarStats[] = [];

    for (const pillar of pillars) {
      const { data: tags } = await supabase
        .from("video_pillar_tags")
        .select("video_id")
        .eq("pillar_id", pillar.id);

      if (!tags || tags.length === 0) {
        pillarStats.push({
          name: pillar.name,
          color: pillar.color,
          videoCount: 0,
          avgViews: 0,
          avgEngagement: 0,
          avgHookScore: 0,
          totalViews: 0,
        });
        continue;
      }

      const videoIds = tags.map((t) => t.video_id);
      const { data: videos } = await supabase
        .from("videos")
        .select("*")
        .in("id", videoIds);

      if (!videos || videos.length === 0) continue;

      const totalViews = videos.reduce((s, v) => s + v.view_count, 0);
      const avgViews = totalViews / videos.length;
      const avgEngagement =
        videos.reduce((s, v) => s + (v.engagement_rate || 0), 0) /
        videos.length;
      const videosWithHook = videos.filter(
        (v) => v.avg_watch_time_seconds && v.duration_seconds
      );
      const avgHookScore =
        videosWithHook.length > 0
          ? videosWithHook.reduce(
              (s, v) => s + v.avg_watch_time_seconds! / v.duration_seconds!,
              0
            ) / videosWithHook.length
          : 0;

      pillarStats.push({
        name: pillar.name,
        color: pillar.color,
        videoCount: videos.length,
        avgViews: Math.round(avgViews),
        avgEngagement,
        avgHookScore,
        totalViews,
      });
    }

    setStats(pillarStats);
  }

  const radarData = stats.map((s) => ({
    pillar: s.name,
    views: s.avgViews,
    engagement: s.avgEngagement * 100,
    hookScore: s.avgHookScore * 100,
  }));

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold">Content Pillar Performance</h2>
        <p className="text-stone text-sm mt-1">
          Compare how your content themes perform against each other
        </p>
      </div>

      {stats.length === 0 ? (
        <div className="bg-card-bg border border-card-border rounded-xl p-12 text-center">
          <p className="text-stone">
            Tag your videos with content pillars to see performance data here
          </p>
        </div>
      ) : (
        <>
          {/* Bar chart: avg views per pillar */}
          <div className="bg-card-bg border border-card-border rounded-xl p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">
              Average Views per Pillar
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8D5D5" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
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
                  <Bar
                    dataKey="avgViews"
                    name="Avg Views"
                    radius={[4, 4, 0, 0]}
                    fill="#C10000"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Radar chart */}
          <div className="bg-card-bg border border-card-border rounded-xl p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">
              Pillar Comparison (Radar)
            </h3>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="pillar" tick={{ fontSize: 12 }} />
                  <PolarRadiusAxis tick={{ fontSize: 10 }} />
                  <Radar
                    name="Engagement %"
                    dataKey="engagement"
                    stroke="#CD4146"
                    fill="#CD4146"
                    fillOpacity={0.2}
                  />
                  <Radar
                    name="Hook Score %"
                    dataKey="hookScore"
                    stroke="#C10000"
                    fill="#C10000"
                    fillOpacity={0.2}
                  />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.map((s) => (
              <div
                key={s.name}
                className="bg-card-bg border border-card-border rounded-xl p-5"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: s.color }}
                  />
                  <h4 className="font-semibold">{s.name}</h4>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-stone">Videos</p>
                    <p className="font-bold">{s.videoCount}</p>
                  </div>
                  <div>
                    <p className="text-stone">Total Views</p>
                    <p className="font-bold">{s.totalViews.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-stone">Avg Engagement</p>
                    <p className="font-bold">
                      {(s.avgEngagement * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-stone">Avg Hook Score</p>
                    <p className="font-bold">
                      {(s.avgHookScore * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
