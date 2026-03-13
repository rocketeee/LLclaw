#Requires -RunAsAdministrator
<#
.SYNOPSIS
    LLclaw - OpenClaw Windows 11 一键安装脚本
.DESCRIPTION
    自动检测系统环境，安装 WSL2、Node.js 22 和 OpenClaw，
    支持国内镜像加速，配置守护进程自启动。
    支持 15+ 国内外大模型 API 和 Ollama/vLLM 私有化部署。
.PARAMETER NodeVersion
    Node.js 主版本号，默认 22
.PARAMETER OpenClawVersion
    OpenClaw 版本，默认 latest
.PARAMETER Mirror
    镜像源: auto/taobao/tencent/huawei/default
.PARAMETER SkipWSL
    跳过 WSL2 安装（已有 WSL2 环境时使用）
.PARAMETER DockerMode
    使用 Docker 容器化部署
.PARAMETER Unattended
    无人值守模式，跳过所有交互确认
.PARAMETER WithOllama
    同时安装 Ollama 本地模型引擎
.PARAMETER ConfigFile
    指定配置文件路径（用于迁移导入）
.NOTES
    版本: 1.0.0
    项目: https://github.com/rocketeee/LLclaw
    要求: Windows 11 22H2+, PowerShell 5.1+
.EXAMPLE
    # 标准安装
    irm https://raw.githubusercontent.com/rocketeee/LLclaw/main/scripts/install.ps1 | iex

    # 自定义安装
    .\install.ps1 -Mirror taobao -WithOllama -Unattended
#>

