/*
 * Monitoring - System Monitoring Page
 * Industrial Console Style: Real-time charts, log viewer, performance metrics
 */
import DashboardLayout from "@/components/DashboardLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Activity, RefreshCw, Terminal, Wifi, Clock, Cpu,
  HardDrive, MemoryStick, ArrowUpRight, ArrowDownRight,
  Filter, Search, Pause, Play, Download,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area,
} from "recharts";

function generateTimeData(points: number) {
  const data = [];
  const now = Date.now();
  for (let i = points; i >= 0; i--) {
    const time = new Date(now - i * 5000);
    data.push({
      time: time.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      cpu: Math.max(5, Math.min(95, 15 + Math.random() * 20 + Math.sin(i * 0.3) * 10)),
      memory: Math.max(20, Math.min(80, 35 + Math.random() * 10 + Math.cos(i * 0.2) * 5)),
      network: Math.max(0, Math.min(100, Math.random() * 30 + Math.sin(i * 0.5) * 15)),
      tokens: Math.floor(Math.random() * 500 + 100),
    });
  }
  return data;
}

const logLevels = ["ALL", "INFO", "WARN", "ERROR"] as const;

function generateLogs() {
  const templates = [
    { level: "INFO", msgs: [
      "Gateway 健康检查通过",
      "WebSocket 连接: 活跃 3, 空闲 12",
      "会话 #{id} 响应完成: {tokens} tokens, {time}s",
      "模型请求: deepseek/deepseek-chat",
      "消息路由: Telegram → Agent #1",
      "上下文压缩完成: 4096 → 2048 tokens",
      "Skills 加载完成: 5 个技能可用",
      "Cron 任务执行: daily-summary",
    ]},
    { level: "WARN", msgs: [
      "模型响应延迟: 3.2s (阈值: 2s)",
      "内存使用率: 72% (阈值: 80%)",
      "Ollama 服务未响应，使用云端模型回退",
      "会话 #{id} 上下文接近限制: 90%",
      "API 速率限制: 剩余 15 次/分钟",
    ]},
    { level: "ERROR", msgs: [
      "Telegram 通道连接中断，正在重连...",
      "模型请求失败: 429 Too Many Requests",
      "WebSocket 异常断开: client_timeout",
    ]},
  ];

  const logs = [];
  const now = new Date();
  for (let i = 0; i < 50; i++) {
    const offset = i * (3000 + Math.random() * 7000);
    const time = new Date(now.getTime() - offset);
    const rand = Math.random();
    const levelGroup = rand < 0.75 ? templates[0] : rand < 0.92 ? templates[1] : templates[2];
    const msg = levelGroup.msgs[Math.floor(Math.random() * levelGroup.msgs.length)]
      .replace("{id}", String(Math.floor(Math.random() * 9000 + 1000)))
      .replace("{tokens}", String(Math.floor(Math.random() * 500 + 50)))
      .replace("{time}", (Math.random() * 3 + 0.3).toFixed(1));

    logs.push({
      time: time.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      level: levelGroup.level,
      msg,
    });
  }
  return logs.reverse();
}

