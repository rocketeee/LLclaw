/*
 * AgentOrchestration - Multi-Agent Configuration & Orchestration
 * Industrial Console Style: Node-based workflow editor, agent cards, scene templates
 * Features: Agent role management, orchestration patterns, scene templates, workflow builder
 */
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Plus, Settings2, Play, Pause, Trash2, Copy, Save,
  ChevronDown, ChevronUp, Zap, Brain, Shield, Eye, Pencil,
  GitBranch, ArrowRight, ArrowDown, Shuffle, Layers, Network,
  MessageSquare, Code, FileText, BarChart3, Globe, Headphones,
  BookOpen, Search, Lightbulb, CheckCircle2, AlertCircle, X,
  GripVertical, MoreHorizontal, Cpu, Bot, Workflow,
} from "lucide-react";
import { useState, useCallback } from "react";
import { toast } from "sonner";

// ===== Types =====
interface AgentRole {
  id: string;
  name: string;
  type: "coordinator" | "specialist" | "reviewer" | "synthesizer";
  model: string;
  systemPrompt: string;
  description: string;
  skills: string[];
  maxTokens: number;
  temperature: number;
  color: string;
  enabled: boolean;
}

interface OrchestrationPattern {
  id: string;
  name: string;
  type: "sequential" | "parallel" | "router" | "hierarchical" | "debate" | "mapreduce";
  icon: any;
  description: string;
  color: string;
}

interface SceneTemplate {
  id: string;
  name: string;
  icon: any;
  description: string;
  agents: { role: string; model: string; desc: string }[];
  pattern: string;
  category: string;
}

// ===== Data =====
const orchestrationPatterns: OrchestrationPattern[] = [
  { id: "sequential", name: "顺序链", type: "sequential", icon: ArrowRight, description: "A → B → C，任务按顺序流转，适合流水线式处理", color: "oklch(0.65 0.18 250)" },
  { id: "parallel", name: "并行扇出", type: "parallel", icon: GitBranch, description: "A → [B, C, D] → E，子任务并行执行后汇总", color: "oklch(0.72 0.19 155)" },
  { id: "router", name: "路由分发", type: "router", icon: Shuffle, description: "根据任务类型智能路由到对应专家 Agent", color: "oklch(0.75 0.15 60)" },
  { id: "hierarchical", name: "层级管理", type: "hierarchical", icon: Layers, description: "主 Agent 管理和协调多个子 Agent 协同工作", color: "oklch(0.65 0.2 300)" },
  { id: "debate", name: "辩论共识", type: "debate", icon: MessageSquare, description: "多个 Agent 对同一问题辩论，综合最优方案", color: "oklch(0.7 0.18 30)" },
  { id: "mapreduce", name: "MapReduce", type: "mapreduce", icon: Network, description: "大任务拆分 → 并行处理 → 结果汇总归约", color: "oklch(0.6 0.15 200)" },
];

