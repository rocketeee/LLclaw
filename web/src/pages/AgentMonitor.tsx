/*
 * AgentMonitor - Multi-Agent Collaboration Monitoring Dashboard
 * Industrial Console Style: Real-time task tracking, agent status, message flow, cost analysis
 * Features: Task timeline, agent status grid, message log, token/cost analytics
 */
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity, Users, Zap, Clock, MessageSquare, ArrowRight, ArrowDown,
  CheckCircle2, AlertCircle, Loader2, XCircle, Play, Pause, RotateCcw,
  ChevronDown, ChevronUp, Filter, Search, Download, Eye,
  Brain, Shield, Layers, Workflow, Bot, TrendingUp, DollarSign,
  BarChart3, Timer, Hash, Cpu, Network,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

// ===== Types =====
interface TaskStatus {
  id: string;
  name: string;
  status: "running" | "completed" | "failed" | "queued" | "reviewing";
  agent: string;
  agentType: string;
  startTime: string;
  duration: number;
  tokensIn: number;
  tokensOut: number;
  cost: number;
  progress: number;
}

interface AgentStatus {
  id: string;
  name: string;
  type: "coordinator" | "specialist" | "reviewer" | "synthesizer";
  model: string;
  status: "idle" | "busy" | "error" | "offline";
  currentTask: string | null;
  tasksCompleted: number;
  totalTokens: number;
  avgLatency: number;
  errorRate: number;
  color: string;
}

interface MessageLog {
  id: string;
  timestamp: string;
  from: string;
  to: string;
  type: "task_assign" | "result" | "review" | "error" | "system";
  content: string;
  tokens: number;
}

// ===== Mock Data Generators =====
function generateMockAgentStatuses(): AgentStatus[] {
  return [
    { id: "coord-1", name: "任务协调者", type: "coordinator", model: "deepseek-chat", status: "busy", currentTask: "分析用户需求", tasksCompleted: 47, totalTokens: 185420, avgLatency: 1.2, errorRate: 0.02, color: "oklch(0.65 0.18 250)" },
    { id: "coder-1", name: "代码专家", type: "specialist", model: "deepseek-chat", status: "busy", currentTask: "编写 API 接口", tasksCompleted: 32, totalTokens: 342100, avgLatency: 2.8, errorRate: 0.05, color: "oklch(0.72 0.19 155)" },
    { id: "writer-1", name: "写作专家", type: "specialist", model: "qwen-max", status: "idle", currentTask: null, tasksCompleted: 28, totalTokens: 256800, avgLatency: 1.8, errorRate: 0.01, color: "oklch(0.75 0.15 60)" },
    { id: "analyst-1", name: "数据分析师", type: "specialist", model: "qwen-max", status: "idle", currentTask: null, tasksCompleted: 15, totalTokens: 128900, avgLatency: 2.1, errorRate: 0.03, color: "oklch(0.65 0.2 300)" },
    { id: "reviewer-1", name: "质量审核", type: "reviewer", model: "glm-4-plus", status: "busy", currentTask: "审核代码输出", tasksCompleted: 41, totalTokens: 98700, avgLatency: 1.5, errorRate: 0.01, color: "oklch(0.7 0.18 30)" },
    { id: "synth-1", name: "结果综合者", type: "synthesizer", model: "deepseek-chat", status: "idle", currentTask: null, tasksCompleted: 22, totalTokens: 167300, avgLatency: 2.4, errorRate: 0.02, color: "oklch(0.6 0.15 200)" },
  ];
}

function generateMockTasks(): TaskStatus[] {
  return [
    { id: "task-1", name: "解析用户需求并拆分子任务", status: "completed", agent: "任务协调者", agentType: "coordinator", startTime: "14:32:05", duration: 3.2, tokensIn: 1250, tokensOut: 890, cost: 0.003, progress: 100 },
    { id: "task-2", name: "编写用户认证 API", status: "running", agent: "代码专家", agentType: "specialist", startTime: "14:32:08", duration: 12.5, tokensIn: 3200, tokensOut: 4500, cost: 0.012, progress: 68 },
    { id: "task-3", name: "编写 API 文档", status: "queued", agent: "写作专家", agentType: "specialist", startTime: "-", duration: 0, tokensIn: 0, tokensOut: 0, cost: 0, progress: 0 },
    { id: "task-4", name: "审核代码质量", status: "reviewing", agent: "质量审核", agentType: "reviewer", startTime: "14:32:15", duration: 5.1, tokensIn: 4500, tokensOut: 1200, cost: 0.008, progress: 45 },
    { id: "task-5", name: "数据库 Schema 设计", status: "completed", agent: "代码专家", agentType: "specialist", startTime: "14:30:12", duration: 8.7, tokensIn: 2100, tokensOut: 3800, cost: 0.009, progress: 100 },
    { id: "task-6", name: "整合所有输出结果", status: "queued", agent: "结果综合者", agentType: "synthesizer", startTime: "-", duration: 0, tokensIn: 0, tokensOut: 0, cost: 0, progress: 0 },
  ];
}

