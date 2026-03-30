import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  delta?: number;
  icon: LucideIcon;
  platform?: "tiktok" | "instagram" | "combined";
}

export function StatCard({
  label,
  value,
  delta,
  icon: Icon,
  platform = "combined",
}: StatCardProps) {
  const platformColor =
    platform === "tiktok"
      ? "text-tiktok"
      : platform === "instagram"
        ? "text-instagram"
        : "text-primary";

  return (
    <div className="bg-card-bg border border-card-border rounded-xl p-5 flex items-start gap-4">
      <div
        className={`p-2.5 rounded-lg ${
          platform === "tiktok"
            ? "bg-tiktok/10"
            : platform === "instagram"
              ? "bg-instagram/10"
              : "bg-primary/10"
        }`}
      >
        <Icon size={20} className={platformColor} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-stone">{label}</p>
        <p className="text-2xl font-bold mt-0.5 text-ink">
          {typeof value === "number" ? value.toLocaleString() : value}
        </p>
        {delta !== undefined && (
          <p
            className={`text-xs mt-1 font-medium ${
              delta >= 0 ? "text-secondary" : "text-primary"
            }`}
          >
            {delta >= 0 ? "+" : ""}
            {delta.toLocaleString()} vs prev period
          </p>
        )}
      </div>
    </div>
  );
}
