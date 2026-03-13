/*
 * PortableConfig - Configuration Import/Export & Migration
 * Industrial Console Style: Config management, backup/restore, portability
 */
import DashboardLayout from "@/components/DashboardLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  FolderSync, Download, Upload, Copy, Check, FileJson,
  Shield, Clock, Archive, ChevronRight, AlertCircle,
  FileCode, RefreshCw, Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const sampleConfig = {
  "$schema": "https://llclaw.dev/schema/config.json",
  "version": "1.0.0",
  "exportedAt": new Date().toISOString(),
  "agent": {
    "model": "deepseek/deepseek-chat",
    "thinkingLevel": "medium"
  },
  "gateway": {
    "port": 18789,
    "bind": "127.0.0.1",
    "verbose": true
  },
  "models": {
    "deepseek": {
      "baseUrl": "https://api.deepseek.com/v1",
      "apiKey": "sk-****",
      "model": "deepseek-chat"
    },
    "qwen": {
      "baseUrl": "https://dashscope.aliyuncs.com/compatible-mode/v1",
      "apiKey": "sk-****",
      "model": "qwen-max"
    },
    "ollama": {
      "baseUrl": "http://localhost:11434/v1",
      "apiKey": "local",
      "model": "llama3.1"
    }
  },
  "channels": {
    "telegram": {
      "enabled": true,
      "botToken": "****"
    },
    "webchat": {
      "enabled": true
    }
  },
  "skills": [
    "web-search",
    "code-interpreter",
    "file-manager"
  ],
  "security": {
    "dmPolicy": "pairing",
    "sandboxMode": "non-main"
  }
};

interface BackupRecord {
  id: string;
  name: string;
  date: string;
  size: string;
  models: number;
  channels: number;
}

