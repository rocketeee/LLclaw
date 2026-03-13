/*
 * InstallGuide - Installation & Deployment Guide
 * Industrial Console Style: Terminal-like code blocks, step-by-step guide
 */
import DashboardLayout from "@/components/DashboardLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Download, Copy, Check, Terminal, ChevronDown, ChevronUp,
  Monitor, Server, Container, FileCode, ExternalLink, Trash2, AlertTriangle, Shield,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

function CodeBlock({ code, title, lang }: { code: string; title?: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("已复制到剪贴板");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="panel overflow-hidden">
      {title && (
        <div className="panel-header">
          <Terminal className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-mono text-muted-foreground">{title}</span>
          {lang && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono ml-auto mr-2">{lang}</span>}
          <button onClick={handleCopy} className="text-muted-foreground hover:text-foreground transition-colors">
            {copied ? <Check className="w-3.5 h-3.5 text-[oklch(0.72_0.19_155)]" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}
      <pre className="p-4 overflow-x-auto text-xs font-mono leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

const installMethods = [
  {
    id: "powershell",
    icon: Monitor,
    title: "PowerShell 一键安装",
    subtitle: "推荐方式 — 自动配置 WSL2 + Node.js + OpenClaw",
    steps: [
      {
        title: "以管理员身份运行 PowerShell",
        desc: "右键开始菜单，选择「终端(管理员)」或「Windows PowerShell(管理员)」",
      },
      {
        title: "执行安装脚本",
        desc: "复制以下命令到 PowerShell 中执行，脚本将自动完成全部安装流程",
        code: `# LLclaw 一键安装脚本 (PowerShell)
# 自动检测系统环境、安装 WSL2、Node.js 和 OpenClaw

irm https://llclaw.dev/install.ps1 | iex`,
      },
      {
        title: "等待安装完成",
        desc: "脚本将依次执行：系统检测 → WSL2 启用 → Ubuntu 安装 → Node.js 22 安装 → OpenClaw 安装 → 配置向导",
      },
    ],
  },
  {
    id: "wsl",
    icon: Terminal,
    title: "WSL2 手动安装",
    subtitle: "适合已有 WSL2 环境的用户",
    steps: [
      {
        title: "确保 WSL2 已安装",
        code: `# 检查 WSL 版本
wsl --version

# 如未安装，执行：
wsl --install -d Ubuntu-24.04`,
      },
      {
        title: "进入 WSL 并安装 Node.js 22",
        code: `# 进入 WSL
wsl

# 安装 Node.js 22 (使用 NodeSource)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证版本
node --version  # 应输出 v22.x.x`,
      },
      {
        title: "安装 OpenClaw",
        code: `# 全局安装 OpenClaw
npm install -g openclaw@latest

# 运行安装向导
openclaw onboard --install-daemon

# 启动 Gateway
openclaw gateway --port 18789 --verbose`,
      },
    ],
  },
  {
    id: "docker",
    icon: Container,
    title: "Docker 容器部署",
    subtitle: "适合生产环境和容器化部署",
    steps: [
      {
        title: "安装 Docker Desktop",
        desc: "从 docker.com 下载并安装 Docker Desktop for Windows，确保启用 WSL2 后端",
      },
      {
        title: "使用 docker-compose 部署",
        code: `# 创建项目目录
mkdir openclaw-deploy && cd openclaw-deploy

# 下载 docker-compose 配置
curl -fsSL https://raw.githubusercontent.com/openclaw/openclaw/main/docker-compose.yml -o docker-compose.yml

# 创建配置文件
mkdir -p config
cat > config/openclaw.json << 'EOF'
{
  "agent": {
    "model": "deepseek/deepseek-chat"
  },
  "gateway": {
    "port": 18789,
    "bind": "0.0.0.0"
  }
}
EOF

# 启动服务
docker compose up -d

# 查看日志
docker compose logs -f`,
      },
    ],
  },
];

const fullScript = `#Requires -RunAsAdministrator
<#
.SYNOPSIS
    LLclaw - OpenClaw Windows 11 一键安装脚本
.DESCRIPTION
    自动检测系统环境，安装 WSL2、Node.js 22 和 OpenClaw，
    支持国内镜像加速，配置守护进程自启动。
.NOTES
    版本: 1.0.0
    要求: Windows 11 22H2+, PowerShell 5.1+
#>

param(
    [string]$NodeVersion = "22",
    [string]$OpenClawVersion = "latest",
    [string]$Mirror = "auto",
    [switch]$SkipWSL,
    [switch]$DockerMode,
    [switch]$Unattended
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# ===== 颜色输出 =====
function Write-Step  { param($msg) Write-Host "[LLclaw] " -ForegroundColor Cyan -NoNewline; Write-Host $msg }
function Write-OK    { param($msg) Write-Host "[  OK  ] " -ForegroundColor Green -NoNewline; Write-Host $msg }
function Write-Warn  { param($msg) Write-Host "[ WARN ] " -ForegroundColor Yellow -NoNewline; Write-Host $msg }
function Write-Err   { param($msg) Write-Host "[ERROR ] " -ForegroundColor Red -NoNewline; Write-Host $msg }

# ===== 系统检测 =====
function Test-SystemRequirements {
    Write-Step "正在检测系统环境..."

    # Windows 版本检查
    $os = Get-CimInstance Win32_OperatingSystem
    $build = [int]$os.BuildNumber
    if ($build -lt 22000) {
        Write-Err "需要 Windows 11 (Build 22000+)，当前版本: $build"
        exit 1
    }
    Write-OK "Windows 11 Build $build"

    # 架构检查
    if ($env:PROCESSOR_ARCHITECTURE -ne "AMD64") {
        Write-Err "需要 64 位系统"
        exit 1
    }
    Write-OK "系统架构: x64"

    # 内存检查
    $ram = [math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB, 1)
    if ($ram -lt 4) {
        Write-Warn "内存不足 4GB ($ram GB)，可能影响性能"
    } else {
        Write-OK "内存: $ram GB"
    }

    # 磁盘空间检查
    $disk = Get-PSDrive C
    $freeGB = [math]::Round($disk.Free / 1GB, 1)
    if ($freeGB -lt 10) {
        Write-Warn "C 盘剩余空间不足 10GB ($freeGB GB)"
    } else {
        Write-OK "磁盘空间: $freeGB GB 可用"
    }
}

# ===== 镜像源检测 =====
function Get-BestMirror {
    if ($Mirror -ne "auto") { return $Mirror }

    Write-Step "正在检测最佳镜像源..."
    $mirrors = @{
        "taobao"  = "https://npmmirror.com"
        "tencent" = "https://mirrors.cloud.tencent.com"
        "huawei"  = "https://mirrors.huaweicloud.com"
        "default" = "https://registry.npmjs.org"
    }

    $best = "default"
    $bestTime = 9999

    foreach ($name in $mirrors.Keys) {
        try {
            $sw = [System.Diagnostics.Stopwatch]::StartNew()
            Invoke-WebRequest -Uri $mirrors[$name] -TimeoutSec 3 -UseBasicParsing | Out-Null
            $sw.Stop()
            if ($sw.ElapsedMilliseconds -lt $bestTime) {
                $bestTime = $sw.ElapsedMilliseconds
                $best = $name
            }
        } catch {}
    }

    Write-OK "使用镜像源: $best ($bestTime ms)"
    return $best
}

# ===== WSL2 安装 =====
function Install-WSL2 {
    if ($SkipWSL) {
        Write-Step "跳过 WSL2 安装"
        return
    }

    Write-Step "正在检查 WSL2..."

    $wslStatus = wsl --status 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-OK "WSL2 已安装"
        return
    }

    Write-Step "正在安装 WSL2..."
    wsl --install -d Ubuntu-24.04 --no-launch

    if ($LASTEXITCODE -ne 0) {
        Write-Err "WSL2 安装失败，请手动安装后重试"
        Write-Step "手动安装命令: wsl --install -d Ubuntu-24.04"
        exit 1
    }

    Write-OK "WSL2 安装完成"
    Write-Warn "可能需要重启计算机以完成 WSL2 配置"
}

# ===== Node.js 安装 =====
function Install-NodeJS {
    Write-Step "正在在 WSL 中安装 Node.js $NodeVersion..."

    $script = @"
#!/bin/bash
set -e

# 检查是否已安装正确版本
if command -v node &>/dev/null; then
    CURRENT=\$(node --version | cut -d'.' -f1 | tr -d 'v')
    if [ "\$CURRENT" -ge "$NodeVersion" ]; then
        echo "[OK] Node.js \$(node --version) 已安装"
        exit 0
    fi
fi

echo "[LLclaw] 安装 Node.js $NodeVersion..."

# 使用 NodeSource 安装
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

echo "[OK] Node.js \$(node --version) 安装完成"
echo "[OK] npm \$(npm --version)"
"@

    $script | wsl bash

    if ($LASTEXITCODE -ne 0) {
        Write-Err "Node.js 安装失败"
        exit 1
    }
    Write-OK "Node.js 安装完成"
}

# ===== OpenClaw 安装 =====
function Install-OpenClaw {
    Write-Step "正在安装 OpenClaw $OpenClawVersion..."

    $mirror = Get-BestMirror
    $registryFlag = ""
    if ($mirror -eq "taobao") {
        $registryFlag = "--registry https://registry.npmmirror.com"
    }

    $script = @"
#!/bin/bash
set -e

echo "[LLclaw] 安装 OpenClaw..."
npm install -g openclaw@latest $registryFlag

echo "[OK] Oopenclaw $(openclaw --version)安装完成"

# 创建配置目录
mkdir -p ~/.openclaw

# 生成默认配置
if [ ! -f ~/.openclaw/openclaw.json ]; then
    cat > ~/.openclaw/openclaw.json << 'CONF'
{
  "agent": {
    "model": "deepseek/deepseek-chat"
  },
  "gateway": {
    "port": 18789
  }
}
CONF
    echo "[OK] 默认配置已生成: ~/.openclaw/openclaw.json"
fi

echo "[LLclaw] 运行安装向导..."
openclaw onboard --install-daemon || true

echo ""
echo "=========================================="
echo "  LLclaw 安装完成！"
echo "=========================================="
echo "  Gateway 地址: ws://127.0.0.1:18789"
echo "  配置文件: ~/.openclaw/openclaw.json"
echo "  启动命令: openclaw gateway --verbose"
echo "=========================================="
"@

    $script | wsl bash

    Write-OK "OpenClaw 安装完成"
}

# ===== 主流程 =====
Write-Host ""
Write-Host "  ╔══════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "  ║  LLclaw - OpenClaw 一键安装工具 v1.0 ║" -ForegroundColor Cyan
Write-Host "  ╚══════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

Test-SystemRequirements
Install-WSL2
Install-NodeJS
Install-OpenClaw

Write-Host ""
Write-Step "全部安装完成！"
Write-Host ""
Write-Host "  下一步操作:" -ForegroundColor Yellow
Write-Host "  1. 进入 WSL:  wsl" -ForegroundColor Gray
Write-Host "  2. 启动服务:  openclaw gateway --verbose" -ForegroundColor Gray
Write-Host "  3. 配置模型:  编辑 ~/.openclaw/openclaw.json" -ForegroundColor Gray
Write-Host "  4. 监控面板:  访问 http://localhost:18789" -ForegroundColor Gray
Write-Host ""`;

export default function InstallGuide() {
  const [expandedMethod, setExpandedMethod] = useState<string>("powershell");
  const [showFullScript, setShowFullScript] = useState(false);

  const handleDownloadScript = () => {
    const blob = new Blob([fullScript], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "llclaw-install.ps1";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("安装脚本已下载");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">安装部署</h1>
            <p className="text-sm text-muted-foreground mt-1">Windows 11 上部署 OpenClaw 的完整指南</p>
          </div>
          <Button size="sm" className="gap-2 glow-blue" onClick={handleDownloadScript}>
            <Download className="w-3.5 h-3.5" />下载安装脚本
          </Button>
        </div>

        {/* Quick Start */}
        <div className="panel border-primary/30">
          <div className="panel-header">
            <Terminal className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">快速开始</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono ml-2">推荐</span>
          </div>
          <div className="p-4">
            <p className="text-sm text-muted-foreground mb-3">以管理员身份打开 PowerShell，执行以下命令：</p>
            <CodeBlock
              code="irm https://llclaw.dev/install.ps1 | iex"
              title="PowerShell (管理员)"
              lang="PowerShell"
            />
          </div>
        </div>

        {/* Install Methods */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">安装方式</h2>
          {installMethods.map((method) => {
            const Icon = method.icon;
            const isExpanded = expandedMethod === method.id;
            return (
              <motion.div key={method.id} className="panel">
                <div
                  className="p-4 flex items-center justify-between cursor-pointer"
                  onClick={() => setExpandedMethod(isExpanded ? "" : method.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: "oklch(0.65 0.18 250 / 12%)" }}>
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <span className="font-medium text-sm">{method.title}</span>
                      <p className="text-xs text-muted-foreground mt-0.5">{method.subtitle}</p>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>

                {isExpanded && (
                  <div className="border-t border-border p-4 space-y-6">
                    {method.steps.map((step, i) => (
                      <div key={i} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: "oklch(0.65 0.18 250 / 20%)", color: "oklch(0.65 0.18 250)" }}>
                            {i + 1}
                          </div>
                          {i < method.steps.length - 1 && <div className="w-px flex-1 bg-border mt-2" />}
                        </div>
                        <div className="flex-1 pb-4">
                          <h4 className="text-sm font-medium mb-1">{step.title}</h4>
                          {step.desc && <p className="text-xs text-muted-foreground mb-3">{step.desc}</p>}
                          {step.code && <CodeBlock code={step.code} lang="bash" />}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Full Script */}
        <div className="panel">
          <div className="panel-header cursor-pointer" onClick={() => setShowFullScript(!showFullScript)}>
            <FileCode className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">完整安装脚本源码</span>
            <span className="text-xs text-muted-foreground ml-2">llclaw-install.ps1</span>
            <div className="ml-auto">
              {showFullScript ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </div>
          </div>
          {showFullScript && (
            <div className="max-h-96 overflow-y-auto">
              <CodeBlock code={fullScript} lang="PowerShell" />
            </div>
          )}
        </div>

        {/* Uninstall Section */}
        <div className="panel border-destructive/30">
          <div className="panel-header">
            <Trash2 className="w-4 h-4 text-destructive" />
            <span className="text-sm font-medium">一键卸载</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive font-mono ml-2">Uninstall</span>
          </div>
          <div className="p-4 space-y-4">
            <p className="text-sm text-muted-foreground">安全卸载 OpenClaw 及其相关组件，支持选择性卸载和配置备份。</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { icon: Shield, title: "交互式卸载", desc: "逐项确认要卸载的组件", cmd: ".\\uninstall.ps1" },
                { icon: Trash2, title: "仅卸载 OpenClaw", desc: "保留 Node.js 和 WSL2 环境", cmd: ".\\uninstall.ps1 -KeepWSL -KeepNodeJS" },
                { icon: AlertTriangle, title: "完全卸载", desc: "移除所有组件和配置", cmd: ".\\uninstall.ps1 -Full -Unattended" },
                { icon: Download, title: "卸载前备份", desc: "导出配置后再卸载", cmd: '.\\uninstall.ps1 -ExportConfig "C:\\backup\\config.json"' },
              ].map((item) => {
                const ItemIcon = item.icon;
                return (
                  <div key={item.title} className="p-3 rounded-lg border border-border/50 bg-card/30 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <ItemIcon className="w-3.5 h-3.5 text-destructive" />
                      <span className="text-xs font-medium">{item.title}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                    <code className="block text-[11px] font-mono text-destructive/80 bg-destructive/5 px-2 py-1 rounded">{item.cmd}</code>
                  </div>
                );
              })}
            </div>

            <CodeBlock
              code={`# 下载卸载脚本\nirm https://raw.githubusercontent.com/rocketeee/LLclaw/main/scripts/uninstall.ps1 -OutFile uninstall.ps1\n\n# 交互式卸载（推荐）\n.\\uninstall.ps1\n\n# 完全卸载（无人值守）\n.\\uninstall.ps1 -Full -Unattended\n\n# 卸载前导出配置\n.\\uninstall.ps1 -ExportConfig "C:\\backup\\openclaw-config.json"\n\n# 仅卸载 OpenClaw，保留环境\n.\\uninstall.ps1 -KeepWSL -KeepNodeJS\n\n# 同时卸载 Ollama\n.\\uninstall.ps1 -RemoveOllama`}
              title="卸载命令参考"
              lang="PowerShell"
            />

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="gap-2 border-destructive/30 text-destructive hover:bg-destructive/10"
                onClick={() => {
                  const uninstallScript = `#Requires -RunAsAdministrator\n# LLclaw 一键卸载脚本\n# 下载完整版本: https://github.com/rocketeee/LLclaw/blob/main/scripts/uninstall.ps1\nirm https://raw.githubusercontent.com/rocketeee/LLclaw/main/scripts/uninstall.ps1 -OutFile uninstall.ps1\n.\\uninstall.ps1`;
                  const blob = new Blob([uninstallScript], { type: "text/plain" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "llclaw-uninstall.ps1";
                  a.click();
                  URL.revokeObjectURL(url);
                  toast.success("卸载脚本已下载");
                }}
              >
                <Trash2 className="w-3.5 h-3.5" />下载卸载脚本
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={() => {
                  navigator.clipboard.writeText(".\\uninstall.ps1");
                  toast.success("已复制卸载命令");
                }}
              >
                <Copy className="w-3.5 h-3.5" />复制命令
              </Button>
            </div>
          </div>
        </div>

        {/* System Requirements */}
        <div className="panel">
          <div className="panel-header">
            <Monitor className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">系统要求</span>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { label: "操作系统", value: "Windows 11 22H2 或更高版本" },
                { label: "处理器", value: "x64 架构，支持虚拟化" },
                { label: "内存", value: "最低 4GB，推荐 8GB+" },
                { label: "磁盘空间", value: "最低 10GB 可用空间" },
                { label: "运行时", value: "Node.js 22+ (脚本自动安装)" },
                { label: "网络", value: "需要互联网连接 (支持国内镜像)" },
              ].map((req) => (
                <div key={req.label} className="flex items-start gap-2 py-1">
                  <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "oklch(0.72 0.19 155)" }} />
                  <div>
                    <span className="text-sm font-medium">{req.label}</span>
                    <span className="text-xs text-muted-foreground ml-2">{req.value}</span>
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
