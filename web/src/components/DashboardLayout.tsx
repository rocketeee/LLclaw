/*
 * DashboardLayout - Industrial Console Style
 * Design: Left fixed sidebar navigation + right content area
 * Colors: Deep navy (#0a0e17) sidebar, cold blue (#1e90ff) accents
 * Font: Space Grotesk for nav, JetBrains Mono for data
 */
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Cpu,
  Settings2,
  Download,
  Activity,
  FolderSync,
  ChevronLeft,
  ChevronRight,
  Terminal,
  Cog,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { path: "/dashboard", label: "控制台", icon: LayoutDashboard },
  { path: "/models", label: "模型配置", icon: Cpu },
  { path: "/monitoring", label: "系统监控", icon: Activity },
  { path: "/install", label: "安装部署", icon: Download },
  { path: "/portable", label: "配置迁移", icon: FolderSync },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full z-40 flex flex-col border-r border-border transition-all duration-300 ${
          collapsed ? "w-16" : "w-56"
        }`}
        style={{ background: "oklch(0.08 0.02 250)" }}
      >
        {/* Logo */}
        <div className="h-14 flex items-center px-4 border-b border-border gap-2">
          <div className="w-8 h-8 rounded flex items-center justify-center glow-blue shrink-0"
            style={{ background: "oklch(0.65 0.18 250 / 20%)" }}>
            <Terminal className="w-4 h-4 text-primary" />
          </div>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="font-bold text-sm tracking-wider text-primary"
            >
              LLclaw
            </motion.span>
          )}
        </div>

        {/* Nav Items */}
        <nav className="flex-1 py-3 px-2 space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.path;
            const Icon = item.icon;
            return (
              <Link key={item.path} href={item.path}>
                <div
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all duration-200 group ${
                    isActive
                      ? "bg-primary/15 text-primary glow-blue"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-primary" : ""}`} />
                  {!collapsed && (
                    <span className="font-medium truncate">{item.label}</span>
                  )}
                  {isActive && !collapsed && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary status-pulse" />
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Collapse Toggle */}
        <div className="p-2 border-t border-border">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center py-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Version */}
        {!collapsed && (
          <div className="px-4 pb-3">
            <div className="text-[10px] font-mono text-muted-foreground/50 tracking-wider">
              LLclaw v1.0.0
            </div>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main
        className={`flex-1 transition-all duration-300 ${
          collapsed ? "ml-16" : "ml-56"
        }`}
      >
        {/* Top Bar */}
        <header className="h-14 border-b border-border flex items-center justify-between px-6 sticky top-0 z-30 backdrop-blur-md"
          style={{ background: "oklch(0.12 0.02 250 / 80%)" }}>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-[oklch(0.72_0.19_155)] status-pulse" />
            <span className="text-xs font-mono text-muted-foreground tracking-wider uppercase">
              系统在线
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs font-mono text-muted-foreground">
              {new Date().toLocaleDateString('zh-CN')}
            </span>
            <Link href="/">
              <span className="text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer">
                返回首页
              </span>
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
