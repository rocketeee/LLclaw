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
    版本: 1.4.0
    项目: https://github.com/rocketeee/LLclaw
    要求: Windows 11 22H2+, PowerShell 5.1+
.EXAMPLE
    irm https://raw.githubusercontent.com/rocketeee/LLclaw/main/scripts/install.ps1 | iex
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

# ===== 编码修复：强制 UTF-8 输出 =====
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$env:WSL_UTF8 = "1"
$OutputEncoding = [System.Text.Encoding]::UTF8

# ===== 颜色输出函数 =====
function Write-Step  { param($msg) $ts = Get-Date -Format "HH:mm:ss"; Write-Host "[$ts] [LLclaw] " -ForegroundColor Cyan -NoNewline; Write-Host $msg; Add-Content $script:LogFile "[$ts] [STEP] $msg" }
function Write-OK    { param($msg) $ts = Get-Date -Format "HH:mm:ss"; Write-Host "[$ts] [  OK  ] " -ForegroundColor Green -NoNewline; Write-Host $msg; Add-Content $script:LogFile "[$ts] [OK] $msg" }
function Write-Warn  { param($msg) $ts = Get-Date -Format "HH:mm:ss"; Write-Host "[$ts] [ WARN ] " -ForegroundColor Yellow -NoNewline; Write-Host $msg; Add-Content $script:LogFile "[$ts] [WARN] $msg" }
function Write-Err   { param($msg) $ts = Get-Date -Format "HH:mm:ss"; Write-Host "[$ts] [ERROR ] " -ForegroundColor Red -NoNewline; Write-Host $msg; Add-Content $script:LogFile "[$ts] [ERROR] $msg" }
function Write-Info  { param($msg) $ts = Get-Date -Format "HH:mm:ss"; Write-Host "[$ts] [ INFO ] " -ForegroundColor DarkGray -NoNewline; Write-Host $msg; Add-Content $script:LogFile "[$ts] [INFO] $msg" }

