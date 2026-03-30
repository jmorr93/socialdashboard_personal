"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Video,
  Layers,
  TrendingUp,
  Zap,
  Clock,
  GitCompare,
  Settings,
  Tags,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/videos", label: "Top Videos", icon: Video },
  { href: "/dashboard/pillars", label: "Content Pillars", icon: Tags },
  {
    href: "/dashboard/pillar-performance",
    label: "Pillar Performance",
    icon: Layers,
  },
  { href: "/dashboard/growth", label: "Growth & Trends", icon: TrendingUp },
  { href: "/dashboard/hooks", label: "Hook Scores", icon: Zap },
  { href: "/dashboard/timeline", label: "Video Timeline", icon: Clock },
  {
    href: "/dashboard/compare",
    label: "Cross-Platform",
    icon: GitCompare,
  },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-sidebar-bg text-sidebar-text min-h-screen flex flex-col shrink-0">
      <div className="p-6 border-b border-paper/10">
        <h1 className="text-xl font-bold text-paper tracking-tight">
          @deinfluence_her
        </h1>
        <p className="text-xs text-dusty-rose mt-1">Social Dashboard</p>
      </div>
      <nav className="flex-1 py-4">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-6 py-3 text-sm transition-colors ${
                isActive
                  ? "bg-sidebar-active/20 text-paper border-r-2 border-sidebar-active font-medium"
                  : "hover:bg-paper/5 hover:text-paper"
              }`}
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
