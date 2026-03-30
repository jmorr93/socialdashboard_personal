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
} from "recharts";

interface VideoOption {
  id: string;
  title: string;
  platform_name: string;
  published_at: string;
}

interface TimelinePoint {
  hoursAfterPublish: number;
  label: string;
  views: number;
  likes: number;
  shares: number;
}

export default function TimelinePage() {
  const supabase = createClient();
  const [videos, setVideos] = useState<VideoOption[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<string>("");
  const [timelineData, setTimelineData] = useState<TimelinePoint[]>([]);

  useEffect(() => {
    loadVideos();
  }, []);

  useEffect(() => {
    if (selectedVideo) loadTimeline(selectedVideo);
  }, [selectedVideo]);

  async function loadVideos() {
    const { data } = await supabase
      .from("videos")
      .select("id, title, published_at, platforms(name)")
      .order("published_at", { ascending: false })
      .limit(50);

    if (data) {
      setVideos(
        data.map((v) => ({
          id: v.id,
          title: v.title || "Untitled",
          platform_name:
            (v.platforms as unknown as { name: string })?.name || "unknown",
          published_at: v.published_at,
        }))
      );
    }
  }

  async function loadTimeline(videoId: string) {
    const { data } = await supabase
      .from("video_metrics_history")
      .select("*")
      .eq("video_id", videoId)
      .order("captured_at", { ascending: true });

    if (!data || data.length === 0) {
      setTimelineData([]);
      return;
    }

    const video = videos.find((v) => v.id === videoId);
    if (!video) return;

    const publishedAt = new Date(video.published_at).getTime();

    setTimelineData(
      data.map((point) => {
        const hours =
          (new Date(point.captured_at).getTime() - publishedAt) / 3600000;
        return {
          hoursAfterPublish: Math.round(hours),
          label:
            hours < 24
              ? `${Math.round(hours)}h`
              : `${Math.round(hours / 24)}d`,
          views: point.view_count,
          likes: point.like_count,
          shares: point.share_count,
        };
      })
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold">Video Performance Timeline</h2>
        <p className="text-stone text-sm mt-1">
          See how a video&apos;s metrics evolve over time after publishing
        </p>
      </div>

      {/* Video selector */}
      <div className="mb-6">
        <select
          value={selectedVideo}
          onChange={(e) => setSelectedVideo(e.target.value)}
          className="w-full max-w-md px-3 py-2 border border-card-border rounded-lg text-sm bg-card-bg"
        >
          <option value="">Select a video...</option>
          {videos.map((v) => (
            <option key={v.id} value={v.id}>
              [{v.platform_name}] {v.title} (
              {new Date(v.published_at).toLocaleDateString()})
            </option>
          ))}
        </select>
      </div>

      {!selectedVideo ? (
        <div className="bg-card-bg border border-card-border rounded-xl p-12 text-center">
          <p className="text-stone">
            Select a video above to see its performance timeline
          </p>
        </div>
      ) : timelineData.length === 0 ? (
        <div className="bg-card-bg border border-card-border rounded-xl p-12 text-center">
          <p className="text-stone">
            No timeline data yet for this video. Data accumulates with each sync
            cycle.
          </p>
        </div>
      ) : (
        <div className="bg-card-bg border border-card-border rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">
            Metrics Over Time
          </h3>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8D5D5" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
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
                  dataKey="views"
                  name="Views"
                  stroke="#C10000"
                  strokeWidth={2}
                  dot
                />
                <Line
                  type="monotone"
                  dataKey="likes"
                  name="Likes"
                  stroke="#CD4146"
                  strokeWidth={2}
                  dot
                />
                <Line
                  type="monotone"
                  dataKey="shares"
                  name="Shares"
                  stroke="#E8B4B4"
                  strokeWidth={2}
                  dot
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