export default function PortableConfig() {
  const [activeSection, setActiveSection] = useState<"export" | "import" | "backup">("export");
  const [exportFormat, setExportFormat] = useState<"json" | "yaml" | "env">("json");
  const [includeKeys, setIncludeKeys] = useState(false);
  const [importText, setImportText] = useState("");
  const [backups] = useState<BackupRecord[]>([
    { id: "1", name: "完整备份 2026-03-13", date: "2026-03-13 08:00", size: "2.4 KB", models: 3, channels: 2 },
    { id: "2", name: "模型配置备份", date: "2026-03-12 14:30", size: "1.1 KB", models: 3, channels: 0 },
    { id: "3", name: "迁移前备份", date: "2026-03-10 09:15", size: "3.2 KB", models: 5, channels: 4 },
  ]);

  const handleExport = () => {
    const config = includeKeys ? sampleConfig : {
      ...sampleConfig,
      models: Object.fromEntries(
        Object.entries(sampleConfig.models).map(([k, v]) => [k, { ...v, apiKey: "YOUR_API_KEY_HERE" }])
      ),
      channels: Object.fromEntries(
        Object.entries(sampleConfig.channels).map(([k, v]) => [k, { ...v, ...('botToken' in v ? { botToken: "YOUR_TOKEN_HERE" } : {}) }])
      ),
    };

    let content: string;
    let ext: string;
    if (exportFormat === "json") {
      content = JSON.stringify(config, null, 2);
      ext = "json";
    } else if (exportFormat === "yaml") {
      content = jsonToYaml(config);
      ext = "yaml";
    } else {
      content = jsonToEnv(config);
      ext = "env";
    }

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `llclaw-config.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`配置已导出为 ${ext.toUpperCase()} 格式`);
  };

  const handleCopyConfig = () => {
    navigator.clipboard.writeText(JSON.stringify(sampleConfig, null, 2));
    toast.success("配置已复制到剪贴板");
  };

  const handleImport = () => {
    if (!importText.trim()) {
      toast.error("请粘贴配置内容");
      return;
    }
    try {
      JSON.parse(importText);
      toast.success("配置导入成功，已应用新配置");
      setImportText("");
    } catch {
      toast.error("配置格式无效，请检查 JSON 格式");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight">配置迁移</h1>
          <p className="text-sm text-muted-foreground mt-1">导出、导入和备份 OpenClaw 配置，实现跨机器无缝迁移</p>
        </div>

        {/* Section Tabs */}
        <div className="flex gap-1 p-1 rounded-lg bg-secondary/50 w-fit">
          {([
            { key: "export" as const, label: "导出配置", icon: Download },
            { key: "import" as const, label: "导入配置", icon: Upload },
            { key: "backup" as const, label: "备份管理", icon: Archive },
          ]).map((tab) => (
            <button key={tab.key} onClick={() => setActiveSection(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm transition-all ${activeSection === tab.key ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
              <tab.icon className="w-3.5 h-3.5" />{tab.label}
            </button>
          ))}
        </div>

        {/* Export Section */}
        {activeSection === "export" && (
          <div className="space-y-4">
            <div className="grid lg:grid-cols-3 gap-4">
              {/* Options */}
              <div className="panel">
                <div className="panel-header">
                  <FileJson className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">导出选项</span>
                </div>
                <div className="p-4 space-y-4">
                  <div>
                    <label className="text-xs text-muted-foreground mb-2 block">导出格式</label>
                    <div className="space-y-2">
                      {([
                        { key: "json" as const, label: "JSON", desc: "标准配置格式，可直接用于 openclaw.json" },
                        { key: "yaml" as const, label: "YAML", desc: "可读性更好的格式" },
                        { key: "env" as const, label: "ENV", desc: "环境变量格式，适合 Docker 部署" },
                      ]).map((fmt) => (
                        <label key={fmt.key} className={`flex items-start gap-3 p-2.5 rounded-md border cursor-pointer transition-all ${exportFormat === fmt.key ? "border-primary/50 bg-primary/5" : "border-border hover:border-border/80"}`}>
                          <input type="radio" name="format" checked={exportFormat === fmt.key} onChange={() => setExportFormat(fmt.key)} className="mt-0.5" />
                          <div>
                            <span className="text-sm font-medium">{fmt.label}</span>
                            <p className="text-xs text-muted-foreground mt-0.5">{fmt.desc}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={includeKeys} onChange={(e) => setIncludeKeys(e.target.checked)} />
                      <div>
                        <span className="text-sm">包含 API 密钥</span>
                        <p className="text-xs text-muted-foreground">导出时包含实际的 API Key（注意安全）</p>
                      </div>
                    </label>
                    {includeKeys && (
                      <div className="mt-2 flex items-start gap-2 p-2 rounded bg-[oklch(0.75_0.18_80)]/10 border border-[oklch(0.75_0.18_80)]/20">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "oklch(0.75 0.18 80)" }} />
                        <span className="text-xs" style={{ color: "oklch(0.75 0.18 80)" }}>导出文件将包含敏感信息，请妥善保管</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button size="sm" className="gap-1 flex-1" onClick={handleExport}>
                      <Download className="w-3 h-3" />下载文件
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1 border-border" onClick={handleCopyConfig}>
                      <Copy className="w-3 h-3" />复制
                    </Button>
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="lg:col-span-2 panel">
                <div className="panel-header">
                  <FileCode className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">配置预览</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono ml-2">{exportFormat.toUpperCase()}</span>
                </div>
                <pre className="p-4 overflow-auto max-h-96 text-xs font-mono leading-relaxed text-foreground/80">
                  {JSON.stringify(sampleConfig, null, 2)}
                </pre>
              </div>
            </div>

            {/* Migration Guide */}
            <div className="panel">
              <div className="panel-header">
                <FolderSync className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">迁移步骤</span>
              </div>
              <div className="p-4">
                <div className="grid md:grid-cols-4 gap-4">
                  {[
                    { step: 1, title: "导出配置", desc: "在源机器上导出当前配置文件" },
                    { step: 2, title: "传输文件", desc: "将配置文件复制到目标机器" },
                    { step: 3, title: "安装 OpenClaw", desc: "在目标机器上运行安装脚本" },
                    { step: 4, title: "导入配置", desc: "导入配置文件并更新 API 密钥" },
                  ].map((s, i) => (
                    <div key={s.step} className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: "oklch(0.65 0.18 250 / 20%)", color: "oklch(0.65 0.18 250)" }}>
                        {s.step}
                      </div>
                      <div>
                        <span className="text-sm font-medium">{s.title}</span>
                        <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Import Section */}
        {activeSection === "import" && (
          <div className="space-y-4">
            <div className="panel">
              <div className="panel-header">
                <Upload className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">导入配置</span>
              </div>
              <div className="p-4 space-y-4">
                <p className="text-sm text-muted-foreground">粘贴从其他机器导出的配置 JSON，或上传配置文件</p>
                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder='粘贴 JSON 配置内容...\n{\n  "agent": {\n    "model": "deepseek/deepseek-chat"\n  }\n}'
                  className="w-full h-64 p-4 rounded-md bg-input border border-border text-sm font-mono focus:border-primary focus:outline-none resize-none"
                />
                <div className="flex gap-2">
                  <Button size="sm" className="gap-1" onClick={handleImport}>
                    <Upload className="w-3 h-3" />应用配置
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1 border-border" onClick={() => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = ".json,.yaml,.yml,.env";
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          setImportText(ev.target?.result as string);
                          toast.success("文件已加载");
                        };
                        reader.readAsText(file);
                      }
                    };
                    input.click();
                  }}>
                    <FileJson className="w-3 h-3" />上传文件
                  </Button>
                  <Button size="sm" variant="outline" className="border-border" onClick={() => setImportText("")}>
                    清空
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Backup Section */}
        {activeSection === "backup" && (
          <div className="space-y-4">
            <div className="panel">
              <div className="panel-header">
                <Archive className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">备份记录</span>
                <Button size="sm" className="ml-auto h-7 text-xs gap-1">
                  <Plus className="w-3 h-3" />创建备份
                </Button>
              </div>
              <div className="p-4 space-y-2">
                {backups.map((backup) => (
                  <div key={backup.id} className="flex items-center justify-between py-3 px-3 rounded-md bg-secondary/50 border border-border/50">
                    <div className="flex items-center gap-3">
                      <Archive className="w-4 h-4 text-primary" />
                      <div>
                        <span className="text-sm font-medium">{backup.name}</span>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs text-muted-foreground font-mono">{backup.date}</span>
                          <span className="text-xs text-muted-foreground">{backup.size}</span>
                          <span className="text-xs text-muted-foreground">{backup.models} 模型</span>
                          <span className="text-xs text-muted-foreground">{backup.channels} 通道</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="h-7 text-xs border-border gap-1" onClick={() => toast.success("正在恢复备份...")}>
                        <RefreshCw className="w-3 h-3" />恢复
                      </Button>
                      <Button variant="outline" size="sm" className="h-7 text-xs border-border gap-1" onClick={() => toast.success("备份已下载")}>
                        <Download className="w-3 h-3" />
                      </Button>
                      <Button variant="outline" size="sm" className="h-7 text-xs border-border text-destructive hover:text-destructive" onClick={() => toast.success("备份已删除")}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Auto Backup Settings */}
            <div className="panel">
              <div className="panel-header">
                <Clock className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">自动备份</span>
              </div>
              <div className="p-4 space-y-3">
                <label className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium">启用自动备份</span>
                    <p className="text-xs text-muted-foreground">每日自动备份配置文件</p>
                  </div>
                  <div className="w-10 h-5 rounded-full bg-primary/30 relative cursor-pointer">
                    <div className="w-4 h-4 rounded-full bg-primary absolute top-0.5 right-0.5 transition-all" />
                  </div>
                </label>
                <label className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium">保留备份数量</span>
                    <p className="text-xs text-muted-foreground">超出数量自动删除最旧备份</p>
                  </div>
                  <select className="h-8 px-2 rounded bg-input border border-border text-sm font-mono focus:border-primary focus:outline-none">
                    <option>7</option>
                    <option>14</option>
                    <option>30</option>
                  </select>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

// Helper: Simple JSON to YAML-like conversion
function jsonToYaml(obj: any, indent = 0): string {
  const pad = "  ".repeat(indent);
  let result = "";
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      result += `${pad}${key}:\n${jsonToYaml(value, indent + 1)}`;
    } else if (Array.isArray(value)) {
      result += `${pad}${key}:\n`;
      value.forEach((item) => { result += `${pad}  - ${JSON.stringify(item)}\n`; });
    } else {
      result += `${pad}${key}: ${JSON.stringify(value)}\n`;
    }
  }
  return result;
}

// Helper: JSON to ENV format
function jsonToEnv(obj: any, prefix = "OPENCLAW"): string {
  let result = "# LLclaw OpenClaw Configuration (ENV format)\n\n";
  function flatten(o: any, p: string) {
    for (const [key, value] of Object.entries(o)) {
      const envKey = `${p}_${key}`.toUpperCase();
      if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        flatten(value, envKey);
      } else {
        result += `${envKey}=${JSON.stringify(value)}\n`;
      }
    }
  }
  flatten(obj, prefix);
  return result;
}

function Plus(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M5 12h14" /><path d="M12 5v14" />
    </svg>
  );
}