param(
    [string]$NodeVersion = "22",
    [string]$OpenClawVersion = "latest",
    [string]$Mirror = "auto",
    [switch]$SkipWSL,
    [switch]$DockerMode,
    [switch]$Unattended,
    [switch]$WithOllama,
    [string]$ConfigFile = ""
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
$script:StartTime = Get-Date
$script:LogFile = "$env:TEMP\llclaw-install-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"

# ===== 颜色输出函数 =====
function Write-Step  { param($msg) $ts = Get-Date -Format "HH:mm:ss"; Write-Host "[$ts] [LLclaw] " -ForegroundColor Cyan -NoNewline; Write-Host $msg; Add-Content $script:LogFile "[$ts] [STEP] $msg" }
function Write-OK    { param($msg) $ts = Get-Date -Format "HH:mm:ss"; Write-Host "[$ts] [  OK  ] " -ForegroundColor Green -NoNewline; Write-Host $msg; Add-Content $script:LogFile "[$ts] [OK] $msg" }
function Write-Warn  { param($msg) $ts = Get-Date -Format "HH:mm:ss"; Write-Host "[$ts] [ WARN ] " -ForegroundColor Yellow -NoNewline; Write-Host $msg; Add-Content $script:LogFile "[$ts] [WARN] $msg" }
function Write-Err   { param($msg) $ts = Get-Date -Format "HH:mm:ss"; Write-Host "[$ts] [ERROR ] " -ForegroundColor Red -NoNewline; Write-Host $msg; Add-Content $script:LogFile "[$ts] [ERROR] $msg" }
function Write-Info  { param($msg) $ts = Get-Date -Format "HH:mm:ss"; Write-Host "[$ts] [ INFO ] " -ForegroundColor DarkGray -NoNewline; Write-Host $msg; Add-Content $script:LogFile "[$ts] [INFO] $msg" }

# ===== Banner =====
function Show-Banner {
    Write-Host ""
    Write-Host "  ╔═══════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "  ║                                                       ║" -ForegroundColor Cyan
    Write-Host "  ║   LLclaw - OpenClaw Windows 11 一键部署工具 v1.0.0   ║" -ForegroundColor Cyan
    Write-Host "  ║                                                       ║" -ForegroundColor Cyan
    Write-Host "  ║   支持 15+ 国内外大模型 | Ollama/vLLM 私有化部署     ║" -ForegroundColor Cyan
    Write-Host "  ║   GitHub: github.com/rocketeee/LLclaw                ║" -ForegroundColor Cyan
    Write-Host "  ║                                                       ║" -ForegroundColor Cyan
    Write-Host "  ╚═══════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
}

# ===== 系统检测 =====
function Test-SystemRequirements {
    Write-Step "正在检测系统环境..."

    # Windows 版本检查
    $os = Get-CimInstance Win32_OperatingSystem
    $build = [int]$os.BuildNumber
    if ($build -lt 22000) {
        Write-Err "需要 Windows 11 (Build 22000+)，当前版本: Build $build"
        Write-Err "请升级到 Windows 11 后重试"
        exit 1
    }
    Write-OK "Windows 11 Build $build ✓"

    # 架构检查
    if ($env:PROCESSOR_ARCHITECTURE -ne "AMD64") {
        Write-Err "需要 64 位 (x64) 系统，当前: $($env:PROCESSOR_ARCHITECTURE)"
        exit 1
    }
    Write-OK "系统架构: x64 ✓"

    # 管理员权限检查
    $isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    if (-not $isAdmin) {
        Write-Err "需要管理员权限运行此脚本"
        Write-Err "请右键 PowerShell 选择「以管理员身份运行」"
        exit 1
    }
    Write-OK "管理员权限 ✓"

    # 内存检查
    $ram = [math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB, 1)
    if ($ram -lt 4) {
        Write-Warn "内存不足 4GB (当前 $ram GB)，可能影响性能"
    } else {
        Write-OK "物理内存: $ram GB ✓"
    }

    # 磁盘空间检查
    $disk = Get-PSDrive C
    $freeGB = [math]::Round($disk.Free / 1GB, 1)
    if ($freeGB -lt 10) {
        Write-Warn "C 盘剩余空间不足 10GB (当前 $freeGB GB)"
        if (-not $Unattended) {
            $continue = Read-Host "是否继续安装? (y/N)"
            if ($continue -ne "y") { exit 0 }
        }
    } else {
        Write-OK "磁盘空间: $freeGB GB 可用 ✓"
    }

    # 虚拟化检查
    try {
        $hyperv = Get-CimInstance -ClassName Win32_ComputerSystem | Select-Object -ExpandProperty HypervisorPresent
        if ($hyperv) {
            Write-OK "虚拟化: 已启用 ✓"
        } else {
            Write-Warn "虚拟化可能未启用，WSL2 需要硬件虚拟化支持"
            Write-Info "请在 BIOS 中启用 Intel VT-x 或 AMD-V"
        }
    } catch {
        Write-Info "无法检测虚拟化状态"
    }

    # 网络检查
    try {
        $null = Invoke-WebRequest -Uri "https://www.baidu.com" -TimeoutSec 5 -UseBasicParsing
        Write-OK "网络连接: 正常 ✓"
    } catch {
        try {
            $null = Invoke-WebRequest -Uri "https://www.google.com" -TimeoutSec 5 -UseBasicParsing
            Write-OK "网络连接: 正常 (国际) ✓"
        } catch {
            Write-Err "无法连接互联网，请检查网络设置"
            exit 1
        }
    }
}

# ===== 镜像源检测 =====
function Get-BestMirror {
    if ($Mirror -ne "auto") {
        Write-Info "使用指定镜像源: $Mirror"
        return $Mirror
    }

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
            $null = Invoke-WebRequest -Uri $mirrors[$name] -TimeoutSec 5 -UseBasicParsing
            $sw.Stop()
            $ms = $sw.ElapsedMilliseconds
            Write-Info "  $name : ${ms}ms"
            if ($ms -lt $bestTime) {
                $bestTime = $ms
                $best = $name
            }
        } catch {
            Write-Info "  $name : 超时"
        }
    }

    Write-OK "最佳镜像源: $best (${bestTime}ms)"
    return $best
}

# ===== WSL2 安装 =====
function Install-WSL2 {
    if ($SkipWSL) {
        Write-Step "跳过 WSL2 安装 (--SkipWSL)"
        return
    }

    Write-Step "正在检查 WSL2 状态..."

    # 检查 WSL 是否已安装
    try {
        $wslList = wsl --list --quiet 2>&1
        if ($LASTEXITCODE -eq 0 -and $wslList) {
            Write-OK "WSL2 已安装，检测到发行版:"
            wsl --list --verbose 2>&1 | ForEach-Object { Write-Info "  $_" }
            return
        }
    } catch {}

    Write-Step "正在安装 WSL2 和 Ubuntu 24.04..."
    Write-Info "这可能需要几分钟，请耐心等待..."

    # 启用 WSL 功能
    try {
        dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart 2>&1 | Out-Null
        dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart 2>&1 | Out-Null
        Write-OK "WSL 功能已启用"
    } catch {
        Write-Warn "WSL 功能启用可能需要重启"
    }

    # 安装 WSL
    wsl --install -d Ubuntu-24.04 --no-launch 2>&1 | ForEach-Object { Write-Info "  $_" }

    if ($LASTEXITCODE -ne 0) {
        Write-Warn "WSL 安装可能需要重启计算机"
        Write-Info "重启后请重新运行此脚本"
        
        if (-not $Unattended) {
            $restart = Read-Host "是否立即重启? (y/N)"
            if ($restart -eq "y") {
                Write-Step "正在重启计算机..."
                Restart-Computer -Force
            }
        }
        exit 0
    }

    Write-OK "WSL2 + Ubuntu 24.04 安装完成 ✓"
}

