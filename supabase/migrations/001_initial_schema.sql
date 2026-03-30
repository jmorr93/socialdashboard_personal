-- Social Media Analytics Dashboard Schema
-- Run this in your Supabase SQL editor

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- Platforms table
create table platforms (
  id uuid primary key default uuid_generate_v4(),
  name text not null check (name in ('tiktok', 'instagram')),
  connected_at timestamptz not null default now(),
  metricool_account_id text,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, name)
);

-- Content pillars
create table content_pillars (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  color text not null default '#6366f1',
  sort_order int not null default 0,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Videos
create table videos (
  id uuid primary key default uuid_generate_v4(),
  platform_id uuid not null references platforms(id) on delete cascade,
  platform_video_id text not null,
  title text,
  description text,
  thumbnail_url text,
  duration_seconds numeric,
  published_at timestamptz not null,
  content_type text not null default 'post',
  view_count int not null default 0,
  like_count int not null default 0,
  comment_count int not null default 0,
  share_count int not null default 0,
  save_count int not null default 0,
  avg_watch_time_seconds numeric,
  engagement_rate numeric,
  created_at timestamptz not null default now(),
  unique(platform_id, platform_video_id)
);

-- Video-pillar many-to-many tags
create table video_pillar_tags (
  video_id uuid not null references videos(id) on delete cascade,
  pillar_id uuid not null references content_pillars(id) on delete cascade,
  tagged_by text not null default 'manual' check (tagged_by in ('manual', 'ai')),
  confidence numeric,
  primary key (video_id, pillar_id)
);

-- Video metrics history (time-series snapshots)
create table video_metrics_history (
  id uuid primary key default uuid_generate_v4(),
  video_id uuid not null references videos(id) on delete cascade,
  captured_at timestamptz not null default now(),
  view_count int not null default 0,
  like_count int not null default 0,
  comment_count int not null default 0,
  share_count int not null default 0,
  save_count int not null default 0,
  avg_watch_time_seconds numeric,
  full_watch_rate numeric,
  reach int,
  impressions int
);

-- Account-level daily metrics
create table account_metrics_daily (
  id uuid primary key default uuid_generate_v4(),
  platform_id uuid not null references platforms(id) on delete cascade,
  date date not null,
  follower_count int not null default 0,
  follower_delta int not null default 0,
  profile_views int,
  total_reach int,
  total_impressions int,
  total_engagement int,
  unique(platform_id, date)
);

-- Sync log
create table sync_log (
  id uuid primary key default uuid_generate_v4(),
  platform_id uuid not null references platforms(id) on delete cascade,
  sync_type text not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null default 'in_progress' check (status in ('success', 'failed', 'in_progress')),
  error_message text,
  videos_synced_count int
);

-- Indexes for common queries
create index idx_videos_platform on videos(platform_id);
create index idx_videos_published on videos(published_at desc);
create index idx_videos_content_type on videos(content_type);
create index idx_video_metrics_history_video on video_metrics_history(video_id, captured_at desc);
create index idx_account_metrics_daily_platform on account_metrics_daily(platform_id, date desc);
create index idx_sync_log_platform on sync_log(platform_id, started_at desc);
create index idx_content_pillars_user on content_pillars(user_id);

-- Row Level Security
alter table platforms enable row level security;
alter table content_pillars enable row level security;
alter table videos enable row level security;
alter table video_pillar_tags enable row level security;
alter table video_metrics_history enable row level security;
alter table account_metrics_daily enable row level security;
alter table sync_log enable row level security;

-- RLS Policies: users can only access their own data
create policy "Users can manage their platforms"
  on platforms for all using (auth.uid() = user_id);

create policy "Users can manage their content pillars"
  on content_pillars for all using (auth.uid() = user_id);

create policy "Users can view their videos"
  on videos for all using (
    platform_id in (select id from platforms where user_id = auth.uid())
  );

create policy "Users can manage their video tags"
  on video_pillar_tags for all using (
    video_id in (
      select v.id from videos v
      join platforms p on v.platform_id = p.id
      where p.user_id = auth.uid()
    )
  );

create policy "Users can view their video metrics"
  on video_metrics_history for all using (
    video_id in (
      select v.id from videos v
      join platforms p on v.platform_id = p.id
      where p.user_id = auth.uid()
    )
  );

create policy "Users can view their account metrics"
  on account_metrics_daily for all using (
    platform_id in (select id from platforms where user_id = auth.uid())
  );

create policy "Users can view their sync logs"
  on sync_log for all using (
    platform_id in (select id from platforms where user_id = auth.uid())
  );