const sceneTemplates: SceneTemplate[] = [
  {
    id: "code-dev",
    name: "代码开发",
    icon: Code,
    description: "多角色协同完成软件开发全流程",
    category: "开发",
    pattern: "hierarchical",
    agents: [
      { role: "架构师", model: "deepseek-chat", desc: "系统设计与技术选型" },
      { role: "前端开发", model: "qwen-max", desc: "UI 组件与交互实现" },
      { role: "后端开发", model: "deepseek-chat", desc: "API 与业务逻辑" },
      { role: "代码审查", model: "glm-4-plus", desc: "代码质量与安全审查" },
      { role: "测试工程师", model: "moonshot-v1-128k", desc: "测试用例与自动化测试" },
    ],
  },
  {
    id: "content-creation",
    name: "内容创作",
    icon: FileText,
    description: "从调研到成稿的完整内容生产线",
    category: "创作",
    pattern: "sequential",
    agents: [
      { role: "调研员", model: "moonshot-v1-128k", desc: "资料收集与信息整理" },
      { role: "写作者", model: "qwen-max", desc: "内容撰写与润色" },
      { role: "编辑", model: "glm-4-plus", desc: "结构优化与文字校对" },
      { role: "事实核查", model: "deepseek-chat", desc: "信息准确性验证" },
    ],
  },
  {
    id: "data-analysis",
    name: "数据分析",
    icon: BarChart3,
    description: "数据采集、分析、可视化全链路",
    category: "分析",
    pattern: "sequential",
    agents: [
      { role: "数据采集", model: "deepseek-chat", desc: "数据源对接与清洗" },
      { role: "分析师", model: "qwen-max", desc: "统计分析与建模" },
      { role: "可视化", model: "glm-4-plus", desc: "图表生成与报告排版" },
      { role: "报告撰写", model: "moonshot-v1-128k", desc: "洞察总结与建议" },
    ],
  },
  {
    id: "customer-service",
    name: "智能客服",
    icon: Headphones,
    description: "多层级客服路由与专家协同",
    category: "服务",
    pattern: "router",
    agents: [
      { role: "路由分发", model: "deepseek-chat", desc: "意图识别与分流" },
      { role: "FAQ 专员", model: "qwen-max", desc: "常见问题快速响应" },
      { role: "技术支持", model: "deepseek-chat", desc: "技术问题深度解答" },
      { role: "质量审核", model: "glm-4-plus", desc: "回复质量与合规检查" },
    ],
  },
  {
    id: "translation",
    name: "翻译校对",
    icon: Globe,
    description: "多语言翻译与本地化协同",
    category: "翻译",
    pattern: "sequential",
    agents: [
      { role: "翻译", model: "qwen-max", desc: "源语言到目标语言翻译" },
      { role: "校对", model: "glm-4-plus", desc: "语法与表达校正" },
      { role: "本地化", model: "deepseek-chat", desc: "文化适配与术语统一" },
    ],
  },
  {
    id: "doc-generation",
    name: "文档生成",
    icon: BookOpen,
    description: "大型文档的并行生成与整合",
    category: "创作",
    pattern: "mapreduce",
    agents: [
      { role: "大纲规划", model: "deepseek-chat", desc: "文档结构与章节规划" },
      { role: "章节撰写 x N", model: "qwen-max", desc: "各章节并行撰写" },
      { role: "编辑整合", model: "glm-4-plus", desc: "风格统一与内容衔接" },
      { role: "排版格式", model: "moonshot-v1-128k", desc: "最终排版与格式化" },
    ],
  },
  {
    id: "decision-support",
    name: "决策支持",
    icon: Lightbulb,
    description: "多视角分析辅助决策",
    category: "分析",
    pattern: "debate",
    agents: [
      { role: "调研员", model: "moonshot-v1-128k", desc: "背景信息与数据收集" },
      { role: "分析师", model: "deepseek-chat", desc: "定量分析与趋势预测" },
      { role: "风险评估", model: "glm-4-plus", desc: "风险识别与影响评估" },
      { role: "决策顾问", model: "qwen-max", desc: "综合建议与方案推荐" },
    ],
  },
];

