"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Users, Eye, BarChart3, Heart, Image, Film, Calendar } from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { FollowerGrowthChart } from "@/components/charts/follower-growth-chart";
import { EngagementChart } from "@/components/charts/engagement-chart";

type DatePreset = "30" | "60" | "90" | "custom";

interface PlatformStats {
  followers: number;
  totalViews: number;
  totalLikes: number;
  totalEngagement: number;
  videoCount: number;
  postCount: number;
  reelCount: number;
}

function daysAgoISO(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
}

export default function OverviewPage() {
  const supabase = createClient();
  const [tiktokStats, setTiktokStats] = useState<PlatformStats | null>(null);
  const [instagramStats, setInstagramStats] = useState<PlatformStats | null>(null);
  const [followerGrowth, setFollowerGrowth] = useState<
    Array<{ date: string; tiktok: number; instagram: number }>
  >([]);
  const [engagementData, setEngagementData] = useState<
    Array<{ date: string; tiktok: number; instagram: number }>
  >([]);

  const [datePreset, setDatePreset] = useState<DatePreset>("30");
  const [customFrom, setCustomFrom] = useState(daysAgoISO(30));
  const [customTo, setCustomTo] = useState(new Date().toISOString().split("T")[0]);

  function getDateRange(): { from: string; to: string } {
    if (datePreset === "custom") {
      return { from: customFrom, to: customTo };
    }
    return { from: daysAgoISO(Number(datePreset)), to: new Date().toISOString().split("T")[0] };
  }

  useEffect(() => {
    loadData();
  }, [datePreset, customFrom, customTo]);

  async function loadData() {
    const { from, to } = getDateRange();
    const { data: platforms } = await supabase.from("platforms").select("*");
    const tiktok = platforms?.find((p) => p.name === "tiktok");
    const instagram = platforms?.find((p) => p.name === "instagram");

    // Load video stats per platform, filtered by date range
    async function getPlatformStats(platformId: string): Promise<PlatformStats> {
      const { data: videos } = await supabase
        .from("videos")
        .select("view_count, like_count, comment_count, share_count, engagement_rate, content_type")
        .eq("platform_id", platformId)
        .gte("published_at", `${from}T00:00:00`)
        .lte("published_at", `${to}T23:59:59`);

      const vids = videos || [];
      return {
        followers: 0,
        totalViews: vids.reduce((s, v) => s + (v.view_count || 0), 0),
        totalLikes: vids.reduce((s, v) => s + (v.like_count || 0), 0),
        totalEngagement: vids.reduce(
          (s, v) => s + (v.like_count || 0) + (v.comment_count || 0) + (v.share_count || 0),
          0
        ),
        videoCount: vids.length,
        postCount: vids.filter((v) => !v.content_type?.toUpperCase().includes("REEL")).length,
        reelCount: vids.filter((v) => v.content_type?.toUpperCase().includes("REEL")).length,
      };
    }

    if (tiktok) {
      const stats = await getPlatformStats(tiktok.id);
      setTiktokStats(stats);
    }
    if (instagram) {
      const stats = await getPlatformStats(instagram.id);
      setInstagramStats(stats);
    }

    // Load account metrics for charts
    const { data: metrics } = await supabase
      .from("account_metrics_daily")
      .select("*")
      .gte("date", from)
      .lte("date", to)
      .order("date", { ascending: true });

    if (metrics && tiktok && instagram) {
      // Normalize dates — Metricool stores full ISO datetimes, extract just the date part
      const byDate = new Map<string, { tiktokF: number; instagramF: number; tiktokE: number; instagramE: number }>();
      for (const m of metrics) {
        const key = (m.date || "").split("T")[0];
        if (!key) continue;
        const existing = byDate.get(key) || { tiktokF: 0, instagramF: 0, tiktokE: 0, instagramE: 0 };
        if (m.platform_id === tiktok.id) {
          existing.tiktokF = m.follower_count || 0;
          existing.tiktokE = m.total_engagement || 0;
        } else if (m.platform_id === instagram.id) {
          existing.instagramF = m.follower_count || 0;
          existing.instagramE = m.total_engagement || 0;
        }
        byDate.set(key, existing);
      }

      const fmtDate = (d: string) =>
        new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });

      const sortedDates = Array.from(byDate.entries()).sort(([a], [b]) => a.localeCompare(b));

      setFollowerGrowth(
        sortedDates.map(([date, v]) => ({
          date: fmtDate(date),
          tiktok: v.tiktokF,
          instagram: v.instagramF,
        }))
      );

      setEngagementData(
        sortedDates.map(([date, v]) => ({
          date: fmtDate(date),
          tiktok: v.tiktokE,
          instagram: v.instagramE,
        }))
      );
    }

    // Also load posting-based engagement if account metrics are sparse
    if (engagementData.length === 0 && tiktok && instagram) {
      const { data: videos } = await supabase
        .from("videos")
        .select("published_at, platform_id, like_count, comment_count, share_count")
        .gte("published_at", `${from}T00:00:00`)
        .lte("published_at", `${to}T23:59:59`)
        .order("published_at");

      if (videos && videos.length > 0) {
        const byDate = new Map<string, { tiktok: number; instagram: number }>();
        for (const v of videos) {
          const date = v.published_at.split("T")[0];
          const existing = byDate.get(date) || { tiktok: 0, instagram: 0 };
          const eng = (v.like_count || 0) + (v.comment_count || 0) + (v.share_count || 0);
          if (v.platform_id === tiktok.id) existing.tiktok += eng;
          else if (v.platform_id === instagram.id) existing.instagram += eng;
          byDate.set(date, existing);
        }

        const fmtDate = (d: string) =>
          new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });

        setEngagementData(
          Array.from(byDate.entries()).map(([date, v]) => ({
            date: fmtDate(date),
            ...v,
          }))
        );
      }
    }
  }

  function fmt(n: number): string {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return String(n);
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold">Overview</h2>
          <p className="text-stone text-sm mt-1">
            Your social media performance at a glance
          </p>
        </div>

        {/* Date range picker */}
        <div className="flex items-center gap-2 flex-wrap">
          <Calendar className="w-4 h-4 text-stone" />
          {(["30", "60", "90"] as DatePreset[]).map((preset) => (
            <button
              key={preset}
              onClick={() => setDatePreset(preset)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                datePreset === preset
                  ? "bg-primary text-paper border-primary"
                  : "bg-card-bg text-ink border-card-border hover:border-secondary"
              }`}
            >
              {preset}d
            </button>
          ))}
          <button
            onClick={() => setDatePreset("custom")}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              datePreset === "custom"
                ? "bg-primary text-paper border-primary"
                : "bg-card-bg text-ink border-card-border hover:border-secondary"
            }`}
          >
            Custom
          </button>
          {datePreset === "custom" && (
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="px-2 py-1.5 text-xs border border-card-border rounded-lg bg-card-bg"
              />
              <span className="text-stone text-xs">to</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="px-2 py-1.5 text-xs border border-card-border rounded-lg bg-card-bg"
              />
            </div>
          )}
        </div>
      </div>

      {/* TikTok stats */}
      <h3 className="text-sm font-semibold text-stone uppercase tracking-wider mb-3">
        TikTok
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Videos"
          value={tiktokStats?.videoCount ?? 0}
          icon={Users}
          platform="tiktok"
        />
        <StatCard
          label="Total Views"
          value={fmt(tiktokStats?.totalViews ?? 0)}
          icon={Eye}
          platform="tiktok"
        />
        <StatCard
          label="Total Likes"
          value={fmt(tiktokStats?.totalLikes ?? 0)}
          icon={Heart}
          platform="tiktok"
        />
        <StatCard
          label="Total Engagement"
          value={fmt(tiktokStats?.totalEngagement ?? 0)}
          icon={BarChart3}
          platform="tiktok"
        />
      </div>

      {/* Instagram stats */}
      <h3 className="text-sm font-semibold text-stone uppercase tracking-wider mb-3">
        Instagram
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <StatCard
          label="Posts"
          value={instagramStats?.postCount ?? 0}
          icon={Image}
          platform="instagram"
        />
        <StatCard
          label="Reels"
          value={instagramStats?.reelCount ?? 0}
          icon={Film}
          platform="instagram"
        />
        <StatCard
          label="Total Views"
          value={fmt(instagramStats?.totalViews ?? 0)}
          icon={Eye}
          platform="instagram"
        />
        <StatCard
          label="Total Likes"
          value={fmt(instagramStats?.totalLikes ?? 0)}
          icon={Heart}
          platform="instagram"
        />
        <StatCard
          label="Total Engagement"
          value={fmt(instagramStats?.totalEngagement ?? 0)}
          icon={BarChart3}
          platform="instagram"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <FollowerGrowthChart data={followerGrowth} />
        <EngagementChart data={engagementData} />
      </div>
    </div>
  );
}