function generateMockMessages(): MessageLog[] {
  return [
    { id: "msg-1", timestamp: "14:32:05", from: "用户", to: "任务协调者", type: "task_assign", content: "请帮我开发一个用户管理系统的后端 API", tokens: 45 },
    { id: "msg-2", timestamp: "14:32:06", from: "任务协调者", to: "系统", type: "system", content: "任务已拆分为 4 个子任务：API 设计、数据库设计、代码实现、文档编写", tokens: 890 },
    { id: "msg-3", timestamp: "14:32:07", from: "任务协调者", to: "代码专家", type: "task_assign", content: "请设计用户管理系统的数据库 Schema，包含用户表、角色表、权限表", tokens: 120 },
    { id: "msg-4", timestamp: "14:32:08", from: "任务协调者", to: "代码专家", type: "task_assign", content: "请编写用户认证 API，包含注册、登录、Token 刷新接口", tokens: 150 },
    { id: "msg-5", timestamp: "14:32:15", from: "代码专家", to: "质量审核", type: "result", content: "数据库 Schema 设计完成，包含 users、roles、permissions 三张表及关联关系", tokens: 3800 },
    { id: "msg-6", timestamp: "14:32:16", from: "质量审核", to: "代码专家", type: "review", content: "Schema 整体合理，建议：1) users 表增加 deleted_at 软删除字段 2) 添加索引优化查询", tokens: 450 },
    { id: "msg-7", timestamp: "14:32:20", from: "代码专家", to: "任务协调者", type: "result", content: "已根据审核建议优化 Schema，新增软删除和索引", tokens: 280 },
    { id: "msg-8", timestamp: "14:32:25", from: "任务协调者", to: "写作专家", type: "task_assign", content: "请根据 API 实现编写接口文档，包含请求/响应示例", tokens: 200 },
  ];
}

// ===== Token consumption trend data =====
const tokenTrendData = Array.from({ length: 20 }, (_, i) => ({
  time: `${14}:${String(20 + i).padStart(2, "0")}`,
  input: Math.floor(Math.random() * 3000 + 500),
  output: Math.floor(Math.random() * 4000 + 800),
}));

const costByAgent = [
  { name: "代码专家", value: 0.021, color: "oklch(0.72 0.19 155)" },
  { name: "写作专家", value: 0.014, color: "oklch(0.75 0.15 60)" },
  { name: "任务协调者", value: 0.008, color: "oklch(0.65 0.18 250)" },
  { name: "质量审核", value: 0.006, color: "oklch(0.7 0.18 30)" },
  { name: "数据分析师", value: 0.005, color: "oklch(0.65 0.2 300)" },
  { name: "结果综合者", value: 0.004, color: "oklch(0.6 0.15 200)" },
];

const latencyData = Array.from({ length: 12 }, (_, i) => ({
  time: `${14}:${String(20 + i * 2).padStart(2, "0")}`,
  coordinator: +(Math.random() * 0.8 + 0.8).toFixed(2),
  specialist: +(Math.random() * 1.5 + 1.5).toFixed(2),
  reviewer: +(Math.random() * 0.6 + 1.0).toFixed(2),
}));

// ===== Status helpers =====
const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  running: { label: "执行中", color: "oklch(0.65 0.18 250)", icon: Loader2 },
  completed: { label: "已完成", color: "oklch(0.72 0.19 155)", icon: CheckCircle2 },
  failed: { label: "失败", color: "oklch(0.7 0.18 30)", icon: XCircle },
  queued: { label: "排队中", color: "oklch(0.6 0.01 250)", icon: Clock },
  reviewing: { label: "审核中", color: "oklch(0.75 0.15 60)", icon: Eye },
  idle: { label: "空闲", color: "oklch(0.6 0.01 250)", icon: Clock },
  busy: { label: "忙碌", color: "oklch(0.65 0.18 250)", icon: Loader2 },
  error: { label: "异常", color: "oklch(0.7 0.18 30)", icon: AlertCircle },
  offline: { label: "离线", color: "oklch(0.4 0.01 250)", icon: XCircle },
};

