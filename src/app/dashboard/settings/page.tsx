"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { RefreshCw, LogOut, CheckCircle, AlertCircle } from "lucide-react";
import type { SyncLogRow } from "@/lib/types/database";

export default function SettingsPage() {
  const supabase = createClient();
  const [metricoolKey, setMetricoolKey] = useState("");
  const [syncLogs, setSyncLogs] = useState<SyncLogRow[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) setUserEmail(user.email || "");

    const { data: logs } = await supabase
      .from("sync_log")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(10);

    if (logs) setSyncLogs(logs as SyncLogRow[]);
  }

  async function triggerSync() {
    setSyncing(true);
    try {
      const res = await fetch("/api/sync/videos", {
        headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || ""}` },
      });
      const data = await res.json();
      console.log("Sync result:", data);
      await loadData();
    } catch (err) {
      console.error("Sync failed:", err);
    } finally {
      setSyncing(false);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold">Settings</h2>
        <p className="text-stone text-sm mt-1">
          Manage your connections and sync configuration
        </p>
      </div>

      <div className="space-y-6 max-w-2xl">
        {/* Account */}
        <div className="bg-card-bg border border-card-border rounded-xl p-6">
          <h3 className="font-semibold mb-3">Account</h3>
          <p className="text-sm text-stone mb-4">
            Signed in as{" "}
            <span className="font-medium text-foreground">{userEmail}</span>
          </p>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 px-4 py-2 text-sm border border-card-border rounded-lg hover:bg-blush/20 transition-colors"
          >
            <LogOut size={14} />
            Sign Out
          </button>
        </div>

        {/* Metricool */}
        <div className="bg-card-bg border border-card-border rounded-xl p-6">
          <h3 className="font-semibold mb-3">Metricool API</h3>
          <p className="text-sm text-stone mb-4">
            Your API key is stored as an environment variable on Vercel. Update
            it in your Vercel project settings under Environment Variables.
          </p>
          <div className="flex gap-3">
            <button
              onClick={triggerSync}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-2 bg-sidebar-active text-paper rounded-lg text-sm font-medium hover:bg-sidebar-active/90 disabled:opacity-50 transition-colors"
            >
              <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
              {syncing ? "Syncing..." : "Manual Sync Now"}
            </button>
          </div>
        </div>

        {/* Sync Log */}
        <div className="bg-card-bg border border-card-border rounded-xl p-6">
          <h3 className="font-semibold mb-4">Recent Sync History</h3>
          {syncLogs.length === 0 ? (
            <p className="text-sm text-stone">No sync runs yet</p>
          ) : (
            <div className="space-y-2">
              {syncLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between py-2 border-b border-card-border last:border-0 text-sm"
                >
                  <div className="flex items-center gap-2">
                    {log.status === "success" ? (
                      <CheckCircle size={14} className="text-green-500" />
                    ) : log.status === "failed" ? (
                      <AlertCircle size={14} className="text-red-500" />
                    ) : (
                      <RefreshCw
                        size={14}
                        className="text-yellow-500 animate-spin"
                      />
                    )}
                    <span className="font-medium">{log.sync_type}</span>
                    {log.videos_synced_count !== null && (
                      <span className="text-stone">
                        ({log.videos_synced_count} videos)
                      </span>
                    )}
                  </div>
                  <div className="text-stone">
                    {new Date(log.started_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