const defaultAgents: AgentRole[] = [
  {
    id: "coordinator-1",
    name: "任务协调者",
    type: "coordinator",
    model: "deepseek-chat",
    systemPrompt: "你是一个任务协调者，负责分析用户需求，将复杂任务拆解为子任务，并分配给合适的专家Agent执行。你需要监控任务进度，处理异常情况，确保最终输出质量。",
    description: "接收用户任务，智能分解并分配给专家 Agent",
    skills: ["任务分解", "意图识别", "进度管理", "异常处理"],
    maxTokens: 4096,
    temperature: 0.3,
    color: "oklch(0.65 0.18 250)",
    enabled: true,
  },
  {
    id: "coder-1",
    name: "代码专家",
    type: "specialist",
    model: "deepseek-chat",
    systemPrompt: "你是一个资深软件工程师，精通多种编程语言和框架。你负责代码编写、调试、优化和重构。输出代码应遵循最佳实践，包含必要的注释和错误处理。",
    description: "代码编写、调试、优化和技术方案设计",
    skills: ["Python", "JavaScript", "系统设计", "代码优化"],
    maxTokens: 8192,
    temperature: 0.2,
    color: "oklch(0.72 0.19 155)",
    enabled: true,
  },
  {
    id: "writer-1",
    name: "写作专家",
    type: "specialist",
    model: "qwen-max",
    systemPrompt: "你是一个专业写作者，擅长各类文体的内容创作。你的文字准确、流畅、有深度，能根据不同场景调整写作风格。",
    description: "内容撰写、文案创作、报告编写",
    skills: ["技术写作", "文案创作", "报告撰写", "内容优化"],
    maxTokens: 8192,
    temperature: 0.7,
    color: "oklch(0.75 0.15 60)",
    enabled: true,
  },
  {
    id: "analyst-1",
    name: "数据分析师",
    type: "specialist",
    model: "qwen-max",
    systemPrompt: "你是一个数据分析专家，擅长从数据中发现洞察，进行统计分析、趋势预测和可视化建议。你的分析严谨、客观、有数据支撑。",
    description: "数据分析、统计建模、趋势预测",
    skills: ["统计分析", "数据可视化", "趋势预测", "报告生成"],
    maxTokens: 4096,
    temperature: 0.3,
    color: "oklch(0.65 0.2 300)",
    enabled: true,
  },
  {
    id: "reviewer-1",
    name: "质量审核",
    type: "reviewer",
    model: "glm-4-plus",
    systemPrompt: "你是一个严格的质量审核者，负责检查其他Agent的输出质量。你需要验证事实准确性、逻辑一致性、格式规范性，并给出改进建议。",
    description: "输出质量审核、事实核查、改进建议",
    skills: ["质量审核", "事实核查", "逻辑验证", "改进建议"],
    maxTokens: 4096,
    temperature: 0.2,
    color: "oklch(0.7 0.18 30)",
    enabled: true,
  },
  {
    id: "synthesizer-1",
    name: "结果综合者",
    type: "synthesizer",
    model: "deepseek-chat",
    systemPrompt: "你是一个结果综合者，负责将多个Agent的输出整合为统一、连贯、高质量的最终结果。你需要消除矛盾、补充遗漏、优化表达。",
    description: "汇总多个 Agent 输出，生成最终结果",
    skills: ["信息整合", "矛盾消解", "结果优化", "格式统一"],
    maxTokens: 8192,
    temperature: 0.4,
    color: "oklch(0.6 0.15 200)",
    enabled: true,
  },
];

const typeLabels: Record<string, { label: string; icon: any }> = {
  coordinator: { label: "协调者", icon: Workflow },
  specialist: { label: "专家", icon: Brain },
  reviewer: { label: "审核者", icon: Shield },
  synthesizer: { label: "综合者", icon: Layers },
};

const modelOptions = [
  { value: "deepseek-chat", label: "DeepSeek Chat", provider: "深度求索" },
  { value: "qwen-max", label: "通义千问 Max", provider: "阿里云" },
  { value: "glm-4-plus", label: "GLM-4 Plus", provider: "智谱 AI" },
  { value: "moonshot-v1-128k", label: "Moonshot 128K", provider: "月之暗面" },
  { value: "ernie-4.0", label: "文心一言 4.0", provider: "百度" },
  { value: "hunyuan-pro", label: "腾讯混元 Pro", provider: "腾讯" },
  { value: "spark-max", label: "讯飞星火 Max", provider: "科大讯飞" },
  { value: "doubao-pro-256k", label: "豆包 Pro 256K", provider: "字节跳动" },
  { value: "gpt-4o", label: "GPT-4o", provider: "OpenAI" },
  { value: "claude-sonnet", label: "Claude Sonnet", provider: "Anthropic" },
  { value: "ollama/qwen2.5", label: "Qwen2.5 (本地)", provider: "Ollama" },
  { value: "ollama/llama3.1", label: "Llama 3.1 (本地)", provider: "Ollama" },
];

// ===== Components =====