const msgTypeConfig: Record<string, { label: string; color: string }> = {
  task_assign: { label: "任务分配", color: "oklch(0.65 0.18 250)" },
  result: { label: "结果返回", color: "oklch(0.72 0.19 155)" },
  review: { label: "审核反馈", color: "oklch(0.75 0.15 60)" },
  error: { label: "错误", color: "oklch(0.7 0.18 30)" },
  system: { label: "系统", color: "oklch(0.6 0.01 250)" },
};

const typeIcons: Record<string, any> = {
  coordinator: Workflow,
  specialist: Brain,
  reviewer: Shield,
  synthesizer: Layers,
};

// ===== Components =====
function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: any; label: string; value: string; sub?: string; color: string;
}) {
  return (
    <div className="panel p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className="text-xl font-bold font-mono" style={{ color }}>{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

function AgentStatusCard({ agent }: { agent: AgentStatus }) {
  const status = statusConfig[agent.status];
  const StatusIcon = status.icon;
  const TypeIcon = typeIcons[agent.type] || Bot;

  return (
    <div className="panel p-3 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full" style={{ background: agent.color }} />
      <div className="pl-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <TypeIcon className="w-3.5 h-3.5" style={{ color: agent.color }} />
            <span className="text-xs font-semibold">{agent.name}</span>
          </div>
          <div className="flex items-center gap-1">
            <StatusIcon className={`w-3 h-3 ${agent.status === "busy" ? "animate-spin" : ""}`} style={{ color: status.color }} />
            <span className="text-[10px] font-mono" style={{ color: status.color }}>{status.label}</span>
          </div>
        </div>

        {agent.currentTask && (
          <div className="text-[10px] text-muted-foreground mb-2 truncate">
            当前: <span className="text-foreground">{agent.currentTask}</span>
          </div>
        )}

        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <div className="text-[10px] text-muted-foreground">任务</div>
            <div className="text-xs font-mono font-bold">{agent.tasksCompleted}</div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground">Token</div>
            <div className="text-xs font-mono font-bold">{(agent.totalTokens / 1000).toFixed(0)}k</div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground">延迟</div>
            <div className="text-xs font-mono font-bold">{agent.avgLatency}s</div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground">错误率</div>
            <div className="text-xs font-mono font-bold">{(agent.errorRate * 100).toFixed(1)}%</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TaskRow({ task }: { task: TaskStatus }) {
  const status = statusConfig[task.status];
  const StatusIcon = status.icon;

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/20 transition-colors border-b border-border/30 last:border-0">
      <StatusIcon
        className={`w-4 h-4 shrink-0 ${task.status === "running" ? "animate-spin" : ""}`}
        style={{ color: status.color }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium truncate">{task.name}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded font-mono shrink-0"
            style={{ background: `${status.color}15`, color: status.color }}>
            {status.label}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
          <span>Agent: <span className="text-foreground">{task.agent}</span></span>
          <span>开始: {task.startTime}</span>
          {task.duration > 0 && <span>耗时: {task.duration}s</span>}
        </div>
      </div>

      {task.progress > 0 && task.progress < 100 && (
        <div className="w-20 shrink-0">
          <div className="h-1.5 rounded-full bg-accent overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: status.color }}
              initial={{ width: 0 }}
              animate={{ width: `${task.progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <div className="text-[10px] text-muted-foreground text-right mt-0.5">{task.progress}%</div>
        </div>
      )}

      <div className="text-right shrink-0 w-20">
        <div className="text-[10px] font-mono text-muted-foreground">
          {task.tokensIn > 0 ? `${task.tokensIn}/${task.tokensOut}` : "-"}
        </div>
        {task.cost > 0 && (
          <div className="text-[10px] font-mono" style={{ color: "oklch(0.75 0.15 60)" }}>
            ¥{(task.cost * 7.2).toFixed(3)}
          </div>
        )}
      </div>
    </div>
  );
}

function MessageRow({ msg }: { msg: MessageLog }) {
  const typeInfo = msgTypeConfig[msg.type];
  return (
    <div className="flex items-start gap-3 p-2.5 hover:bg-accent/10 transition-colors">
      <span className="text-[10px] font-mono text-muted-foreground shrink-0 mt-0.5 w-12">{msg.timestamp}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-[10px] font-medium">{msg.from}</span>
          <ArrowRight className="w-2.5 h-2.5 text-muted-foreground" />
          <span className="text-[10px] font-medium">{msg.to}</span>
          <span className="text-[9px] px-1 py-0.5 rounded font-mono ml-1"
            style={{ background: `${typeInfo.color}15`, color: typeInfo.color }}>
            {typeInfo.label}
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed truncate">{msg.content}</p>
      </div>
      <span className="text-[10px] font-mono text-muted-foreground shrink-0">{msg.tokens}t</span>
    </div>
  );
}

// ===== Main Page =====
export default function AgentMonitor() {
  const [agentStatuses] = useState<AgentStatus[]>(generateMockAgentStatuses);
  const [tasks] = useState<TaskStatus[]>(generateMockTasks);
  const [messages] = useState<MessageLog[]>(generateMockMessages);
  const [activePanel, setActivePanel] = useState<"tasks" | "messages" | "analytics">("tasks");
  const [isRunning, setIsRunning] = useState(true);
  const [elapsed, setElapsed] = useState(42);
  const [msgFilter, setMsgFilter] = useState("all");

  useEffect(() => {
    if (!isRunning) return;
    const timer = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(timer);
  }, [isRunning]);

  const totalTokens = agentStatuses.reduce((sum, a) => sum + a.totalTokens, 0);
  const totalTasks = agentStatuses.reduce((sum, a) => sum + a.tasksCompleted, 0);
  const activeTasks = tasks.filter(t => t.status === "running" || t.status === "reviewing").length;
  const totalCost = costByAgent.reduce((sum, c) => sum + c.value, 0);

  const filteredMessages = msgFilter === "all" ? messages : messages.filter(m => m.type === msgFilter);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">协同监控</h1>
            <p className="text-sm text-muted-foreground mt-1">
              实时追踪多 Agent 任务流转、消息传递与资源消耗
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-accent/30 text-xs font-mono">
              <Timer className="w-3.5 h-3.5 text-primary" />
              <span className="text-muted-foreground">运行时间:</span>
              <span className="text-foreground">{Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}</span>
            </div>
            <Button
              size="sm"
              variant={isRunning ? "outline" : "default"}
              className="gap-1.5"
              onClick={() => { setIsRunning(!isRunning); }}
            >
              {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {isRunning ? "暂停" : "继续"}
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={Users} label="活跃 Agent" value={`${agentStatuses.filter(a => a.status === "busy").length}/${agentStatuses.length}`} sub="当前忙碌/总数" color="oklch(0.65 0.18 250)" />
          <StatCard icon={Activity} label="执行中任务" value={String(activeTasks)} sub={`总计 ${totalTasks} 个已完成`} color="oklch(0.72 0.19 155)" />
          <StatCard icon={Zap} label="Token 消耗" value={`${(totalTokens / 1000).toFixed(0)}k`} sub="输入 + 输出总计" color="oklch(0.75 0.15 60)" />
          <StatCard icon={DollarSign} label="预估成本" value={`¥${(totalCost * 7.2).toFixed(2)}`} sub={`$${totalCost.toFixed(3)} USD`} color="oklch(0.7 0.18 30)" />
        </div>

        {/* Agent Status Grid */}
        <div className="panel">
          <div className="panel-header">
            <Users className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Agent 状态</span>
            <span className="text-[10px] text-muted-foreground ml-2">实时运行状态</span>
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {agentStatuses.map((agent) => (
              <AgentStatusCard key={agent.id} agent={agent} />
            ))}
          </div>
        </div>

        {/* Panel Tabs */}
        <div className="flex gap-1 p-1 rounded-lg bg-accent/30 w-fit">
          {[
            { id: "tasks" as const, label: "任务追踪", icon: Activity },
            { id: "messages" as const, label: "消息日志", icon: MessageSquare },
            { id: "analytics" as const, label: "数据分析", icon: BarChart3 },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActivePanel(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  activePanel === tab.id
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tasks Panel */}
        {activePanel === "tasks" && (
          <div className="panel">
            <div className="panel-header">
              <Activity className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">任务执行队列</span>
              <span className="text-[10px] text-muted-foreground ml-2">{tasks.length} 个任务</span>
            </div>
            <div className="divide-y divide-border/30">
              {tasks.map((task) => (
                <TaskRow key={task.id} task={task} />
              ))}
            </div>
          </div>
        )}

        {/* Messages Panel */}
        {activePanel === "messages" && (
          <div className="panel">
            <div className="panel-header">
              <MessageSquare className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Agent 消息流</span>
              <div className="ml-auto flex gap-1">
                {[
                  { id: "all", label: "全部" },
                  { id: "task_assign", label: "分配" },
                  { id: "result", label: "结果" },
                  { id: "review", label: "审核" },
                  { id: "system", label: "系统" },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setMsgFilter(f.id)}
                    className={`px-2 py-0.5 rounded text-[10px] transition-all ${
                      msgFilter === f.id ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="max-h-96 overflow-y-auto divide-y divide-border/20">
              {filteredMessages.map((msg) => (
                <MessageRow key={msg.id} msg={msg} />
              ))}
            </div>
          </div>
        )}

        {/* Analytics Panel */}
        {activePanel === "analytics" && (
          <div className="space-y-4">
            {/* Token Trend */}
            <div className="panel">
              <div className="panel-header">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Token 消耗趋势</span>
              </div>
              <div className="p-4 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={tokenTrendData}>
                    <defs>
                      <linearGradient id="tokenIn" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="oklch(0.65 0.18 250)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="oklch(0.65 0.18 250)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="tokenOut" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="oklch(0.72 0.19 155)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="oklch(0.72 0.19 155)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="time" tick={{ fontSize: 10, fill: "oklch(0.5 0.01 250)" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "oklch(0.5 0.01 250)" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: "oklch(0.15 0.025 250)", border: "1px solid oklch(0.25 0.03 250)", borderRadius: 8, fontSize: 11 }}
                      labelStyle={{ color: "oklch(0.7 0.01 250)" }}
                    />
                    <Area type="monotone" dataKey="input" stroke="oklch(0.65 0.18 250)" fill="url(#tokenIn)" strokeWidth={2} name="输入 Token" />
                    <Area type="monotone" dataKey="output" stroke="oklch(0.72 0.19 155)" fill="url(#tokenOut)" strokeWidth={2} name="输出 Token" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Cost by Agent */}
              <div className="panel">
                <div className="panel-header">
                  <DollarSign className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Agent 成本分布</span>
                </div>
                <div className="p-4 h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={costByAgent} layout="vertical">
                      <XAxis type="number" tick={{ fontSize: 10, fill: "oklch(0.5 0.01 250)" }} axisLine={false} tickLine={false} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: "oklch(0.7 0.01 250)" }} axisLine={false} tickLine={false} width={80} />
                      <Tooltip
                        contentStyle={{ background: "oklch(0.15 0.025 250)", border: "1px solid oklch(0.25 0.03 250)", borderRadius: 8, fontSize: 11 }}
                        formatter={(value: number) => [`$${value.toFixed(3)}`, "成本"]}
                      />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {costByAgent.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Latency */}
              <div className="panel">
                <div className="panel-header">
                  <Timer className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">响应延迟趋势</span>
                </div>
                <div className="p-4 h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={latencyData}>
                      <XAxis dataKey="time" tick={{ fontSize: 10, fill: "oklch(0.5 0.01 250)" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "oklch(0.5 0.01 250)" }} axisLine={false} tickLine={false} unit="s" />
                      <Tooltip
                        contentStyle={{ background: "oklch(0.15 0.025 250)", border: "1px solid oklch(0.25 0.03 250)", borderRadius: 8, fontSize: 11 }}
                      />
                      <Area type="monotone" dataKey="coordinator" stroke="oklch(0.65 0.18 250)" fill="oklch(0.65 0.18 250 / 10%)" strokeWidth={1.5} name="协调者" />
                      <Area type="monotone" dataKey="specialist" stroke="oklch(0.72 0.19 155)" fill="oklch(0.72 0.19 155 / 10%)" strokeWidth={1.5} name="专家" />
                      <Area type="monotone" dataKey="reviewer" stroke="oklch(0.7 0.18 30)" fill="oklch(0.7 0.18 30 / 10%)" strokeWidth={1.5} name="审核者" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
