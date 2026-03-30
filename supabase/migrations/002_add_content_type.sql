-- Add content_type column to videos to distinguish posts vs reels
alter table videos add column content_type text not null default 'post';

-- Index for filtering by content type
create index idx_videos_content_type on videos(content_type);
