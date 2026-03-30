"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { VideoRow } from "@/lib/types/database";

interface CrossPostPair {
  title: string;
  tiktok: VideoRow | null;
  instagram: VideoRow | null;
}

export default function ComparePage() {
  const supabase = createClient();
  const [pairs, setPairs] = useState<CrossPostPair[]>([]);

  useEffect(() => {
    loadPairs();
  }, []);

  async function loadPairs() {
    const { data: platforms } = await supabase.from("platforms").select("*");
    const tiktok = platforms?.find((p) => p.name === "tiktok");
    const instagram = platforms?.find((p) => p.name === "instagram");
    if (!tiktok || !instagram) return;

    const [{ data: tiktokVideos }, { data: instagramVideos }] =
      await Promise.all([
        supabase
          .from("videos")
          .select("*")
          .eq("platform_id", tiktok.id)
          .order("published_at", { ascending: false }),
        supabase
          .from("videos")
          .select("*")
          .eq("platform_id", instagram.id)
          .order("published_at", { ascending: false }),
      ]);

    if (!tiktokVideos || !instagramVideos) return;

    // Match by similar titles or close publish dates
    const matched: CrossPostPair[] = [];
    const usedIG = new Set<string>();

    for (const tv of tiktokVideos) {
      const titleLower = (tv.title || "").toLowerCase().trim();
      if (!titleLower) continue;

      // Find matching IG video by similar title
      const match = instagramVideos.find((iv) => {
        if (usedIG.has(iv.id)) return false;
        const igTitle = (iv.title || "").toLowerCase().trim();
        if (!igTitle) return false;
        // Simple similarity: check if titles share >50% of words
        const tvWords = new Set(titleLower.split(/\s+/));
        const igWords = igTitle.split(/\s+/);
        const overlap = igWords.filter((w: string) => tvWords.has(w)).length;
        return overlap / Math.max(tvWords.size, igWords.length) > 0.5;
      });

      if (match) {
        usedIG.add(match.id);
        matched.push({
          title: tv.title || "Untitled",
          tiktok: tv as VideoRow,
          instagram: match as VideoRow,
        });
      }
    }

    setPairs(matched);
  }

  function formatNum(n: number): string {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return String(n);
  }

  function winnerClass(a: number, b: number): string {
    if (a > b) return "text-secondary font-bold";
    if (a < b) return "text-stone";
    return "";
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold">Cross-Platform Comparison</h2>
        <p className="text-stone text-sm mt-1">
          Compare how the same content performs on TikTok vs Instagram
        </p>
      </div>

      {pairs.length === 0 ? (
        <div className="bg-card-bg border border-card-border rounded-xl p-12 text-center">
          <p className="text-stone mb-2">No cross-posted content found</p>
          <p className="text-sm text-stone">
            Videos are matched by similar titles. Post the same content on both
            platforms to see comparisons here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {pairs.map((pair, i) => (
            <div
              key={i}
              className="bg-card-bg border border-card-border rounded-xl p-6"
            >
              <h3 className="font-semibold mb-4">{pair.title}</h3>
              <div className="grid grid-cols-[1fr_auto_1fr] gap-6 items-center">
                {/* TikTok */}
                <div className="text-center">
                  <p className="text-xs font-medium text-tiktok mb-3">
                    TikTok
                  </p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-stone">Views</p>
                      <p
                        className={winnerClass(
                          pair.tiktok!.view_count,
                          pair.instagram!.view_count
                        )}
                      >
                        {formatNum(pair.tiktok!.view_count)}
                      </p>
                    </div>
                    <div>
                      <p className="text-stone">Likes</p>
                      <p
                        className={winnerClass(
                          pair.tiktok!.like_count,
                          pair.instagram!.like_count
                        )}
                      >
                        {formatNum(pair.tiktok!.like_count)}
                      </p>
                    </div>
                    <div>
                      <p className="text-stone">Comments</p>
                      <p
                        className={winnerClass(
                          pair.tiktok!.comment_count,
                          pair.instagram!.comment_count
                        )}
                      >
                        {formatNum(pair.tiktok!.comment_count)}
                      </p>
                    </div>
                    <div>
                      <p className="text-stone">Shares</p>
                      <p
                        className={winnerClass(
                          pair.tiktok!.share_count,
                          pair.instagram!.share_count
                        )}
                      >
                        {formatNum(pair.tiktok!.share_count)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* VS divider */}
                <div className="text-2xl font-bold text-dusty-rose">vs</div>

                {/* Instagram */}
                <div className="text-center">
                  <p className="text-xs font-medium text-instagram mb-3">
                    Instagram
                  </p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-stone">Views</p>
                      <p
                        className={winnerClass(
                          pair.instagram!.view_count,
                          pair.tiktok!.view_count
                        )}
                      >
                        {formatNum(pair.instagram!.view_count)}
                      </p>
                    </div>
                    <div>
                      <p className="text-stone">Likes</p>
                      <p
                        className={winnerClass(
                          pair.instagram!.like_count,
                          pair.tiktok!.like_count
                        )}
                      >
                        {formatNum(pair.instagram!.like_count)}
                      </p>
                    </div>
                    <div>
                      <p className="text-stone">Comments</p>
                      <p
                        className={winnerClass(
                          pair.instagram!.comment_count,
                          pair.tiktok!.comment_count
                        )}
                      >
                        {formatNum(pair.instagram!.comment_count)}
                      </p>
                    </div>
                    <div>
                      <p className="text-stone">Shares</p>
                      <p
                        className={winnerClass(
                          pair.instagram!.share_count,
                          pair.tiktok!.share_count
                        )}
                      >
                        {formatNum(pair.instagram!.share_count)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