# ===== Node.js 安装 =====
function Install-NodeJS {
    Write-Step "正在在 WSL 中安装 Node.js $NodeVersion..."

    $mirror = Get-BestMirror
    $nodeSourceMirror = ""
    if ($mirror -eq "taobao") {
        $nodeSourceMirror = "https://npmmirror.com/mirrors/node/"
    }

    $installScript = @"
#!/bin/bash
set -e

# 检查是否已安装正确版本
if command -v node &>/dev/null; then
    CURRENT=`$(node --version | cut -d'.' -f1 | tr -d 'v')
    if [ "`$CURRENT" -ge "$NodeVersion" ]; then
        echo "[OK] Node.js `$(node --version) 已安装"
        echo "[OK] npm `$(npm --version)"
        exit 0
    fi
fi

echo "[LLclaw] 安装 Node.js $NodeVersion..."

# 更新包管理器
sudo apt-get update -qq

# 使用 NodeSource 安装
curl -fsSL https://deb.nodesource.com/setup_${NodeVersion}.x | sudo -E bash -
sudo apt-get install -y nodejs

# 配置 npm 镜像
if [ "$mirror" = "taobao" ]; then
    npm config set registry https://registry.npmmirror.com
    echo "[OK] npm 镜像已设置为淘宝源"
fi

echo "[OK] Node.js `$(node --version) 安装完成"
echo "[OK] npm `$(npm --version)"
"@

    $installScript | wsl bash 2>&1 | ForEach-Object { Write-Info "  $_" }

    if ($LASTEXITCODE -ne 0) {
        Write-Err "Node.js 安装失败"
        Write-Info "请尝试手动安装: wsl 后执行 curl -fsSL https://deb.nodesource.com/setup_${NodeVersion}.x | sudo -E bash -"
        exit 1
    }
    Write-OK "Node.js $NodeVersion 安装完成 ✓"
}

# ===== OpenClaw 安装 =====
function Install-OpenClaw {
    Write-Step "正在安装 OpenClaw $OpenClawVersion..."

    $mirror = Get-BestMirror
    $registryFlag = ""
    if ($mirror -eq "taobao") {
        $registryFlag = "--registry https://registry.npmmirror.com"
    }

    $installScript = @"
#!/bin/bash
set -e

echo "[LLclaw] 安装 OpenClaw..."
npm install -g openclaw@$OpenClawVersion $registryFlag 2>&1

echo "[OK] OpenClaw 安装完成"

# 创建配置目录
mkdir -p ~/.openclaw
mkdir -p ~/.openclaw/backups
mkdir -p ~/.openclaw/logs

# 生成默认配置
if [ ! -f ~/.openclaw/openclaw.json ]; then
    cat > ~/.openclaw/openclaw.json << 'CONF'
{
  "`$schema": "https://raw.githubusercontent.com/rocketeee/LLclaw/main/schemas/config.schema.json",
  "version": "1.0.0",
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
      "apiKey": "YOUR_API_KEY_HERE",
      "model": "deepseek-chat"
    }
  },
  "channels": {},
  "skills": [],
  "security": {
    "dmPolicy": "pairing",
    "sandboxMode": "non-main"
  }
}
CONF
    echo "[OK] 默认配置已生成: ~/.openclaw/openclaw.json"
fi

echo "[LLclaw] 运行安装向导..."
openclaw onboard --install-daemon 2>&1 || echo "[WARN] 安装向导跳过（可稍后运行 openclaw onboard）"
"@

    $installScript | wsl bash 2>&1 | ForEach-Object { Write-Info "  $_" }

    Write-OK "OpenClaw 安装完成 ✓"
}

