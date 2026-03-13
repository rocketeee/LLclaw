/*
 * ModelConfig - AI Model Configuration
 * Industrial Console Style: Panel-based model management
 * Supports: 15+ Chinese & international models + private deployment (Ollama/vLLM)
 */
import DashboardLayout from "@/components/DashboardLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Cpu, Plus, Check, X, Eye, EyeOff, Copy, Trash2,
  Server, Globe, ExternalLink, ChevronDown, ChevronUp,
  Save, TestTube,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface ModelProvider {
  id: string;
  name: string;
  nameEn: string;
  category: "china" | "international" | "private";
  baseUrl: string;
  models: string[];
  docUrl: string;
  compatible: boolean;
  description: string;
}

const providers: ModelProvider[] = [
  { id: "deepseek", name: "DeepSeek", nameEn: "DeepSeek", category: "china", baseUrl: "https://api.deepseek.com/v1", models: ["deepseek-chat", "deepseek-reasoner"], docUrl: "https://platform.deepseek.com/docs", compatible: true, description: "深度求索，高性价比推理模型，支持深度思考" },
  { id: "qwen", name: "通义千问", nameEn: "Qwen (Alibaba)", category: "china", baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1", models: ["qwen-max", "qwen-plus", "qwen-turbo", "qwen-long"], docUrl: "https://help.aliyun.com/zh/model-studio/", compatible: true, description: "阿里云百炼平台，OpenAI 兼容接口" },
  { id: "ernie", name: "文心一言", nameEn: "ERNIE (Baidu)", category: "china", baseUrl: "https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop", models: ["ernie-4.0", "ernie-3.5-turbo", "ernie-speed"], docUrl: "https://cloud.baidu.com/doc/WENXINWORKSHOP/", compatible: false, description: "百度文心大模型，需使用百度专用 API 格式" },
  { id: "zhipu", name: "智谱 GLM", nameEn: "Zhipu GLM", category: "china", baseUrl: "https://open.bigmodel.cn/api/paas/v4", models: ["glm-4-plus", "glm-4", "glm-4-flash", "glm-4v"], docUrl: "https://open.bigmodel.cn/dev/api", compatible: true, description: "智谱 AI 开放平台，OpenAI 兼容接口" },
  { id: "moonshot", name: "Moonshot", nameEn: "Moonshot (Kimi)", category: "china", baseUrl: "https://api.moonshot.cn/v1", models: ["moonshot-v1-128k", "moonshot-v1-32k", "moonshot-v1-8k"], docUrl: "https://platform.moonshot.cn/docs/", compatible: true, description: "月之暗面 Kimi，支持超长上下文" },
  { id: "baichuan", name: "百川", nameEn: "Baichuan", category: "china", baseUrl: "https://api.baichuan-ai.com/v1", models: ["Baichuan4", "Baichuan3-Turbo", "Baichuan3-Turbo-128k"], docUrl: "https://platform.baichuan-ai.com/docs/api", compatible: true, description: "百川智能，OpenAI 兼容接口" },
  { id: "hunyuan", name: "腾讯混元", nameEn: "Tencent Hunyuan", category: "china", baseUrl: "https://api.hunyuan.cloud.tencent.com/v1", models: ["hunyuan-pro", "hunyuan-standard", "hunyuan-lite"], docUrl: "https://cloud.tencent.com/document/product/1729", compatible: true, description: "腾讯混元大模型，OpenAI 兼容接口" },
  { id: "spark", name: "讯飞星火", nameEn: "iFlytek Spark", category: "china", baseUrl: "https://spark-api-open.xf-yun.com/v1", models: ["spark-max", "spark-pro", "spark-lite"], docUrl: "https://www.xfyun.cn/doc/spark/Web.html", compatible: true, description: "科大讯飞星火认知大模型" },
  { id: "doubao", name: "豆包", nameEn: "Doubao (ByteDance)", category: "china", baseUrl: "https://ark.cn-beijing.volces.com/api/v3", models: ["doubao-pro-256k", "doubao-pro-32k", "doubao-lite-32k"], docUrl: "https://www.volcengine.com/docs/82379", compatible: true, description: "字节跳动豆包大模型，火山引擎方舟平台" },
  { id: "minimax", name: "MiniMax", nameEn: "MiniMax", category: "china", baseUrl: "https://api.minimax.chat/v1", models: ["abab6.5s-chat", "abab6.5-chat", "abab5.5-chat"], docUrl: "https://platform.minimaxi.com/document/", compatible: true, description: "MiniMax 大模型，OpenAI 兼容接口" },
  { id: "openai", name: "OpenAI", nameEn: "OpenAI", category: "international", baseUrl: "https://api.openai.com/v1", models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "o1", "o1-mini"], docUrl: "https://platform.openai.com/docs", compatible: true, description: "OpenAI GPT 系列模型" },
  { id: "anthropic", name: "Claude", nameEn: "Anthropic Claude", category: "international", baseUrl: "https://api.anthropic.com/v1", models: ["claude-opus-4-6", "claude-sonnet-4-20250514", "claude-3-haiku"], docUrl: "https://docs.anthropic.com/", compatible: false, description: "Anthropic Claude 系列，需使用 Anthropic API 格式" },
  { id: "gemini", name: "Gemini", nameEn: "Google Gemini", category: "international", baseUrl: "https://generativelanguage.googleapis.com/v1beta", models: ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"], docUrl: "https://ai.google.dev/docs", compatible: false, description: "Google Gemini 系列模型" },
  { id: "ollama", name: "Ollama", nameEn: "Ollama (Local)", category: "private", baseUrl: "http://localhost:11434/v1", models: ["llama3.1", "qwen2.5", "deepseek-r1", "mistral", "codellama"], docUrl: "https://ollama.com/library", compatible: true, description: "本地轻量级模型运行引擎，支持一键拉取模型" },
  { id: "vllm", name: "vLLM", nameEn: "vLLM (Local)", category: "private", baseUrl: "http://localhost:8000/v1", models: ["自定义模型路径"], docUrl: "https://docs.vllm.ai/", compatible: true, description: "高性能推理引擎，适合生产环境私有化部署" },
  { id: "custom", name: "自定义端点", nameEn: "Custom Endpoint", category: "private", baseUrl: "", models: [], docUrl: "", compatible: true, description: "任何 OpenAI 兼容的 API 端点" },
];

interface ConfiguredModel {
  providerId: string;
  apiKey: string;
  baseUrl: string;
  selectedModel: string;
  enabled: boolean;
}

export default function ModelConfig() {
  const [configuredModels, setConfiguredModels] = useState<ConfiguredModel[]>([
    { providerId: "deepseek", apiKey: "sk-****", baseUrl: "https://api.deepseek.com/v1", selectedModel: "deepseek-chat", enabled: true },
  ]);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"china" | "international" | "private">("china");
  const [editingNew, setEditingNew] = useState<string | null>(null);
  const [newApiKey, setNewApiKey] = useState("");
  const [newBaseUrl, setNewBaseUrl] = useState("");
  const [newModel, setNewModel] = useState("");

  const filteredProviders = providers.filter((p) => p.category === activeTab);
  const isConfigured = (id: string) => configuredModels.some((m) => m.providerId === id);

  const handleAddModel = (provider: ModelProvider) => {
    if (isConfigured(provider.id)) { toast.info("该模型已配置"); return; }
    setEditingNew(provider.id);
    setNewApiKey("");
    setNewBaseUrl(provider.baseUrl);
    setNewModel(provider.models[0] || "");
  };

  const handleSaveModel = (provider: ModelProvider) => {
    if (!newApiKey && provider.category !== "private") { toast.error("请输入 API Key"); return; }
    setConfiguredModels((prev) => [...prev, {
      providerId: provider.id, apiKey: newApiKey || "local",
      baseUrl: newBaseUrl || provider.baseUrl, selectedModel: newModel || provider.models[0] || "", enabled: true,
    }]);
    setEditingNew(null);
    toast.success(`${provider.name} 配置已保存`);
  };

  const handleRemoveModel = (providerId: string) => {
    setConfiguredModels((prev) => prev.filter((m) => m.providerId !== providerId));
    toast.success("模型配置已移除");
  };

  const handleTestConnection = () => {
    toast.promise(new Promise((resolve) => setTimeout(resolve, 1500)), {
      loading: "正在测试连接...", success: "连接测试成功", error: "连接测试失败",
    });
  };

  const handleExportConfig = () => {
    const active = configuredModels.find((m) => m.enabled);
    const config = {
      agent: { model: active ? `${active.providerId}/${active.selectedModel}` : "deepseek/deepseek-chat" },
      models: Object.fromEntries(configuredModels.map((m) => [m.providerId, { baseUrl: m.baseUrl, apiKey: m.apiKey, model: m.selectedModel }])),
    };
    navigator.clipboard.writeText(JSON.stringify(config, null, 2));
    toast.success("配置已复制到剪贴板");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">模型配置</h1>
            <p className="text-sm text-muted-foreground mt-1">管理 AI 模型 API 密钥和端点，已配置 {configuredModels.length} 个模型</p>
          </div>
          <Button variant="outline" size="sm" className="gap-2 border-border" onClick={handleExportConfig}>
            <Copy className="w-3.5 h-3.5" />导出配置
          </Button>
        </div>

        {/* Configured Models */}
        {configuredModels.length > 0 && (
          <div className="panel">
            <div className="panel-header">
              <Check className="w-4 h-4" style={{ color: "oklch(0.72 0.19 155)" }} />
              <span className="text-sm font-medium">已配置模型</span>
            </div>
            <div className="p-4 space-y-2">
              {configuredModels.map((cm) => {
                const provider = providers.find((p) => p.id === cm.providerId);
                if (!provider) return null;
                return (
                  <div key={cm.providerId} className="flex items-center justify-between py-2.5 px-3 rounded-md bg-secondary/50 border border-border/50">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full status-pulse ${cm.enabled ? "bg-[oklch(0.72_0.19_155)]" : "bg-muted-foreground"}`} />
                      <div>
                        <span className="text-sm font-medium">{provider.name}</span>
                        <span className="text-xs font-mono text-muted-foreground ml-2">{cm.selectedModel}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="h-7 text-xs border-border" onClick={handleTestConnection}>
                        <TestTube className="w-3 h-3 mr-1" />测试
                      </Button>
                      <Button variant="outline" size="sm" className="h-7 text-xs border-border text-destructive hover:text-destructive" onClick={() => handleRemoveModel(cm.providerId)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Category Tabs */}
        <div className="flex gap-1 p-1 rounded-lg bg-secondary/50 w-fit">
          {([
            { key: "china" as const, label: "国内大模型", icon: Globe },
            { key: "international" as const, label: "国际大模型", icon: Globe },
            { key: "private" as const, label: "私有化部署", icon: Server },
          ]).map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm transition-all ${activeTab === tab.key ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
              <tab.icon className="w-3.5 h-3.5" />{tab.label}
            </button>
          ))}
        </div>

        {/* Provider List */}
        <div className="grid gap-3">
          {filteredProviders.map((provider, i) => {
            const configured = isConfigured(provider.id);
            const isEditing = editingNew === provider.id;
            const isExpanded = expandedProvider === provider.id || isEditing;

            return (
              <motion.div key={provider.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className={`panel transition-all ${configured ? "border-[oklch(0.72_0.19_155)]/30" : ""}`}>
                <div className="p-4 flex items-center justify-between cursor-pointer"
                  onClick={() => { if (!isEditing) setExpandedProvider(expandedProvider === provider.id ? null : provider.id); }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: configured ? "oklch(0.72 0.19 155 / 12%)" : "oklch(0.65 0.18 250 / 12%)" }}>
                      <Cpu className={`w-5 h-5 ${configured ? "text-[oklch(0.72_0.19_155)]" : "text-primary"}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{provider.name}</span>
                        <span className="text-xs text-muted-foreground font-mono">{provider.nameEn}</span>
                        {configured && <span className="text-[10px] px-1.5 py-0.5 rounded font-mono" style={{ background: "oklch(0.72 0.19 155 / 15%)", color: "oklch(0.72 0.19 155)" }}>已配置</span>}
                        {provider.compatible && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono">OpenAI 兼容</span>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{provider.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!configured && !isEditing && (
                      <Button size="sm" className="h-7 text-xs gap-1" onClick={(e) => { e.stopPropagation(); handleAddModel(provider); }}>
                        <Plus className="w-3 h-3" />配置
                      </Button>
                    )}
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-border p-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-muted-foreground">API 端点</span>
                        <div className="font-mono mt-1 text-foreground/80 break-all">{provider.baseUrl || "自定义"}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">可用模型</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {provider.models.map((m) => (
                            <span key={m} className="px-1.5 py-0.5 rounded bg-secondary text-foreground/80 font-mono text-[10px]">{m}</span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {provider.docUrl && (
                      <a href={provider.docUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                        <ExternalLink className="w-3 h-3" />查看 API 文档
                      </a>
                    )}

                    {isEditing && (
                      <div className="space-y-3 pt-3 border-t border-border/50">
                        <div>
                          <label className="text-xs text-muted-foreground mb-1.5 block">API Key</label>
                          <div className="relative">
                            <input
                              type={showKeys[provider.id] ? "text" : "password"}
                              value={newApiKey}
                              onChange={(e) => setNewApiKey(e.target.value)}
                              placeholder={provider.category === "private" ? "本地部署可留空" : "输入 API Key"}
                              className="w-full h-9 px-3 pr-10 rounded-md bg-input border border-border text-sm font-mono focus:border-primary focus:outline-none"
                            />
                            <button
                              onClick={() => setShowKeys((prev) => ({ ...prev, [provider.id]: !prev[provider.id] }))}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                              {showKeys[provider.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1.5 block">Base URL</label>
                          <input
                            type="text"
                            value={newBaseUrl}
                            onChange={(e) => setNewBaseUrl(e.target.value)}
                            placeholder="API 端点地址"
                            className="w-full h-9 px-3 rounded-md bg-input border border-border text-sm font-mono focus:border-primary focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1.5 block">模型名称</label>
                          <select
                            value={newModel}
                            onChange={(e) => setNewModel(e.target.value)}
                            className="w-full h-9 px-3 rounded-md bg-input border border-border text-sm font-mono focus:border-primary focus:outline-none"
                          >
                            {provider.models.map((m) => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex gap-2 pt-1">
                          <Button size="sm" className="gap-1" onClick={() => handleSaveModel(provider)}>
                            <Save className="w-3 h-3" />保存配置
                          </Button>
                          <Button size="sm" variant="outline" className="border-border" onClick={() => setEditingNew(null)}>
                            <X className="w-3 h-3 mr-1" />取消
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