function AgentCard({ agent, onEdit, onToggle, onDelete }: {
  agent: AgentRole;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const typeInfo = typeLabels[agent.type];
  const TypeIcon = typeInfo.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`panel relative overflow-hidden ${!agent.enabled ? "opacity-50" : ""}`}
    >
      <div className="absolute top-0 left-0 w-1 h-full" style={{ background: agent.color }} />
      <div className="p-4 pl-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: `${agent.color}20` }}>
              <TypeIcon className="w-4.5 h-4.5" style={{ color: agent.color }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{agent.name}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded font-mono"
                  style={{ background: `${agent.color}15`, color: agent.color }}>
                  {typeInfo.label}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">{agent.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={onToggle}
              className="p-1.5 rounded hover:bg-accent transition-colors"
              title={agent.enabled ? "禁用" : "启用"}>
              {agent.enabled ?
                <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "oklch(0.72 0.19 155)" }} /> :
                <AlertCircle className="w-3.5 h-3.5 text-muted-foreground" />
              }
            </button>
            <button onClick={onEdit} className="p-1.5 rounded hover:bg-accent transition-colors">
              <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            <button onClick={onDelete} className="p-1.5 rounded hover:bg-accent transition-colors">
              <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center gap-1.5 text-[11px]">
            <Cpu className="w-3 h-3 text-muted-foreground" />
            <span className="text-muted-foreground">模型:</span>
            <span className="font-mono text-foreground">{agent.model}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px]">
            <Zap className="w-3 h-3 text-muted-foreground" />
            <span className="text-muted-foreground">温度:</span>
            <span className="font-mono text-foreground">{agent.temperature}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {agent.skills.map((skill) => (
            <span key={skill} className="text-[10px] px-2 py-0.5 rounded-full border border-border/50 text-muted-foreground">
              {skill}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function PatternCard({ pattern, isSelected, onSelect }: {
  pattern: OrchestrationPattern;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const Icon = pattern.icon;
  return (
    <button
      onClick={onSelect}
      className={`p-3 rounded-lg border text-left transition-all duration-200 ${
        isSelected
          ? "border-primary/50 bg-primary/5 glow-blue"
          : "border-border/50 bg-card/30 hover:border-border"
      }`}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className="w-4 h-4" style={{ color: pattern.color }} />
        <span className="text-xs font-semibold">{pattern.name}</span>
      </div>
      <p className="text-[10px] text-muted-foreground leading-relaxed">{pattern.description}</p>
    </button>
  );
}

function SceneCard({ scene, onApply }: { scene: SceneTemplate; onApply: () => void }) {
  const Icon = scene.icon;
  const patternInfo = orchestrationPatterns.find(p => p.id === scene.pattern);
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div layout className="panel overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: "oklch(0.65 0.18 250 / 12%)" }}>
              <Icon className="w-4.5 h-4.5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{scene.name}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent text-muted-foreground">
                  {scene.category}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">{scene.description}</p>
            </div>
          </div>
          <Button size="sm" variant="outline" className="gap-1.5 text-xs h-7" onClick={onApply}>
            <Play className="w-3 h-3" />应用
          </Button>
        </div>

        {patternInfo && (
          <div className="flex items-center gap-1.5 mb-3 text-[11px]">
            <patternInfo.icon className="w-3 h-3" style={{ color: patternInfo.color }} />
            <span className="text-muted-foreground">编排模式:</span>
            <span style={{ color: patternInfo.color }}>{patternInfo.name}</span>
          </div>
        )}

        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <Users className="w-3 h-3" />
          <span>{scene.agents.length} 个 Agent</span>
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-3 space-y-2">
                {scene.agents.map((agent, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded bg-accent/30">
                    <div className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold shrink-0"
                      style={{ background: "oklch(0.65 0.18 250 / 20%)", color: "oklch(0.65 0.18 250)" }}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium">{agent.role}</span>
                        <span className="text-[10px] font-mono text-primary">{agent.model}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate">{agent.desc}</p>
                    </div>
                    {i < scene.agents.length - 1 && (
                      <ArrowDown className="w-3 h-3 text-muted-foreground shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function AgentEditModal({ agent, onSave, onClose }: {
  agent: AgentRole;
  onSave: (agent: AgentRole) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<AgentRole>({ ...agent });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="panel w-full max-w-lg max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="panel-header">
          <Pencil className="w-3.5 h-3.5 text-primary" />
          <span className="text-sm font-medium">编辑 Agent</span>
          <button onClick={onClose} className="ml-auto p-1 rounded hover:bg-accent">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Name */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">名称</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 rounded-md bg-accent/50 border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Type */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">角色类型</label>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(typeLabels).map(([key, info]) => {
                const Icon = info.icon;
                return (
                  <button
                    key={key}
                    onClick={() => setForm({ ...form, type: key as AgentRole["type"] })}
                    className={`p-2 rounded-md border text-center transition-all ${
                      form.type === key ? "border-primary bg-primary/10" : "border-border/50 hover:border-border"
                    }`}
                  >
                    <Icon className={`w-4 h-4 mx-auto mb-1 ${form.type === key ? "text-primary" : "text-muted-foreground"}`} />
                    <span className="text-[10px]">{info.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Model */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">模型</label>
            <select
              value={form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
              className="w-full px-3 py-2 rounded-md bg-accent/50 border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {modelOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} ({opt.provider})
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">描述</label>
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 rounded-md bg-accent/50 border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* System Prompt */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">系统提示词</label>
            <textarea
              value={form.systemPrompt}
              onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 rounded-md bg-accent/50 border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none font-mono text-xs"
            />
          </div>

          {/* Temperature & MaxTokens */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                温度 <span className="font-mono text-primary">{form.temperature}</span>
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={form.temperature}
                onChange={(e) => setForm({ ...form, temperature: parseFloat(e.target.value) })}
                className="w-full accent-primary"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">最大 Token</label>
              <input
                type="number"
                value={form.maxTokens}
                onChange={(e) => setForm({ ...form, maxTokens: parseInt(e.target.value) || 4096 })}
                className="w-full px-3 py-2 rounded-md bg-accent/50 border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary font-mono"
              />
            </div>
          </div>

          {/* Skills */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">技能标签（逗号分隔）</label>
            <input
              value={form.skills.join(", ")}
              onChange={(e) => setForm({ ...form, skills: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
              className="w-full px-3 py-2 rounded-md bg-accent/50 border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button size="sm" className="flex-1 gap-1.5" onClick={() => { onSave(form); toast.success("Agent 配置已保存"); }}>
              <Save className="w-3.5 h-3.5" />保存
            </Button>
            <Button size="sm" variant="outline" onClick={onClose}>取消</Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ===== Workflow Visualization =====
function WorkflowPreview({ agents, pattern }: { agents: AgentRole[]; pattern: string }) {
  const enabledAgents = agents.filter(a => a.enabled);
  const patternInfo = orchestrationPatterns.find(p => p.id === pattern);

  if (enabledAgents.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground text-sm">
        请启用至少一个 Agent 以预览工作流
      </div>
    );
  }

  const coordinators = enabledAgents.filter(a => a.type === "coordinator");
  const specialists = enabledAgents.filter(a => a.type === "specialist");
  const reviewers = enabledAgents.filter(a => a.type === "reviewer");
  const synthesizers = enabledAgents.filter(a => a.type === "synthesizer");

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-4">
        {patternInfo && <patternInfo.icon className="w-4 h-4" style={{ color: patternInfo.color }} />}
        <span className="text-xs font-medium">当前编排: {patternInfo?.name || "自定义"}</span>
        <span className="text-[10px] text-muted-foreground">({enabledAgents.length} 个活跃 Agent)</span>
      </div>

      <div className="flex flex-col items-center gap-2">
        {/* User Input */}
        <div className="px-4 py-2 rounded-lg border border-primary/30 bg-primary/5 text-xs font-medium text-primary">
          用户任务输入
        </div>
        <ArrowDown className="w-4 h-4 text-muted-foreground" />

        {/* Coordinators */}
        {coordinators.length > 0 && (
          <>
            <div className="flex gap-2 flex-wrap justify-center">
              {coordinators.map(a => (
                <div key={a.id} className="px-3 py-1.5 rounded-md text-[11px] font-medium border"
                  style={{ borderColor: `${a.color}50`, background: `${a.color}10`, color: a.color }}>
                  {a.name}
                </div>
              ))}
            </div>
            <ArrowDown className="w-4 h-4 text-muted-foreground" />
          </>
        )}

        {/* Specialists */}
        {specialists.length > 0 && (
          <>
            {pattern === "parallel" || pattern === "mapreduce" ? (
              <div className="flex items-center gap-1">
                <div className="text-[10px] text-muted-foreground mr-1">并行</div>
                <div className="flex gap-2 flex-wrap justify-center p-3 rounded-lg border border-dashed border-border/50">
                  {specialists.map(a => (
                    <div key={a.id} className="px-3 py-1.5 rounded-md text-[11px] font-medium border"
                      style={{ borderColor: `${a.color}50`, background: `${a.color}10`, color: a.color }}>
                      {a.name}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex gap-2 flex-wrap justify-center">
                {specialists.map((a, i) => (
                  <div key={a.id} className="flex items-center gap-1">
                    <div className="px-3 py-1.5 rounded-md text-[11px] font-medium border"
                      style={{ borderColor: `${a.color}50`, background: `${a.color}10`, color: a.color }}>
                      {a.name}
                    </div>
                    {i < specialists.length - 1 && pattern === "sequential" && (
                      <ArrowRight className="w-3 h-3 text-muted-foreground" />
                    )}
                  </div>
                ))}
              </div>
            )}
            <ArrowDown className="w-4 h-4 text-muted-foreground" />
          </>
        )}

        {/* Reviewers */}
        {reviewers.length > 0 && (
          <>
            <div className="flex gap-2 flex-wrap justify-center">
              {reviewers.map(a => (
                <div key={a.id} className="px-3 py-1.5 rounded-md text-[11px] font-medium border"
                  style={{ borderColor: `${a.color}50`, background: `${a.color}10`, color: a.color }}>
                  {a.name}
                </div>
              ))}
            </div>
            <ArrowDown className="w-4 h-4 text-muted-foreground" />
          </>
        )}

        {/* Synthesizers */}
        {synthesizers.length > 0 && (
          <div className="flex gap-2 flex-wrap justify-center">
            {synthesizers.map(a => (
              <div key={a.id} className="px-3 py-1.5 rounded-md text-[11px] font-medium border"
                style={{ borderColor: `${a.color}50`, background: `${a.color}10`, color: a.color }}>
                {a.name}
              </div>
            ))}
          </div>
        )}

        <ArrowDown className="w-4 h-4 text-muted-foreground" />
        <div className="px-4 py-2 rounded-lg border border-[oklch(0.72_0.19_155)]/30 bg-[oklch(0.72_0.19_155)]/5 text-xs font-medium" style={{ color: "oklch(0.72 0.19 155)" }}>
          最终输出
        </div>
      </div>
    </div>
  );
}

// ===== Main Page =====
export default function AgentOrchestration() {
  const [agents, setAgents] = useState<AgentRole[]>(defaultAgents);
  const [selectedPattern, setSelectedPattern] = useState("hierarchical");
  const [activeTab, setActiveTab] = useState<"agents" | "scenes" | "workflow">("agents");
  const [editingAgent, setEditingAgent] = useState<AgentRole | null>(null);
  const [sceneFilter, setSceneFilter] = useState("全部");

  const categories = ["全部", ...Array.from(new Set(sceneTemplates.map(s => s.category)))];

  const handleToggleAgent = (id: string) => {
    setAgents(prev => prev.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a));
  };

  const handleDeleteAgent = (id: string) => {
    setAgents(prev => prev.filter(a => a.id !== id));
    toast.success("Agent 已删除");
  };

  const handleSaveAgent = (updated: AgentRole) => {
    setAgents(prev => prev.map(a => a.id === updated.id ? updated : a));
    setEditingAgent(null);
  };

  const handleAddAgent = () => {
    const newAgent: AgentRole = {
      id: `agent-${Date.now()}`,
      name: "新 Agent",
      type: "specialist",
      model: "deepseek-chat",
      systemPrompt: "请定义此 Agent 的系统提示词...",
      description: "请描述此 Agent 的职责",
      skills: [],
      maxTokens: 4096,
      temperature: 0.5,
      color: "oklch(0.65 0.18 250)",
      enabled: true,
    };
    setAgents(prev => [...prev, newAgent]);
    setEditingAgent(newAgent);
  };

  const handleApplyScene = (scene: SceneTemplate) => {
    const newAgents: AgentRole[] = scene.agents.map((a, i) => ({
      id: `scene-${scene.id}-${i}`,
      name: a.role,
      type: i === 0 ? "coordinator" : i === scene.agents.length - 1 ? "synthesizer" : "specialist",
      model: a.model,
      systemPrompt: `你是${a.role}，负责${a.desc}。`,
      description: a.desc,
      skills: [a.desc],
      maxTokens: 4096,
      temperature: 0.5,
      color: orchestrationPatterns.find(p => p.id === scene.pattern)?.color || "oklch(0.65 0.18 250)",
      enabled: true,
    }));
    setAgents(newAgents);
    setSelectedPattern(scene.pattern);
    setActiveTab("workflow");
    toast.success(`已应用「${scene.name}」场景模板`);
  };

  const handleExportConfig = () => {
    const config = {
      version: "1.0.0",
      orchestration: {
        pattern: selectedPattern,
        agents: agents.map(({ id, name, type, model, systemPrompt, description, skills, maxTokens, temperature, enabled }) => ({
          id, name, type, model, systemPrompt, description, skills, maxTokens, temperature, enabled,
        })),
      },
    };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "llclaw-agents-config.json";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Agent 配置已导出");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">多智能体编排</h1>
            <p className="text-sm text-muted-foreground mt-1">
              配置 Agent 角色、编排协作流程、应用场景模板
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={handleExportConfig}>
              <Save className="w-3.5 h-3.5" />导出配置
            </Button>
            <Button size="sm" className="gap-1.5 glow-blue" onClick={handleAddAgent}>
              <Plus className="w-3.5 h-3.5" />添加 Agent
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-lg bg-accent/30 w-fit">
          {[
            { id: "agents" as const, label: "Agent 管理", icon: Users },
            { id: "scenes" as const, label: "场景模板", icon: Layers },
            { id: "workflow" as const, label: "工作流预览", icon: Workflow },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  activeTab === tab.id
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

        {/* Orchestration Patterns */}
        <div className="panel">
          <div className="panel-header">
            <Network className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">编排模式</span>
            <span className="text-[10px] text-muted-foreground ml-2">选择 Agent 协作方式</span>
          </div>
          <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            {orchestrationPatterns.map((pattern) => (
              <PatternCard
                key={pattern.id}
                pattern={pattern}
                isSelected={selectedPattern === pattern.id}
                onSelect={() => setSelectedPattern(pattern.id)}
              />
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "agents" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Agent 列表</h2>
              <span className="text-xs text-muted-foreground">
                {agents.filter(a => a.enabled).length}/{agents.length} 个活跃
              </span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {agents.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  onEdit={() => setEditingAgent(agent)}
                  onToggle={() => handleToggleAgent(agent.id)}
                  onDelete={() => handleDeleteAgent(agent.id)}
                />
              ))}
            </div>
          </div>
        )}

        {activeTab === "scenes" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">场景模板</h2>
              <div className="flex gap-1">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSceneFilter(cat)}
                    className={`px-2.5 py-1 rounded-md text-[11px] transition-all ${
                      sceneFilter === cat
                        ? "bg-primary/15 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {sceneTemplates
                .filter(s => sceneFilter === "全部" || s.category === sceneFilter)
                .map((scene) => (
                  <SceneCard key={scene.id} scene={scene} onApply={() => handleApplyScene(scene)} />
                ))}
            </div>
          </div>
        )}

        {activeTab === "workflow" && (
          <div className="panel">
            <div className="panel-header">
              <Workflow className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">工作流预览</span>
              <span className="text-[10px] text-muted-foreground ml-2">当前 Agent 协作拓扑</span>
            </div>
            <WorkflowPreview agents={agents} pattern={selectedPattern} />
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingAgent && (
          <AgentEditModal
            agent={editingAgent}
            onSave={handleSaveAgent}
            onClose={() => setEditingAgent(null)}
          />
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