# ===== Ollama 安装（可选）=====
function Install-Ollama {
    if (-not $WithOllama) { return }

    Write-Step "正在安装 Ollama 本地模型引擎..."

    $installScript = @"
#!/bin/bash
set -e

# 检查是否已安装
if command -v ollama &>/dev/null; then
    echo "[OK] Ollama 已安装: `$(ollama --version)"
    exit 0
fi

echo "[LLclaw] 下载并安装 Ollama..."
curl -fsSL https://ollama.com/install.sh | sh

echo "[OK] Ollama 安装完成"

# 启动 Ollama 服务
echo "[LLclaw] 启动 Ollama 服务..."
ollama serve &>/dev/null &
sleep 2

echo "[LLclaw] 拉取推荐模型 (qwen2.5:7b)..."
ollama pull qwen2.5:7b 2>&1 || echo "[WARN] 模型拉取失败，可稍后手动执行: ollama pull qwen2.5:7b"

echo "[OK] Ollama 安装完成"
"@

    $installScript | wsl bash 2>&1 | ForEach-Object { Write-Info "  $_" }

    Write-OK "Ollama 安装完成 ✓"
}

# ===== 配置导入 =====
function Import-Config {
    if (-not $ConfigFile) { return }

    Write-Step "正在导入配置文件: $ConfigFile"

    if (-not (Test-Path $ConfigFile)) {
        Write-Err "配置文件不存在: $ConfigFile"
        return
    }

    try {
        $config = Get-Content $ConfigFile -Raw | ConvertFrom-Json
        Write-OK "配置文件解析成功"

        # 将配置复制到 WSL
        $wslPath = wsl wslpath -u (Resolve-Path $ConfigFile).Path
        $copyScript = "cp '$wslPath' ~/.openclaw/openclaw.json && echo '[OK] 配置已导入'"
        $copyScript | wsl bash 2>&1 | ForEach-Object { Write-Info "  $_" }

        Write-OK "配置导入完成 ✓"
    } catch {
        Write-Err "配置文件格式无效: $_"
    }
}

# ===== Docker 部署模式 =====
function Install-DockerMode {
    if (-not $DockerMode) { return }

    Write-Step "使用 Docker 容器化部署模式..."

    # 检查 Docker
    try {
        $dockerVersion = docker --version 2>&1
        Write-OK "Docker 已安装: $dockerVersion"
    } catch {
        Write-Err "Docker 未安装，请先安装 Docker Desktop"
        Write-Info "下载地址: https://www.docker.com/products/docker-desktop/"
        exit 1
    }

    # 创建部署目录
    $deployDir = "$env:USERPROFILE\openclaw-deploy"
    if (-not (Test-Path $deployDir)) {
        New-Item -ItemType Directory -Path $deployDir -Force | Out-Null
    }

    # 生成 docker-compose.yml
    $composeContent = @"
version: '3.8'

services:
  openclaw:
    image: openclaw/openclaw:latest
    container_name: openclaw-gateway
    restart: unless-stopped
    ports:
      - "18789:18789"
    volumes:
      - ./config:/root/.openclaw
      - ./logs:/root/.openclaw/logs
    environment:
      - NODE_ENV=production
      - OPENCLAW_PORT=18789
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:18789/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  ollama:
    image: ollama/ollama:latest
    container_name: ollama-engine
    restart: unless-stopped
    ports:
      - "11434:11434"
    volumes:
      - ollama-data:/root/.ollama
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]

volumes:
  ollama-data:
"@

    $composeContent | Set-Content "$deployDir\docker-compose.yml"
    Write-OK "docker-compose.yml 已生成: $deployDir"

    # 创建配置目录
    New-Item -ItemType Directory -Path "$deployDir\config" -Force | Out-Null
    New-Item -ItemType Directory -Path "$deployDir\logs" -Force | Out-Null

    Write-Step "启动 Docker 容器..."
    Push-Location $deployDir
    docker compose up -d 2>&1 | ForEach-Object { Write-Info "  $_" }
    Pop-Location

    Write-OK "Docker 部署完成 ✓"
    Write-Info "部署目录: $deployDir"
}

