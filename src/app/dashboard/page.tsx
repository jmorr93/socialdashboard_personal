"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Users, Eye, BarChart3, Heart, Image, Film } from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { FollowerGrowthChart } from "@/components/charts/follower-growth-chart";
import { EngagementChart } from "@/components/charts/engagement-chart";

interface PlatformStats {
  followers: number;
  totalViews: number;
  totalLikes: number;
  totalEngagement: number;
  videoCount: number;
  postCount: number;
  reelCount: number;
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

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const { data: platforms } = await supabase.from("platforms").select("*");
    const tiktok = platforms?.find((p) => p.name === "tiktok");
    const instagram = platforms?.find((p) => p.name === "instagram");

    // Load video stats per platform
    async function getPlatformStats(platformId: string): Promise<PlatformStats> {
      const { data: videos } = await supabase
        .from("videos")
        .select("view_count, like_count, comment_count, share_count, engagement_rate, content_type")
        .eq("platform_id", platformId);

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
        postCount: vids.filter((v) => !v.content_type?.includes("REEL")).length,
        reelCount: vids.filter((v) => v.content_type?.includes("REEL")).length,
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
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const { data: metrics } = await supabase
      .from("account_metrics_daily")
      .select("*")
      .gte("date", thirtyDaysAgo)
      .order("date", { ascending: true });

    if (metrics && tiktok && instagram) {
      const byDate = new Map<string, { tiktokF: number; instagramF: number; tiktokE: number; instagramE: number }>();
      for (const m of metrics) {
        const key = m.date;
        const existing = byDate.get(key) || { tiktokF: 0, instagramF: 0, tiktokE: 0, instagramE: 0 };
        if (m.platform_id === tiktok.id) {
          existing.tiktokF = m.follower_count || 0;
          existing.tiktokE = m.total_engagement || m.total_impressions || 0;
        } else if (m.platform_id === instagram.id) {
          existing.instagramF = m.follower_count || 0;
          existing.instagramE = m.total_engagement || m.total_impressions || 0;
        }
        byDate.set(key, existing);
      }

      const fmtDate = (d: string) =>
        new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });

      setFollowerGrowth(
        Array.from(byDate.entries()).map(([date, v]) => ({
          date: fmtDate(date),
          tiktok: v.tiktokF,
          instagram: v.instagramF,
        }))
      );

      setEngagementData(
        Array.from(byDate.entries()).map(([date, v]) => ({
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
        .gte("published_at", thirtyDaysAgo)
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
      <div className="mb-8">
        <h2 className="text-2xl font-bold">Overview</h2>
        <p className="text-stone text-sm mt-1">
          Your social media performance at a glance
        </p>
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
