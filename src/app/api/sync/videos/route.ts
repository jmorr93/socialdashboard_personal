import { NextRequest, NextResponse } from "next/server";
import { syncVideos } from "@/lib/metricool/sync";

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [tiktokResult, instagramResult] = await Promise.allSettled([
      syncVideos("tiktok"),
      syncVideos("instagram"),
    ]);

    return NextResponse.json({
      tiktok:
        tiktokResult.status === "fulfilled"
          ? tiktokResult.value
          : { error: tiktokResult.reason?.message },
      instagram:
        instagramResult.status === "fulfilled"
          ? instagramResult.value
          : { error: instagramResult.reason?.message },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sync failed" },
      { status: 500 }
    );
  }
}