# ===== 安全执行 WSL bash 脚本 =====
function Invoke-WslScript {
    param(
        [string[]]$Lines,
        [string]$Description = "WSL script"
    )

    $scriptContent = ($Lines -join "`n") + "`n"

    $tempFile = Join-Path $env:TEMP ("llclaw_" + [System.IO.Path]::GetRandomFileName() + ".sh")
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($tempFile, $scriptContent, $utf8NoBom)

    $driveLetter = $tempFile.Substring(0, 1).ToLower()
    $restPath = $tempFile.Substring(2).Replace('\', '/')
    $wslFilePath = "/mnt/$driveLetter$restPath"
    $wslTempPath = "/tmp/llclaw_" + (Get-Random) + ".sh"

    try {
        wsl -- bash -c "cp '$wslFilePath' '$wslTempPath' && chmod +x '$wslTempPath' && bash '$wslTempPath' 2>&1; EC=`$?; rm -f '$wslTempPath'; exit `$EC" 2>&1 | ForEach-Object {
            $line = $_.ToString()
            if ($line -match "^\[OK\]") { Write-OK ($line -replace "^\[OK\]\s*", "") }
            elseif ($line -match "^\[FAIL\]") { Write-Err ($line -replace "^\[FAIL\]\s*", "") }
            elseif ($line -match "^\[WARN\]") { Write-Warn ($line -replace "^\[WARN\]\s*", "") }
            elseif ($line -match "^\[LLclaw\]") { Write-Step ($line -replace "^\[LLclaw\]\s*", "") }
            elseif ($line.Trim() -match "^\d+$") { <# 忽略纯数字行（退出码） #> }
            else { Write-Info "  $line" }
        }
    } catch {
        Write-Err "WSL 脚本执行失败: $_"
    } finally {
        Remove-Item $tempFile -Force -ErrorAction SilentlyContinue
    }
}

# ===== Banner =====
function Show-Banner {
    Write-Host ""
    Write-Host "  =========================================================" -ForegroundColor Cyan
    Write-Host "                                                             " -ForegroundColor Cyan
    Write-Host "    LLclaw - OpenClaw Windows 11 一键部署工具 v1.4.0        " -ForegroundColor Cyan
    Write-Host "                                                             " -ForegroundColor Cyan
    Write-Host "    支持 15+ 国内外大模型 | Ollama/vLLM 私有化部署          " -ForegroundColor Cyan
    Write-Host "    多智能体协同 | 实时监控 | 可移植配置                     " -ForegroundColor Cyan
    Write-Host "    GitHub: github.com/rocketeee/LLclaw                     " -ForegroundColor Cyan
    Write-Host "                                                             " -ForegroundColor Cyan
    Write-Host "  =========================================================" -ForegroundColor Cyan
    Write-Host ""
}

# ===== 系统检测 =====
function Test-SystemRequirements {
    Write-Step "正在检测系统环境..."

    $os = Get-CimInstance Win32_OperatingSystem
    $build = [int]$os.BuildNumber
    if ($build -lt 22000) {
        Write-Err "需要 Windows 11 (Build 22000+), 当前版本: Build $build"
        exit 1
    }
    Write-OK "Windows 11 Build $build"

    if ($env:PROCESSOR_ARCHITECTURE -ne "AMD64") {
        Write-Err "需要 64 位 (x64) 系统, 当前: $($env:PROCESSOR_ARCHITECTURE)"
        exit 1
    }
    Write-OK "系统架构: x64"

    $isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    if (-not $isAdmin) {
        Write-Err "需要管理员权限运行此脚本"
        Write-Err "请右键 PowerShell 选择「以管理员身份运行」"
        exit 1
    }
    Write-OK "管理员权限"

    $ram = [math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB, 1)
    if ($ram -lt 4) {
        Write-Warn "内存不足 4GB (当前 $ram GB), 可能影响性能"
    } else {
        Write-OK "物理内存: $ram GB"
    }

    $disk = Get-PSDrive C
    $freeGB = [math]::Round($disk.Free / 1GB, 1)
    if ($freeGB -lt 10) {
        Write-Warn "C 盘剩余空间不足 10GB (当前 $freeGB GB)"
        if (-not $Unattended) {
            $continue = Read-Host "是否继续安装? (y/N)"
            if ($continue -ne "y") { exit 0 }
        }
    } else {
        Write-OK "磁盘空间: $freeGB GB 可用"
    }

    try {
        $hyperv = Get-CimInstance -ClassName Win32_ComputerSystem | Select-Object -ExpandProperty HypervisorPresent
        if ($hyperv) {
            Write-OK "虚拟化: 已启用"
        } else {
            Write-Warn "虚拟化可能未启用, WSL2 需要硬件虚拟化支持"
            Write-Info "请在 BIOS 中启用 Intel VT-x 或 AMD-V"
        }
    } catch {
        Write-Info "无法检测虚拟化状态"
    }

    try {
        $null = Invoke-WebRequest -Uri "https://www.baidu.com" -TimeoutSec 5 -UseBasicParsing
        Write-OK "网络连接: 正常"
    } catch {
        try {
            $null = Invoke-WebRequest -Uri "https://www.google.com" -TimeoutSec 5 -UseBasicParsing
            Write-OK "网络连接: 正常 (国际)"
        } catch {
            Write-Err "无法连接互联网, 请检查网络设置"
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

    try {
        $wslList = wsl --list --quiet 2>&1
        if ($LASTEXITCODE -eq 0 -and $wslList) {
            Write-OK "WSL2 已安装, 检测到发行版:"
            wsl --list --verbose 2>&1 | ForEach-Object {
                $line = $_.ToString().Trim()
                if ($line) { Write-Info "  $line" }
            }
            return
        }
    } catch {}

    Write-Step "正在安装 WSL2 和 Ubuntu 24.04..."
    Write-Info "这可能需要几分钟, 请耐心等待..."

    try {
        dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart 2>&1 | Out-Null
        dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart 2>&1 | Out-Null
        Write-OK "WSL 功能已启用"
    } catch {
        Write-Warn "WSL 功能启用可能需要重启"
    }

    wsl --install -d Ubuntu-24.04 --no-launch 2>&1 | ForEach-Object {
        $line = $_.ToString().Trim()
        if ($line) { Write-Info "  $line" }
    }

    if ($LASTEXITCODE -ne 0) {
        Write-Warn "WSL 安装可能需要重启计算机后才能完成"
        Write-Info "重启后请重新运行此脚本 (加 -SkipWSL 参数跳过 WSL 安装步骤)"
        if (-not $Unattended) {
            $restart = Read-Host "是否立即重启? (y/N)"
            if ($restart -eq "y") {
                Write-Step "正在重启计算机..."
                Restart-Computer -Force
            }
        }
        exit 0
    }

    Write-OK "WSL2 + Ubuntu 24.04 安装完成"
}

# ===== Node.js 安装 =====
function Install-NodeJS {
    Write-Step "正在在 WSL 中安装 Node.js $NodeVersion..."

    $mirror = Get-BestMirror
    $npmRegistry = ""
    if ($mirror -eq "taobao") {
        $npmRegistry = "https://registry.npmmirror.com"
    }

    $scriptLines = @(
        '#!/bin/bash'
        'set -e'
        ''
        'if command -v node &>/dev/null; then'
        '    CURRENT=$(node --version | cut -d. -f1 | tr -d v)'
        '    if [ "$CURRENT" -ge "' + $NodeVersion + '" ]; then'
        '        echo "[OK] Node.js $(node --version) 已安装"'
        '        echo "[OK] npm $(npm --version)"'
        '        exit 0'
        '    fi'
        'fi'
        ''
        'echo "[LLclaw] 正在安装 Node.js ' + $NodeVersion + '..."'
        ''
        'sudo apt-get update -qq'
        'curl -fsSL https://deb.nodesource.com/setup_' + $NodeVersion + '.x | sudo -E bash -'
        'sudo apt-get install -y nodejs'
    )

    if ($npmRegistry) {
        $scriptLines += 'npm config set registry ' + $npmRegistry
        $scriptLines += 'echo "[OK] npm 镜像源已设置"'
    }

    $scriptLines += @(
        ''
        'echo "[OK] Node.js $(node --version) 安装完成"'
        'echo "[OK] npm $(npm --version)"'
    )

    Invoke-WslScript -Lines $scriptLines -Description "Node.js installation"

    Write-OK "Node.js $NodeVersion 安装完成"
}

# ===== OpenClaw 安装 =====
function Install-OpenClaw {
    Write-Step "正在安装 OpenClaw $OpenClawVersion..."

    $mirror = Get-BestMirror
    $registryFlag = ""
    if ($mirror -eq "taobao") {
        $registryFlag = "--registry https://registry.npmmirror.com"
    }

    $scriptLines = @(
        '#!/bin/bash'
        'set -e'
        ''
        'echo "[LLclaw] 正在安装 OpenClaw..."'
        'npm install -g openclaw@' + $OpenClawVersion + ' ' + $registryFlag + ' 2>&1'
        ''
        'echo "[OK] OpenClaw 安装完成"'
        ''
        'mkdir -p ~/.openclaw'
        'mkdir -p ~/.openclaw/backups'
        'mkdir -p ~/.openclaw/logs'
        ''
        'if [ ! -f ~/.openclaw/openclaw.json ]; then'
        'cat > ~/.openclaw/openclaw.json << LLCLAW_EOF'
        '{'
        '  "version": "1.4.0",'
        '  "agent": {'
        '    "model": "deepseek/deepseek-chat",'
        '    "thinkingLevel": "medium"'
        '  },'
        '  "gateway": {'
        '    "port": 18789,'
        '    "bind": "127.0.0.1",'
        '    "verbose": true'
        '  },'
        '  "models": {'
        '    "deepseek": {'
        '      "baseUrl": "https://api.deepseek.com/v1",'
        '      "apiKey": "YOUR_API_KEY_HERE",'
        '      "model": "deepseek-chat"'
        '    }'
        '  },'
        '  "multiAgent": {'
        '    "enabled": false,'
        '    "orchestration": "sequential",'
        '    "agents": []'
        '  },'
        '  "channels": {},'
        '  "skills": [],'
        '  "security": {'
        '    "dmPolicy": "pairing",'
        '    "sandboxMode": "non-main"'
        '  }'
        '}'
        'LLCLAW_EOF'
        '    echo "[OK] 默认配置已生成: ~/.openclaw/openclaw.json"'
        'fi'
        ''
        'echo "[LLclaw] 正在运行初始化向导..."'
        'openclaw onboard --install-daemon 2>&1 || echo "[WARN] 初始化向导已跳过 (稍后运行 openclaw onboard)"'
    )

    Invoke-WslScript -Lines $scriptLines -Description "OpenClaw installation"

    Write-OK "OpenClaw 安装完成"
}

# ===== Ollama 安装（可选）=====
function Install-Ollama {
    if (-not $WithOllama) { return }

    Write-Step "正在安装 Ollama 本地模型引擎..."

    $scriptLines = @(
        '#!/bin/bash'
        'set -e'
        ''
        'if command -v ollama &>/dev/null; then'
        '    echo "[OK] Ollama 已安装"'
        '    exit 0'
        'fi'
        ''
        'echo "[LLclaw] 正在下载并安装 Ollama..."'
        'curl -fsSL https://ollama.com/install.sh | sh'
        ''
        'echo "[OK] Ollama 安装完成"'
        ''
        'echo "[LLclaw] 正在启动 Ollama 服务..."'
        'ollama serve &>/dev/null &'
        'sleep 2'
        ''
        'echo "[LLclaw] 正在拉取推荐模型 (qwen2.5:7b)..."'
        'ollama pull qwen2.5:7b 2>&1 || echo "[WARN] 模型拉取失败, 请手动执行: ollama pull qwen2.5:7b"'
        ''
        'echo "[OK] Ollama 配置完成"'
    )

    Invoke-WslScript -Lines $scriptLines -Description "Ollama installation"

    Write-OK "Ollama 安装完成"
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

        $cfgDrive = (Resolve-Path $ConfigFile).Path.Substring(0, 1).ToLower()
        $cfgRest = (Resolve-Path $ConfigFile).Path.Substring(2).Replace('\', '/')
        $wslCfgPath = "/mnt/$cfgDrive$cfgRest"

        $scriptLines = @(
            '#!/bin/bash'
            'cp "' + $wslCfgPath + '" ~/.openclaw/openclaw.json'
            'echo "[OK] 配置已导入: ~/.openclaw/openclaw.json"'
        )
        Invoke-WslScript -Lines $scriptLines -Description "Config import"

        Write-OK "配置导入完成"
    } catch {
        Write-Err "配置文件格式无效: $_"
    }
}

# ===== Docker 部署模式 =====
function Install-DockerMode {
    if (-not $DockerMode) { return }

    Write-Step "使用 Docker 容器化部署模式..."

    try {
        $dockerVersion = docker --version 2>&1
        Write-OK "Docker 已安装: $dockerVersion"
    } catch {
        Write-Err "Docker 未安装, 请先安装 Docker Desktop"
        Write-Info "下载地址: https://www.docker.com/products/docker-desktop/"
        exit 1
    }

    $deployDir = "$env:USERPROFILE\openclaw-deploy"
    if (-not (Test-Path $deployDir)) {
        New-Item -ItemType Directory -Path $deployDir -Force | Out-Null
    }

    $composeLines = @(
        'version: "3.8"'
        ''
        'services:'
        '  openclaw:'
        '    image: openclaw/openclaw:latest'
        '    container_name: openclaw-gateway'
        '    restart: unless-stopped'
        '    ports:'
        '      - "18789:18789"'
        '    volumes:'
        '      - ./config:/root/.openclaw'
        '      - ./logs:/root/.openclaw/logs'
        '    environment:'
        '      - NODE_ENV=production'
        '      - OPENCLAW_PORT=18789'
        '    healthcheck:'
        '      test: ["CMD", "curl", "-f", "http://localhost:18789/health"]'
        '      interval: 30s'
        '      timeout: 10s'
        '      retries: 3'
        ''
        '  ollama:'
        '    image: ollama/ollama:latest'
        '    container_name: ollama-engine'
        '    restart: unless-stopped'
        '    ports:'
        '      - "11434:11434"'
        '    volumes:'
        '      - ollama-data:/root/.ollama'
        ''
        'volumes:'
        '  ollama-data:'
    )

    ($composeLines -join "`n") | Set-Content "$deployDir\docker-compose.yml" -Encoding UTF8
    Write-OK "docker-compose.yml 已生成: $deployDir"

    New-Item -ItemType Directory -Path "$deployDir\config" -Force | Out-Null
    New-Item -ItemType Directory -Path "$deployDir\logs" -Force | Out-Null

    Write-Step "正在启动 Docker 容器..."
    Push-Location $deployDir
    docker compose up -d 2>&1 | ForEach-Object { Write-Info "  $_" }
    Pop-Location

    Write-OK "Docker 部署完成"
    Write-Info "部署目录: $deployDir"
}

# ===== 安装后验证 =====
function Test-Installation {
    Write-Step "正在验证安装..."

    $scriptLines = @(
        '#!/bin/bash'
        ''
        'if command -v node &>/dev/null; then'
        '    echo "[OK] Node.js: $(node --version)"'
        'else'
        '    echo "[FAIL] Node.js 未安装"'
        'fi'
        ''
        'if command -v npm &>/dev/null; then'
        '    echo "[OK] npm: $(npm --version)"'
        'else'
        '    echo "[FAIL] npm 未安装"'
        'fi'
        ''
        'if command -v openclaw &>/dev/null; then'
        '    echo "[OK] OpenClaw: 已安装"'
        'else'
        '    echo "[WARN] OpenClaw: 未检测到 (可能需要重新打开终端)"'
        'fi'
        ''
        'if command -v ollama &>/dev/null; then'
        '    echo "[OK] Ollama: 已安装"'
        'else'
        '    echo "[INFO] Ollama: 未安装 (可选组件)"'
        'fi'
        ''
        'if [ -f ~/.openclaw/openclaw.json ]; then'
        '    echo "[OK] 配置文件: ~/.openclaw/openclaw.json"'
        'else'
        '    echo "[WARN] 配置文件未找到"'
        'fi'
    )

    Invoke-WslScript -Lines $scriptLines -Description "Installation verification"
}

# ===== 显示完成信息 =====
function Show-Completion {
    $elapsed = (Get-Date) - $script:StartTime
    $minutes = [math]::Floor($elapsed.TotalMinutes)
    $seconds = $elapsed.Seconds

    Write-Host ""
    Write-Host "  =========================================================" -ForegroundColor Green
    Write-Host "              LLclaw 安装完成!                               " -ForegroundColor Green
    Write-Host "  =========================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "  安装耗时: ${minutes}分${seconds}秒" -ForegroundColor Gray
    Write-Host "  安装日志: $script:LogFile" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  --- 下一步操作 ---" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  1. 进入 WSL:" -ForegroundColor Yellow
    Write-Host "     wsl" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  2. 配置模型 API Key:" -ForegroundColor Yellow
    Write-Host "     nano ~/.openclaw/openclaw.json" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  3. 启动 Gateway:" -ForegroundColor Yellow
    Write-Host "     openclaw gateway --verbose" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  4. 访问监控面板:" -ForegroundColor Yellow
    Write-Host "     http://localhost:18789" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  --- 支持的大模型 ---" -ForegroundColor Cyan
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
