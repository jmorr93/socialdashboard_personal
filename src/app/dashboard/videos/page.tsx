"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Search, Filter, Tag, ExternalLink } from "lucide-react";
import type { VideoRow, ContentPillarRow } from "@/lib/types/database";

type SortField = "view_count" | "like_count" | "engagement_rate" | "published_at" | "hook_score";
type SortDir = "asc" | "desc";

interface VideoWithPillars extends VideoRow {
  platform_name?: string;
  pillars?: ContentPillarRow[];
  hook_score?: number;
}

export default function VideosPage() {
  const supabase = createClient();
  const [videos, setVideos] = useState<VideoWithPillars[]>([]);
  const [pillars, setPillars] = useState<ContentPillarRow[]>([]);
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState<"all" | "tiktok" | "instagram">("all");
  const [pillarFilter, setPillarFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("published_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [taggingVideo, setTaggingVideo] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [videosResult, pillarsResult] = await Promise.all([
      supabase
        .from("videos")
        .select("*, platforms(name)")
        .order("published_at", { ascending: false }),
      supabase.from("content_pillars").select("*").order("sort_order"),
    ]);

    if (pillarsResult.data) setPillars(pillarsResult.data as ContentPillarRow[]);

    if (videosResult.data) {
      // Load pillar tags for all videos
      const videoIds = videosResult.data.map((v) => v.id);
      const { data: tags } = await supabase
        .from("video_pillar_tags")
        .select("*, content_pillars(*)")
        .in("video_id", videoIds);

      const videosWithPillars = videosResult.data.map((v) => {
        const videoTags = tags?.filter((t) => t.video_id === v.id) || [];
        const platform = v.platforms as unknown as { name: string };
        return {
          ...v,
          platform_name: platform?.name,
          pillars: videoTags.map(
            (t) => t.content_pillars as unknown as ContentPillarRow
          ),
          hook_score:
            v.avg_watch_time_seconds && v.duration_seconds
              ? v.avg_watch_time_seconds / v.duration_seconds
              : undefined,
        } as VideoWithPillars;
      });
      setVideos(videosWithPillars);
    }
  }

  async function tagVideo(videoId: string, pillarId: string) {
    await supabase.from("video_pillar_tags").upsert({
      video_id: videoId,
      pillar_id: pillarId,
      tagged_by: "manual",
    });
    setTaggingVideo(null);
    loadData();
  }

  async function removeTag(videoId: string, pillarId: string) {
    await supabase
      .from("video_pillar_tags")
      .delete()
      .eq("video_id", videoId)
      .eq("pillar_id", pillarId);
    loadData();
  }

  const filtered = videos
    .filter((v) => {
      if (platformFilter !== "all" && v.platform_name !== platformFilter) return false;
      if (pillarFilter !== "all" && !v.pillars?.some((p) => p.id === pillarFilter)) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          v.title?.toLowerCase().includes(q) ||
          v.description?.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      let aVal: number, bVal: number;
      if (sortField === "hook_score") {
        aVal = a.hook_score || 0;
        bVal = b.hook_score || 0;
      } else if (sortField === "published_at") {
        aVal = new Date(a.published_at).getTime();
        bVal = new Date(b.published_at).getTime();
      } else {
        aVal = (a[sortField] as number) || 0;
        bVal = (b[sortField] as number) || 0;
      }
      return sortDir === "desc" ? bVal - aVal : aVal - bVal;
    });

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(sortDir === "desc" ? "asc" : "desc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Videos</h2>
        <p className="text-stone text-sm mt-1">
          Browse, sort, and tag your content
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search videos..."
            className="w-full pl-9 pr-3 py-2 border border-card-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sidebar-active"
          />
        </div>
        <select
          value={platformFilter}
          onChange={(e) => setPlatformFilter(e.target.value as typeof platformFilter)}
          className="px-3 py-2 border border-card-border rounded-lg text-sm bg-card-bg"
        >
          <option value="all">All Platforms</option>
          <option value="tiktok">TikTok</option>
          <option value="instagram">Instagram</option>
        </select>
        <select
          value={pillarFilter}
          onChange={(e) => setPillarFilter(e.target.value)}
          className="px-3 py-2 border border-card-border rounded-lg text-sm bg-card-bg"
        >
          <option value="all">All Pillars</option>
          {pillars.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-card-border bg-blush/20">
                <th className="text-left px-4 py-3 font-medium">Video</th>
                <th className="text-left px-4 py-3 font-medium">Platform</th>
                <th className="text-left px-4 py-3 font-medium">Pillars</th>
                <th
                  className="text-right px-4 py-3 font-medium cursor-pointer hover:text-sidebar-active"
                  onClick={() => toggleSort("view_count")}
                >
                  Views {sortField === "view_count" ? (sortDir === "desc" ? "↓" : "↑") : ""}
                </th>
                <th
                  className="text-right px-4 py-3 font-medium cursor-pointer hover:text-sidebar-active"
                  onClick={() => toggleSort("like_count")}
                >
                  Likes {sortField === "like_count" ? (sortDir === "desc" ? "↓" : "↑") : ""}
                </th>
                <th
                  className="text-right px-4 py-3 font-medium cursor-pointer hover:text-sidebar-active"
                  onClick={() => toggleSort("engagement_rate")}
                >
                  Eng. Rate {sortField === "engagement_rate" ? (sortDir === "desc" ? "↓" : "↑") : ""}
                </th>
                <th
                  className="text-right px-4 py-3 font-medium cursor-pointer hover:text-sidebar-active"
                  onClick={() => toggleSort("hook_score")}
                >
                  Hook Score {sortField === "hook_score" ? (sortDir === "desc" ? "↓" : "↑") : ""}
                </th>
                <th
                  className="text-right px-4 py-3 font-medium cursor-pointer hover:text-sidebar-active"
                  onClick={() => toggleSort("published_at")}
                >
                  Published {sortField === "published_at" ? (sortDir === "desc" ? "↓" : "↑") : ""}
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-stone">
                    No videos found. Sync your data from Settings or wait for the next auto-sync.
                  </td>
                </tr>
              ) : (
                filtered.map((video) => (
                  <tr
                    key={video.id}
                    className="border-b border-card-border last:border-0 hover:bg-blush/20"
                  >
                    <td className="px-4 py-3 max-w-[250px]">
                      <p className="font-medium truncate">
                        {video.title || "Untitled"}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          video.platform_name === "tiktok"
                            ? "bg-tiktok/10 text-tiktok"
                            : "bg-instagram/10 text-instagram"
                        }`}
                      >
                        {video.platform_name}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 flex-wrap">
                        {video.pillars?.map((p) => (
                          <span
                            key={p.id}
                            className="text-xs px-2 py-0.5 rounded-full text-white cursor-pointer"
                            style={{ backgroundColor: p.color }}
                            onClick={() => removeTag(video.id, p.id)}
                            title="Click to remove"
                          >
                            {p.name}
                          </span>
                        ))}
                        <button
                          onClick={() =>
                            setTaggingVideo(
                              taggingVideo === video.id ? null : video.id
                            )
                          }
                          className="p-0.5 rounded hover:bg-blush/20"
                          title="Add pillar tag"
                        >
                          <Tag size={12} className="text-stone" />
                        </button>
                        {taggingVideo === video.id && (
                          <div className="absolute mt-8 bg-card-bg border border-card-border rounded-lg shadow-lg p-2 z-10">
                            {pillars.map((p) => (
                              <button
                                key={p.id}
                                onClick={() => tagVideo(video.id, p.id)}
                                className="block w-full text-left px-3 py-1.5 text-xs rounded hover:bg-blush/20"
                              >
                                <span
                                  className="inline-block w-2 h-2 rounded-full mr-2"
                                  style={{ backgroundColor: p.color }}
                                />
                                {p.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {video.view_count.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {video.like_count.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {video.engagement_rate
                        ? `${(video.engagement_rate * 100).toFixed(1)}%`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {video.hook_score
                        ? `${(video.hook_score * 100).toFixed(0)}%`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-stone">
                      {new Date(video.published_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
