import { createClient } from "@supabase/supabase-js";
import { fetchVideos, fetchAccountMetrics, type NormalisedVideo } from "./client";

// Use service role for cron jobs (bypasses RLS)
function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function syncVideos(platformName: "tiktok" | "instagram") {
  const supabase = createServiceClient();

  const { data: platform } = await supabase
    .from("platforms")
    .select("id")
    .eq("name", platformName)
    .single();

  if (!platform) {
    throw new Error(`Platform ${platformName} not found. Connect it in settings first.`);
  }

  const { data: syncLog } = await supabase
    .from("sync_log")
    .insert({
      platform_id: (platform as Record<string, string>).id,
      sync_type: "videos",
      status: "in_progress",
    } as Record<string, unknown>)
    .select()
    .single();

  try {
    const dateTo = new Date().toISOString().split("T")[0];
    const dateFrom = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const videos = await fetchVideos(platformName, dateFrom, dateTo);
    let syncedCount = 0;

    for (const video of videos) {
      const { data: upserted } = await supabase
        .from("videos")
        .upsert(
          {
            platform_id: (platform as Record<string, string>).id,
            platform_video_id: video.id,
            title: video.title || null,
            description: video.description || null,
            thumbnail_url: video.thumbnail || null,
            duration_seconds: video.duration || null,
            published_at: video.publishedAt,
            content_type: video.contentType || "post",
            view_count: video.metrics.views,
            like_count: video.metrics.likes,
            comment_count: video.metrics.comments,
            share_count: video.metrics.shares,
            save_count: video.metrics.saves,
            avg_watch_time_seconds: video.metrics.avgWatchTime || null,
            engagement_rate:
              video.metrics.views > 0
                ? (video.metrics.likes +
                    video.metrics.comments +
                    video.metrics.shares) /
                  video.metrics.views
                : null,
          } as Record<string, unknown>,
          { onConflict: "platform_id,platform_video_id" }
        )
        .select("id")
        .single();

      if (upserted) {
        await supabase.from("video_metrics_history").insert({
          video_id: (upserted as Record<string, string>).id,
          view_count: video.metrics.views,
          like_count: video.metrics.likes,
          comment_count: video.metrics.comments,
          share_count: video.metrics.shares,
          save_count: video.metrics.saves,
          avg_watch_time_seconds: video.metrics.avgWatchTime || null,
          reach: video.metrics.reach || null,
          impressions: video.metrics.impressions || null,
        } as Record<string, unknown>);
      }

      syncedCount++;
    }

    await supabase
      .from("sync_log")
      .update({
        status: "success",
        completed_at: new Date().toISOString(),
        videos_synced_count: syncedCount,
      } as Record<string, unknown>)
      .eq("id", (syncLog as Record<string, string>)!.id);

    return { success: true, synced: syncedCount };
  } catch (error) {
    await supabase
      .from("sync_log")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        error_message: error instanceof Error ? error.message : "Unknown error",
      } as Record<string, unknown>)
      .eq("id", (syncLog as Record<string, string>)!.id);

    throw error;
  }
}

export async function syncAccountMetrics(
  platformName: "tiktok" | "instagram"
) {
  const supabase = createServiceClient();

  const { data: platform } = await supabase
    .from("platforms")
    .select("id")
    .eq("name", platformName)
    .single();

  if (!platform) {
    throw new Error(`Platform ${platformName} not found.`);
  }

  const dateTo = new Date().toISOString().split("T")[0];
  const dateFrom = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const metrics = await fetchAccountMetrics(platformName, dateFrom, dateTo);

  for (const day of metrics) {
    await supabase.from("account_metrics_daily").upsert(
      {
        platform_id: (platform as Record<string, string>).id,
        date: day.date,
        follower_count: day.followers,
        follower_delta: day.followersDelta,
        profile_views: day.profileViews || null,
        total_reach: day.reach || null,
        total_impressions: day.impressions || null,
        total_engagement: day.engagement || null,
      } as Record<string, unknown>,
      { onConflict: "platform_id,date" }
    );
  }

  return { success: true, days: metrics.length };
}