# ===== 安装后验证 =====
function Test-Installation {
    Write-Step "正在验证安装..."

    $verifyScript = @"
#!/bin/bash
echo "--- 安装验证 ---"

# Node.js
if command -v node &>/dev/null; then
    echo "[OK] Node.js: `$(node --version)"
else
    echo "[FAIL] Node.js 未安装"
fi

# npm
if command -v npm &>/dev/null; then
    echo "[OK] npm: `$(npm --version)"
else
    echo "[FAIL] npm 未安装"
fi

# OpenClaw
if command -v openclaw &>/dev/null; then
    echo "[OK] OpenClaw: 已安装"
else
    echo "[WARN] OpenClaw: 未检测到（可能需要重新打开终端）"
fi

# Ollama
if command -v ollama &>/dev/null; then
    echo "[OK] Ollama: `$(ollama --version 2>&1 || echo '已安装')"
else
    echo "[INFO] Ollama: 未安装（可选组件）"
fi

# 配置文件
if [ -f ~/.openclaw/openclaw.json ]; then
    echo "[OK] 配置文件: ~/.openclaw/openclaw.json"
else
    echo "[WARN] 配置文件不存在"
fi

echo "--- 验证完成 ---"
"@

    $verifyScript | wsl bash 2>&1 | ForEach-Object {
        if ($_ -match "^\[OK\]") { Write-OK ($_ -replace "^\[OK\] ", "") }
        elseif ($_ -match "^\[FAIL\]") { Write-Err ($_ -replace "^\[FAIL\] ", "") }
        elseif ($_ -match "^\[WARN\]") { Write-Warn ($_ -replace "^\[WARN\] ", "") }
        elseif ($_ -match "^\[INFO\]") { Write-Info ($_ -replace "^\[INFO\] ", "") }
        else { Write-Info "  $_" }
    }
}

# ===== 显示完成信息 =====
function Show-Completion {
    $elapsed = (Get-Date) - $script:StartTime
    $minutes = [math]::Floor($elapsed.TotalMinutes)
    $seconds = $elapsed.Seconds

    Write-Host ""
    Write-Host "  ╔═══════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "  ║                                                       ║" -ForegroundColor Green
    Write-Host "  ║           LLclaw 安装完成！                          ║" -ForegroundColor Green
    Write-Host "  ║                                                       ║" -ForegroundColor Green
    Write-Host "  ╚═══════════════════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host ""
    Write-Host "  安装耗时: ${minutes}分${seconds}秒" -ForegroundColor Gray
    Write-Host "  安装日志: $script:LogFile" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  ┌─ 下一步操作 ─────────────────────────────────────────┐" -ForegroundColor Yellow
    Write-Host "  │                                                       │" -ForegroundColor Yellow
    Write-Host "  │  1. 进入 WSL:                                        │" -ForegroundColor Yellow
    Write-Host "  │     wsl                                               │" -ForegroundColor Gray
    Write-Host "  │                                                       │" -ForegroundColor Yellow
    Write-Host "  │  2. 配置模型 API Key:                                │" -ForegroundColor Yellow
    Write-Host "  │     nano ~/.openclaw/openclaw.json                    │" -ForegroundColor Gray
    Write-Host "  │                                                       │" -ForegroundColor Yellow
    Write-Host "  │  3. 启动 Gateway:                                    │" -ForegroundColor Yellow
    Write-Host "  │     openclaw gateway --verbose                        │" -ForegroundColor Gray
    Write-Host "  │                                                       │" -ForegroundColor Yellow
    Write-Host "  │  4. 访问监控面板:                                    │" -ForegroundColor Yellow
    Write-Host "  │     http://localhost:18789                            │" -ForegroundColor Gray
    Write-Host "  │                                                       │" -ForegroundColor Yellow
    Write-Host "  └───────────────────────────────────────────────────────┘" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  支持的大模型:" -ForegroundColor Cyan
    Write-Host "  国内: DeepSeek | 通义千问 | 文心一言 | 智谱GLM | Moonshot" -ForegroundColor Gray
    Write-Host "        百川 | 腾讯混元 | 讯飞星火 | 豆包 | MiniMax" -ForegroundColor Gray
    Write-Host "  国际: OpenAI | Claude | Gemini" -ForegroundColor Gray
    Write-Host "  私有: Ollama | vLLM | 自定义端点" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  文档: https://github.com/rocketeee/LLclaw" -ForegroundColor DarkGray
    Write-Host ""
}

# ===== 主流程 =====
Show-Banner

if ($DockerMode) {
    Test-SystemRequirements
    Install-DockerMode
} else {
    Test-SystemRequirements
    Install-WSL2
    Install-NodeJS
    Install-OpenClaw
    Install-Ollama
    Import-Config
    Test-Installation
}

Show-Completion
