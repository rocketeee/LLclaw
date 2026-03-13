/*
 * Dashboard - Control Console
 * Industrial Console Style: Multi-panel grid, status indicators, real-time data
 */
import DashboardLayout from "@/components/DashboardLayout";
import { motion } from "framer-motion";
import {
  Activity,
  Cpu,
  HardDrive,
  Clock,
  MessageSquare,
  Users,
  Wifi,
  WifiOff,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Terminal,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

function StatusBadge({ status }: { status: "online" | "warning" | "error" | "offline" }) {
  const colors = {
    online: "bg-[oklch(0.72_0.19_155)]",
    warning: "bg-[oklch(0.75_0.18_80)]",
    error: "bg-[oklch(0.63_0.24_25)]",
    offline: "bg-muted-foreground",
  };
  const labels = {
    online: "运行中",
    warning: "警告",
    error: "异常",
    offline: "离线",
  };
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${colors[status]} status-pulse`} />
      <span className="text-xs font-mono">{labels[status]}</span>
    </span>
  );
}

function MetricCard({ icon: Icon, label, value, change, changeType }: {
  icon: any;
  label: string;
  value: string;
  change?: string;
  changeType?: "up" | "down";
}) {
  return (
    <div className="panel">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="w-8 h-8 rounded flex items-center justify-center"
            style={{ background: "oklch(0.65 0.18 250 / 12%)" }}>
            <Icon className="w-4 h-4 text-primary" />
          </div>
          {change && (
            <span className={`flex items-center gap-0.5 text-xs font-mono ${
              changeType === "up" ? "text-[oklch(0.72_0.19_155)]" : "text-[oklch(0.63_0.24_25)]"
            }`}>
              {changeType === "up" ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {change}
            </span>
          )}
        </div>
        <div className="text-2xl font-bold font-mono tracking-tight">{value}</div>
        <div className="text-xs text-muted-foreground mt-1">{label}</div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [uptime, setUptime] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setUptime((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const [logs] = useState([
    { time: "08:24:31", level: "INFO", msg: "Gateway 启动完成，监听端口 18789" },
    { time: "08:24:32", level: "INFO", msg: "WebSocket 控制平面就绪" },
    { time: "08:24:33", level: "INFO", msg: "已加载 3 个消息通道: Telegram, WeChat, WebChat" },
    { time: "08:24:35", level: "INFO", msg: "模型连接测试: deepseek/deepseek-chat ✓" },
    { time: "08:24:36", level: "WARN", msg: "Ollama 本地服务未检测到，跳过本地模型加载" },
    { time: "08:25:01", level: "INFO", msg: "会话 #1024 已创建 (Telegram/user_001)" },
    { time: "08:25:03", level: "INFO", msg: "Agent 响应完成: 128 tokens, 1.2s" },
    { time: "08:25:15", level: "INFO", msg: "健康检查通过: CPU 12%, MEM 34%" },
  ]);

  const channels = [
    { name: "Telegram", status: "online" as const, sessions: 12 },
    { name: "WeChat", status: "online" as const, sessions: 8 },
    { name: "WebChat", status: "online" as const, sessions: 3 },
    { name: "Discord", status: "offline" as const, sessions: 0 },
    { name: "Slack", status: "offline" as const, sessions: 0 },
    { name: "飞书", status: "warning" as const, sessions: 1 },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">控制台</h1>
            <p className="text-sm text-muted-foreground mt-1">OpenClaw Gateway 运行状态总览</p>
          </div>
          <Button variant="outline" size="sm" className="gap-2 border-border">
            <RefreshCw className="w-3.5 h-3.5" />
            刷新
          </Button>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard icon={Clock} label="运行时间" value={formatUptime(uptime)} />
          <MetricCard icon={MessageSquare} label="今日会话" value="47" change="+12%" changeType="up" />
          <MetricCard icon={Cpu} label="Token 消耗" value="12.8K" change="+5.3%" changeType="up" />
          <MetricCard icon={Users} label="活跃通道" value="3/6" />
        </div>

        {/* Main Grid */}
        <div className="grid lg:grid-cols-3 gap-4">
          {/* Gateway Status */}
          <div className="lg:col-span-2 panel">
            <div className="panel-header">
              <Terminal className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">系统日志</span>
              <div className="ml-auto">
                <StatusBadge status="online" />
              </div>
            </div>
            <div className="p-4 max-h-80 overflow-y-auto">
              <div className="space-y-1">
                {logs.map((log, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex gap-3 py-1 font-mono text-xs"
                  >
                    <span className="text-muted-foreground shrink-0">{log.time}</span>
                    <span className={`shrink-0 w-10 ${
                      log.level === "WARN" ? "text-[oklch(0.75_0.18_80)]" :
                      log.level === "ERROR" ? "text-[oklch(0.63_0.24_25)]" :
                      "text-[oklch(0.72_0.19_155)]"
                    }`}>{log.level}</span>
                    <span className="text-foreground/80">{log.msg}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Channels */}
          <div className="panel">
            <div className="panel-header">
              <Wifi className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">消息通道</span>
            </div>
            <div className="p-4">
              <div className="space-y-3">
                {channels.map((ch) => (
                  <div key={ch.name} className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={ch.status} />
                      <span className="text-sm">{ch.name}</span>
                    </div>
                    <span className="text-xs font-mono text-muted-foreground">
                      {ch.sessions} 会话
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* System Info */}
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Gateway Config */}
          <div className="panel">
            <div className="panel-header">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Gateway 配置</span>
            </div>
            <div className="p-4">
              <div className="space-y-2 font-mono text-xs">
                {[
                  { key: "端口", value: "18789" },
                  { key: "绑定地址", value: "127.0.0.1" },
                  { key: "当前模型", value: "deepseek/deepseek-chat" },
                  { key: "沙箱模式", value: "non-main" },
                  { key: "日志级别", value: "verbose" },
                  { key: "配置路径", value: "~/.openclaw/openclaw.json" },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                    <span className="text-muted-foreground">{item.key}</span>
                    <span className="text-foreground">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Resource Usage */}
          <div className="panel">
            <div className="panel-header">
              <HardDrive className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">资源使用</span>
            </div>
            <div className="p-4 space-y-4">
              {[
                { label: "CPU", value: 12, color: "oklch(0.65 0.18 250)" },
                { label: "内存", value: 34, color: "oklch(0.72 0.19 155)" },
                { label: "磁盘", value: 28, color: "oklch(0.75 0.18 80)" },
                { label: "网络", value: 8, color: "oklch(0.65 0.15 300)" },
              ].map((res) => (
                <div key={res.label} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{res.label}</span>
                    <span className="text-xs font-mono">{res.value}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${res.value}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="h-full rounded-full"
                      style={{ background: res.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
