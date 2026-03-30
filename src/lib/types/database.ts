export type Platform = "tiktok" | "instagram";
export type TagSource = "manual" | "ai";
export type SyncStatus = "success" | "failed" | "in_progress";

export interface Database {
  public: {
    Tables: {
      platforms: {
        Row: {
          id: string;
          name: Platform;
          connected_at: string;
          metricool_account_id: string | null;
          created_at: string;
        };
        Insert: Omit<PlatformRow, "id" | "created_at">;
        Update: Partial<Omit<PlatformRow, "id">>;
      };
      content_pillars: {
        Row: ContentPillarRow;
        Insert: Omit<ContentPillarRow, "id" | "created_at">;
        Update: Partial<Omit<ContentPillarRow, "id">>;
      };
      videos: {
        Row: VideoRow;
        Insert: Omit<VideoRow, "id" | "created_at">;
        Update: Partial<Omit<VideoRow, "id">>;
      };
      video_pillar_tags: {
        Row: VideoPillarTagRow;
        Insert: VideoPillarTagRow;
        Update: Partial<VideoPillarTagRow>;
      };
      video_metrics_history: {
        Row: VideoMetricsHistoryRow;
        Insert: Omit<VideoMetricsHistoryRow, "id">;
        Update: Partial<Omit<VideoMetricsHistoryRow, "id">>;
      };
      account_metrics_daily: {
        Row: AccountMetricsDailyRow;
        Insert: Omit<AccountMetricsDailyRow, "id">;
        Update: Partial<Omit<AccountMetricsDailyRow, "id">>;
      };
      sync_log: {
        Row: SyncLogRow;
        Insert: Omit<SyncLogRow, "id">;
        Update: Partial<Omit<SyncLogRow, "id">>;
      };
    };
  };
}

export interface PlatformRow {
  id: string;
  name: Platform;
  connected_at: string;
  metricool_account_id: string | null;
  created_at: string;
}

export interface ContentPillarRow {
  id: string;
  name: string;
  description: string | null;
  color: string;
  sort_order: number;
  created_at: string;
  user_id: string;
}

export interface VideoRow {
  id: string;
  platform_id: string;
  platform_video_id: string;
  title: string | null;
  description: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  published_at: string;
  content_type: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  share_count: number;
  save_count: number;
  avg_watch_time_seconds: number | null;
  engagement_rate: number | null;
  created_at: string;
}

export interface VideoPillarTagRow {
  video_id: string;
  pillar_id: string;
  tagged_by: TagSource;
  confidence: number | null;
}

export interface VideoMetricsHistoryRow {
  id: string;
  video_id: string;
  captured_at: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  share_count: number;
  save_count: number;
  avg_watch_time_seconds: number | null;
  full_watch_rate: number | null;
  reach: number | null;
  impressions: number | null;
}

export interface AccountMetricsDailyRow {
  id: string;
  platform_id: string;
  date: string;
  follower_count: number;
  follower_delta: number;
  profile_views: number | null;
  total_reach: number | null;
  total_impressions: number | null;
  total_engagement: number | null;
}

export interface SyncLogRow {
  id: string;
  platform_id: string;
  sync_type: string;
  started_at: string;
  completed_at: string | null;
  status: SyncStatus;
  error_message: string | null;
  videos_synced_count: number | null;
}
