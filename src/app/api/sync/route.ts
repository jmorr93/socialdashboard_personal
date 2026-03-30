import { NextRequest, NextResponse } from "next/server";
import { syncVideos, syncAccountMetrics } from "@/lib/metricool/sync";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [tiktokVideos, instagramVideos, tiktokAccount, instagramAccount] =
      await Promise.allSettled([
        syncVideos("tiktok"),
        syncVideos("instagram"),
        syncAccountMetrics("tiktok"),
        syncAccountMetrics("instagram"),
      ]);

    return NextResponse.json({
      videos: {
        tiktok:
          tiktokVideos.status === "fulfilled"
            ? tiktokVideos.value
            : { error: tiktokVideos.reason?.message },
        instagram:
          instagramVideos.status === "fulfilled"
            ? instagramVideos.value
            : { error: instagramVideos.reason?.message },
      },
      account: {
        tiktok:
          tiktokAccount.status === "fulfilled"
            ? tiktokAccount.value
            : { error: tiktokAccount.reason?.message },
        instagram:
          instagramAccount.status === "fulfilled"
            ? instagramAccount.value
            : { error: instagramAccount.reason?.message },
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sync failed" },
      { status: 500 }
    );
  }
}
