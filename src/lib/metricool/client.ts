const METRICOOL_BASE_URL = "https://app.metricool.com/api/v2";

interface MetricoolRequestOptions {
  path: string;
  method?: "GET" | "POST";
  params?: Record<string, string>;
  body?: unknown;
}

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

async function metricoolFetch<T>({
  path,
  method = "GET",
  params,
  body,
}: MetricoolRequestOptions): Promise<T> {
  const userToken = getRequiredEnv("METRICOOL_USER_TOKEN");
  const userId = getRequiredEnv("METRICOOL_USER_ID");
  const blogId = getRequiredEnv("METRICOOL_BLOG_ID");

  const url = new URL(`${METRICOOL_BASE_URL}${path}`);
  url.searchParams.set("userId", userId);
  url.searchParams.set("blogId", blogId);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  const response = await fetch(url.toString(), {
    method,
    headers: {
      "X-Mc-Auth": userToken,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Metricool API error ${response.status}: ${text}`
    );
  }

  return response.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Date helpers — Metricool v2 uses ISO 8601 with timezone offsets
// ---------------------------------------------------------------------------

function toISORange(daysAgo: number, timezone = "America/Chicago") {
  const now = new Date();
  const from = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

  // Format as YYYY-MM-DDT00:00:00 / YYYY-MM-DDT23:59:59
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmtDate = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  // Approximate UTC offset for the timezone — Vercel cron runs in UTC,
  // but Metricool expects a timezone-aware range. We pass the IANA name
  // as the timezone param when the endpoint supports it, and use a
  // neutral offset here.
  return {
    from: `${fmtDate(from)}T00:00:00`,
    to: `${fmtDate(now)}T23:59:59`,
    timezone,
  };
}

// ---------------------------------------------------------------------------
// TikTok post shape (from /analytics/posts/tiktok)
// ---------------------------------------------------------------------------
export interface MetricoolTikTokPost {
  videoId: string;
  openId: string;
  type: string;
  createTime: string;
  coverImageUrl: string;
  shareUrl: string;
  videoDescription: string;
  title: string;
  duration: number;
  height: number;
  width: number;
  embedLink: string;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  viewCount: number;
  engagement: number;
  impressionSources: {
    forYou: number | null;
    follow: number | null;
    hashtag: number | null;
    sound: number | null;
    personalProfile: number | null;
    search: number | null;
  };
}

// ---------------------------------------------------------------------------
// Instagram post shape (from /analytics/posts/instagram)
// ---------------------------------------------------------------------------
export interface MetricoolInstagramPost {
  postId: string;
  userId: string;
  type: string;
  publishedAt: { dateTime: string; timezone: string };
  url: string;
  content: string;
  imageUrl: string;
  likes: number;
  comments: number;
  shares: number;
  interactions: number;
  engagement: number;
  reach: number;
  saved: number;
  impressionsTotal: number;
  views: number;
}

// ---------------------------------------------------------------------------
// Timeline shape (from /analytics/timelines)
// ---------------------------------------------------------------------------
export interface MetricoolTimelineEntry {
  dateTime: string;
  value: number;
}

interface MetricoolTimelineResponse {
  data: Array<{
    metric: string;
    values: MetricoolTimelineEntry[];
  }>;
}

// ---------------------------------------------------------------------------
// Normalised shapes our sync layer expects
// ---------------------------------------------------------------------------
export interface NormalisedVideo {
  id: string;
  platform: "tiktok" | "instagram";
  title: string | null;
  description: string | null;
  thumbnail: string | null;
  duration: number | null;
  publishedAt: string;
  contentType?: string; // e.g. "post", "reel", "video"
  metrics: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    avgWatchTime: number | null;
    reach: number | null;
    impressions: number | null;
    engagement: number | null;
  };
}

export interface NormalisedAccountMetric {
  platform: "tiktok" | "instagram";
  date: string;
  followers: number;
  followersDelta: number;
  profileViews: number | null;
  reach: number | null;
  impressions: number | null;
  engagement: number | null;
}

// ---------------------------------------------------------------------------
// Fetchers
// ---------------------------------------------------------------------------

/**
 * Fetch TikTok videos via /analytics/posts/tiktok.
 * `dateFrom` and `dateTo` are ISO date strings (YYYY-MM-DD).
 */
export async function fetchTikTokVideos(
  dateFrom: string,
  dateTo: string
): Promise<NormalisedVideo[]> {
  const res = await metricoolFetch<{ data: MetricoolTikTokPost[] }>({
    path: "/analytics/posts/tiktok",
    params: {
      from: `${dateFrom}T00:00:00`,
      to: `${dateTo}T23:59:59`,
    },
  });

  return (res.data || []).map((p) => ({
    id: p.videoId,
    platform: "tiktok" as const,
    title: p.title || p.videoDescription || null,
    description: p.videoDescription || p.title || null,
    thumbnail: p.coverImageUrl || null,
    duration: p.duration ?? null,
    publishedAt: p.createTime,
    contentType: "video",
    metrics: {
      views: p.viewCount ?? 0,
      likes: p.likeCount ?? 0,
      comments: p.commentCount ?? 0,
      shares: p.shareCount ?? 0,
      saves: 0, // TikTok API doesn't expose saves via Metricool
      avgWatchTime: null,
      reach: null,
      impressions: null,
      engagement: p.engagement ?? null,
    },
  }));
}

/**
 * Normalise a raw Metricool Instagram post/reel into our common shape.
 */
function normaliseInstagramPost(p: MetricoolInstagramPost): NormalisedVideo {
  return {
    id: p.postId,
    platform: "instagram" as const,
    title: p.content || null,
    description: p.content || null,
    thumbnail: p.imageUrl || null,
    duration: null,
    publishedAt: p.publishedAt?.dateTime || "",
    contentType: p.type || "post",
    metrics: {
      views: p.views ?? 0,
      likes: p.likes ?? 0,
      comments: p.comments ?? 0,
      shares: p.shares ?? 0,
      saves: p.saved ?? 0,
      avgWatchTime: null,
      reach: p.reach ?? null,
      impressions: p.impressionsTotal ?? null,
      engagement: p.engagement ?? null,
    },
  };
}

/**
 * Fetch Instagram posts (non-reel) via /analytics/posts/instagram.
 */
export async function fetchInstagramPosts(
  dateFrom: string,
  dateTo: string
): Promise<NormalisedVideo[]> {
  const res = await metricoolFetch<{ data: MetricoolInstagramPost[] }>({
    path: "/analytics/posts/instagram",
    params: {
      from: `${dateFrom}T00:00:00`,
      to: `${dateTo}T23:59:59`,
    },
  });

  return (res.data || []).map(normaliseInstagramPost);
}

/**
 * Fetch Instagram reels via /analytics/reels/instagram.
 * Falls back to empty array if the endpoint doesn't exist.
 */
export async function fetchInstagramReels(
  dateFrom: string,
  dateTo: string
): Promise<NormalisedVideo[]> {
  try {
    const res = await metricoolFetch<{ data: MetricoolInstagramPost[] }>({
      path: "/analytics/reels/instagram",
      params: {
        from: `${dateFrom}T00:00:00`,
        to: `${dateTo}T23:59:59`,
      },
    });

    return (res.data || []).map((p) =>
      normaliseInstagramPost({ ...p, type: p.type || "reel" })
    );
  } catch {
    // Endpoint may not exist — fall back gracefully
    console.warn("Metricool /analytics/reels/instagram not available, skipping reels fetch");
    return [];
  }
}

/**
 * Fetch all Instagram content (posts + reels) and deduplicate.
 */
export async function fetchAllInstagramContent(
  dateFrom: string,
  dateTo: string
): Promise<NormalisedVideo[]> {
  const [posts, reels] = await Promise.all([
    fetchInstagramPosts(dateFrom, dateTo),
    fetchInstagramReels(dateFrom, dateTo),
  ]);

  // Deduplicate by id in case the posts endpoint already includes reels
  const seen = new Set<string>();
  const all: NormalisedVideo[] = [];
  for (const v of [...posts, ...reels]) {
    if (!seen.has(v.id)) {
      seen.add(v.id);
      all.push(v);
    }
  }
  return all;
}

/**
 * Unified video fetcher — routes to the right endpoint per platform.
 */
export async function fetchVideos(
  platform: "tiktok" | "instagram",
  dateFrom: string,
  dateTo: string
): Promise<NormalisedVideo[]> {
  if (platform === "tiktok") {
    return fetchTikTokVideos(dateFrom, dateTo);
  }
  return fetchAllInstagramContent(dateFrom, dateTo);
}

/**
 * Fetch a timeline metric via /analytics/timelines.
 *
 * Available metrics vary by network — e.g. "followers", "videos",
 * "videoViews", "likes", "reach", "impressions", etc.
 */
export async function fetchTimeline(
  network: "tiktok" | "instagram",
  metric: string,
  dateFrom: string,
  dateTo: string,
  timezone = "America/Chicago",
  subject?: string
): Promise<MetricoolTimelineEntry[]> {
  const params: Record<string, string> = {
    from: `${dateFrom}T00:00:00`,
    to: `${dateTo}T23:59:59`,
    metric,
    network,
    timezone,
  };
  // Instagram requires a "subject" param (reels, posts, stories, account, etc.)
  if (subject) params.subject = subject;

  const res = await metricoolFetch<MetricoolTimelineResponse>({
    path: "/analytics/timelines",
    params,
  });

  const series = res.data?.[0];
  return series?.values || [];
}

/**
 * Fetch account-level metrics by combining multiple timeline calls.
 */
export async function fetchAccountMetrics(
  platform: "tiktok" | "instagram",
  dateFrom: string,
  dateTo: string
): Promise<NormalisedAccountMetric[]> {
  // TikTok valid metrics: videos, views, comments, shares, interactions, likes, reach, engagement, impressionSources, averageVideoViews
  // Instagram requires subject param: reels, posts, stories, competitors, account
  const subject = platform === "instagram" ? "account" : undefined;

  const [viewsRaw, reachRaw, engagementRaw] = await Promise.all([
    fetchTimeline(platform, "views", dateFrom, dateTo, "America/Chicago", subject),
    fetchTimeline(platform, "reach", dateFrom, dateTo, "America/Chicago", subject).catch(() => [] as MetricoolTimelineEntry[]),
    fetchTimeline(platform, "engagement", dateFrom, dateTo, "America/Chicago", subject).catch(() => [] as MetricoolTimelineEntry[]),
  ]);

  const reachMap = new Map(reachRaw.map((e) => [e.dateTime, e.value]));
  const engagementMap = new Map(engagementRaw.map((e) => [e.dateTime, e.value]));

  return viewsRaw.map((entry) => ({
    platform,
    date: entry.dateTime,
    followers: 0, // Follower count not available via timeline; will pull from simpleProfiles
    followersDelta: 0,
    profileViews: null,
    reach: reachMap.get(entry.dateTime) ?? null,
    impressions: entry.value, // views as impressions proxy
    engagement: engagementMap.get(entry.dateTime) ?? null,
  }));
}