export default function Monitoring() {
  const [chartData, setChartData] = useState(() => generateTimeData(30));
  const [logs, setLogs] = useState(() => generateLogs());
  const [logFilter, setLogFilter] = useState<typeof logLevels[number]>("ALL");
  const [logSearch, setLogSearch] = useState("");
  const [isPaused, setIsPaused] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setChartData((prev) => {
        const newPoint = {
          time: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
          cpu: Math.max(5, Math.min(95, (prev[prev.length - 1]?.cpu || 15) + (Math.random() - 0.5) * 8)),
          memory: Math.max(20, Math.min(80, (prev[prev.length - 1]?.memory || 35) + (Math.random() - 0.5) * 3)),
          network: Math.max(0, Math.min(100, Math.random() * 30)),
          tokens: Math.floor(Math.random() * 500 + 100),
        };
        return [...prev.slice(1), newPoint];
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [isPaused]);

  const filteredLogs = logs.filter((log) => {
    if (logFilter !== "ALL" && log.level !== logFilter) return false;
    if (logSearch && !log.msg.toLowerCase().includes(logSearch.toLowerCase())) return false;
    return true;
  });

  const latestCpu = chartData[chartData.length - 1]?.cpu?.toFixed(1) || "0";
  const latestMem = chartData[chartData.length - 1]?.memory?.toFixed(1) || "0";
  const latestNet = chartData[chartData.length - 1]?.network?.toFixed(1) || "0";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">系统监控</h1>
            <p className="text-sm text-muted-foreground mt-1">实时性能指标和日志追踪</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2 border-border" onClick={() => setIsPaused(!isPaused)}>
              {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              {isPaused ? "恢复" : "暂停"}
            </Button>
            <Button variant="outline" size="sm" className="gap-2 border-border" onClick={() => setChartData(generateTimeData(30))}>
              <RefreshCw className="w-3.5 h-3.5" />刷新
            </Button>
          </div>
        </div>

        {/* Quick Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Cpu, label: "CPU 使用率", value: `${latestCpu}%`, color: "oklch(0.65 0.18 250)" },
            { icon: MemoryStick, label: "内存使用率", value: `${latestMem}%`, color: "oklch(0.72 0.19 155)" },
            { icon: Activity, label: "网络流量", value: `${latestNet} KB/s`, color: "oklch(0.75 0.18 80)" },
            { icon: Clock, label: "平均响应", value: "1.2s", color: "oklch(0.65 0.15 300)" },
          ].map((m) => (
            <div key={m.label} className="panel">
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <m.icon className="w-4 h-4" style={{ color: m.color }} />
                  <span className="text-xs text-muted-foreground">{m.label}</span>
                </div>
                <div className="text-2xl font-bold font-mono">{m.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-4">
          {/* CPU & Memory Chart */}
          <div className="panel">
            <div className="panel-header">
              <Cpu className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">CPU / 内存</span>
              {!isPaused && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[oklch(0.72_0.19_155)] status-pulse" />}
            </div>
            <div className="p-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="oklch(0.65 0.18 250)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="oklch(0.65 0.18 250)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="oklch(0.72 0.19 155)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="oklch(0.72 0.19 155)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.03 250)" />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: "oklch(0.5 0.02 250)" }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10, fill: "oklch(0.5 0.02 250)" }} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ background: "oklch(0.15 0.025 250)", border: "1px solid oklch(0.25 0.03 250)", borderRadius: "6px", fontSize: "12px" }}
                    labelStyle={{ color: "oklch(0.6 0.02 250)" }}
                  />
                  <Area type="monotone" dataKey="cpu" stroke="oklch(0.65 0.18 250)" fill="url(#cpuGrad)" strokeWidth={2} name="CPU %" />
                  <Area type="monotone" dataKey="memory" stroke="oklch(0.72 0.19 155)" fill="url(#memGrad)" strokeWidth={2} name="内存 %" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Network Chart */}
          <div className="panel">
            <div className="panel-header">
              <Activity className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">网络 / Token 消耗</span>
              {!isPaused && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[oklch(0.72_0.19_155)] status-pulse" />}
            </div>
            <div className="p-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.03 250)" />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: "oklch(0.5 0.02 250)" }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10, fill: "oklch(0.5 0.02 250)" }} />
                  <Tooltip
                    contentStyle={{ background: "oklch(0.15 0.025 250)", border: "1px solid oklch(0.25 0.03 250)", borderRadius: "6px", fontSize: "12px" }}
                    labelStyle={{ color: "oklch(0.6 0.02 250)" }}
                  />
                  <Line type="monotone" dataKey="network" stroke="oklch(0.75 0.18 80)" strokeWidth={2} dot={false} name="网络 KB/s" />
                  <Line type="monotone" dataKey="tokens" stroke="oklch(0.65 0.15 300)" strokeWidth={2} dot={false} name="Tokens" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Log Viewer */}
        <div className="panel">
          <div className="panel-header">
            <Terminal className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">实时日志</span>
            <span className="text-xs font-mono text-muted-foreground ml-2">{filteredLogs.length} 条</span>
            <div className="ml-auto flex items-center gap-2">
              {/* Level Filter */}
              <div className="flex gap-0.5">
                {logLevels.map((level) => (
                  <button
                    key={level}
                    onClick={() => setLogFilter(level)}
                    className={`px-2 py-1 text-[10px] font-mono rounded transition-colors ${
                      logFilter === level ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
              {/* Search */}
              <div className="relative">
                <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  placeholder="搜索日志..."
                  className="h-7 w-40 pl-7 pr-2 rounded bg-input border border-border text-xs font-mono focus:border-primary focus:outline-none"
                />
              </div>
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto p-2">
            <div className="space-y-0.5">
              {filteredLogs.map((log, i) => (
                <div key={i} className="flex gap-3 py-1 px-2 rounded hover:bg-secondary/50 font-mono text-xs transition-colors">
                  <span className="text-muted-foreground shrink-0 w-16">{log.time}</span>
                  <span className={`shrink-0 w-12 font-semibold ${
                    log.level === "WARN" ? "text-[oklch(0.75_0.18_80)]" :
                    log.level === "ERROR" ? "text-[oklch(0.63_0.24_25)]" :
                    "text-[oklch(0.72_0.19_155)]"
                  }`}>{log.level}</span>
                  <span className="text-foreground/80">{log.msg}</span>
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
