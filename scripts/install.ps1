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
    版本: 1.3.0
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

# ===== 修复编码：强制 UTF-8 输出 =====
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

    # 用换行符拼接脚本行
    $scriptContent = ($Lines -join "`n") + "`n"

    # 创建临时文件，使用 UTF-8 无 BOM 编码
    $tempFile = Join-Path $env:TEMP ("llclaw_" + [System.IO.Path]::GetRandomFileName() + ".sh")
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($tempFile, $scriptContent, $utf8NoBom)

    # 手动将 Windows 路径转为 WSL /mnt/ 路径
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
            else { Write-Info "  $line" }
        }
        return $LASTEXITCODE
    } catch {
        Write-Err "WSL script failed: $_"
        return 1
    } finally {
        Remove-Item $tempFile -Force -ErrorAction SilentlyContinue
    }
}

# ===== Banner =====
function Show-Banner {
    Write-Host ""
    Write-Host "  =========================================================" -ForegroundColor Cyan
    Write-Host "                                                             " -ForegroundColor Cyan
    Write-Host "    LLclaw - OpenClaw Windows 11 Deploy Tool v1.3.0         " -ForegroundColor Cyan
    Write-Host "                                                             " -ForegroundColor Cyan
    Write-Host "    15+ LLM Models | Ollama/vLLM Private Deploy             " -ForegroundColor Cyan
    Write-Host "    Multi-Agent | Real-time Monitor | Portable Config       " -ForegroundColor Cyan
    Write-Host "    GitHub: github.com/rocketeee/LLclaw                     " -ForegroundColor Cyan
    Write-Host "                                                             " -ForegroundColor Cyan
    Write-Host "  =========================================================" -ForegroundColor Cyan
    Write-Host ""
}

# ===== 系统检测 =====
function Test-SystemRequirements {
    Write-Step "Checking system requirements..."

    $os = Get-CimInstance Win32_OperatingSystem
    $build = [int]$os.BuildNumber
    if ($build -lt 22000) {
        Write-Err "Windows 11 (Build 22000+) required, current: Build $build"
        exit 1
    }
    Write-OK "Windows 11 Build $build"

    if ($env:PROCESSOR_ARCHITECTURE -ne "AMD64") {
        Write-Err "64-bit (x64) system required, current: $($env:PROCESSOR_ARCHITECTURE)"
        exit 1
    }
    Write-OK "Architecture: x64"

    $isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    if (-not $isAdmin) {
        Write-Err "Administrator privileges required"
        exit 1
    }
    Write-OK "Administrator privileges"

    $ram = [math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB, 1)
    if ($ram -lt 4) {
        Write-Warn "RAM less than 4GB ($ram GB), may affect performance"
    } else {
        Write-OK "RAM: $ram GB"
    }

    $disk = Get-PSDrive C
    $freeGB = [math]::Round($disk.Free / 1GB, 1)
    if ($freeGB -lt 10) {
        Write-Warn "Disk space less than 10GB ($freeGB GB free)"
        if (-not $Unattended) {
            $continue = Read-Host "Continue installation? (y/N)"
            if ($continue -ne "y") { exit 0 }
        }
    } else {
        Write-OK "Disk space: $freeGB GB free"
    }

    try {
        $hyperv = Get-CimInstance -ClassName Win32_ComputerSystem | Select-Object -ExpandProperty HypervisorPresent
        if ($hyperv) {
            Write-OK "Virtualization: enabled"
        } else {
            Write-Warn "Virtualization may not be enabled, WSL2 requires hardware virtualization"
        }
    } catch {
        Write-Info "Cannot detect virtualization status"
    }

    try {
        $null = Invoke-WebRequest -Uri "https://www.baidu.com" -TimeoutSec 5 -UseBasicParsing
        Write-OK "Network: connected"
    } catch {
        try {
            $null = Invoke-WebRequest -Uri "https://www.google.com" -TimeoutSec 5 -UseBasicParsing
            Write-OK "Network: connected (international)"
        } catch {
            Write-Err "No internet connection"
            exit 1
        }
    }
}

# ===== 镜像源检测 =====
function Get-BestMirror {
    if ($Mirror -ne "auto") {
        Write-Info "Using specified mirror: $Mirror"
        return $Mirror
    }

    Write-Step "Detecting best mirror..."
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
            Write-Info "  $name : timeout"
        }
    }

    Write-OK "Best mirror: $best (${bestTime}ms)"
    return $best
}

# ===== WSL2 安装 =====
function Install-WSL2 {
    if ($SkipWSL) {
        Write-Step "Skipping WSL2 installation (--SkipWSL)"
        return
    }

    Write-Step "Checking WSL2 status..."

    try {
        $wslList = wsl --list --quiet 2>&1
        if ($LASTEXITCODE -eq 0 -and $wslList) {
            Write-OK "WSL2 installed, distributions found:"
            wsl --list --verbose 2>&1 | ForEach-Object {
                $line = $_.ToString().Trim()
                if ($line) { Write-Info "  $line" }
            }
            return
        }
    } catch {}

    Write-Step "Installing WSL2 and Ubuntu 24.04..."
    Write-Info "This may take a few minutes..."

    try {
        dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart 2>&1 | Out-Null
        dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart 2>&1 | Out-Null
        Write-OK "WSL features enabled"
    } catch {
        Write-Warn "WSL features may require a restart"
    }

    wsl --install -d Ubuntu-24.04 --no-launch 2>&1 | ForEach-Object {
        $line = $_.ToString().Trim()
        if ($line) { Write-Info "  $line" }
    }

    if ($LASTEXITCODE -ne 0) {
        Write-Warn "WSL installation may require a restart"
        Write-Info "After restart, re-run this script with -SkipWSL flag"
        if (-not $Unattended) {
            $restart = Read-Host "Restart now? (y/N)"
            if ($restart -eq "y") {
                Restart-Computer -Force
            }
        }
        exit 0
    }

    Write-OK "WSL2 + Ubuntu 24.04 installed"
}

# ===== Node.js 安装 =====
function Install-NodeJS {
    Write-Step "Installing Node.js $NodeVersion in WSL..."

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
        '        echo "[OK] Node.js $(node --version) already installed"'
        '        echo "[OK] npm $(npm --version)"'
        '        exit 0'
        '    fi'
        'fi'
        ''
        'echo "[LLclaw] Installing Node.js ' + $NodeVersion + '..."'
        ''
        'sudo apt-get update -qq'
        'curl -fsSL https://deb.nodesource.com/setup_' + $NodeVersion + '.x | sudo -E bash -'
        'sudo apt-get install -y nodejs'
    )

    if ($npmRegistry) {
        $scriptLines += 'npm config set registry ' + $npmRegistry
        $scriptLines += 'echo "[OK] npm registry set to mirror"'
    }

    $scriptLines += @(
        ''
        'echo "[OK] Node.js $(node --version) installed"'
        'echo "[OK] npm $(npm --version)"'
    )

    $exitCode = Invoke-WslScript -Lines $scriptLines -Description "Node.js installation"

    if ($exitCode -ne 0) {
        Write-Err "Node.js installation failed"
        Write-Info "Manual install: enter WSL, then run:"
        Write-Info "  curl -fsSL https://deb.nodesource.com/setup_${NodeVersion}.x | sudo -E bash -"
        Write-Info "  sudo apt-get install -y nodejs"
        exit 1
    }
    Write-OK "Node.js $NodeVersion installed"
}

# ===== OpenClaw 安装 =====
function Install-OpenClaw {
    Write-Step "Installing OpenClaw $OpenClawVersion..."

    $mirror = Get-BestMirror
    $registryFlag = ""
    if ($mirror -eq "taobao") {
        $registryFlag = "--registry https://registry.npmmirror.com"
    }

    $scriptLines = @(
        '#!/bin/bash'
        'set -e'
        ''
        'echo "[LLclaw] Installing OpenClaw..."'
        'npm install -g openclaw@' + $OpenClawVersion + ' ' + $registryFlag + ' 2>&1'
        ''
        'echo "[OK] OpenClaw installed"'
        ''
        'mkdir -p ~/.openclaw'
        'mkdir -p ~/.openclaw/backups'
        'mkdir -p ~/.openclaw/logs'
        ''
        'if [ ! -f ~/.openclaw/openclaw.json ]; then'
        'cat > ~/.openclaw/openclaw.json << LLCLAW_EOF'
        '{'
        '  "version": "1.3.0",'
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
        '    echo "[OK] Default config generated: ~/.openclaw/openclaw.json"'
        'fi'
        ''
        'echo "[LLclaw] Running setup wizard..."'
        'openclaw onboard --install-daemon 2>&1 || echo "[WARN] Setup wizard skipped (run openclaw onboard later)"'
    )

    $exitCode = Invoke-WslScript -Lines $scriptLines -Description "OpenClaw installation"

    Write-OK "OpenClaw installed"
}

# ===== Ollama 安装（可选）=====
function Install-Ollama {
    if (-not $WithOllama) { return }

    Write-Step "Installing Ollama local model engine..."

    $scriptLines = @(
        '#!/bin/bash'
        'set -e'
        ''
        'if command -v ollama &>/dev/null; then'
        '    echo "[OK] Ollama already installed"'
        '    exit 0'
        'fi'
        ''
        'echo "[LLclaw] Downloading and installing Ollama..."'
        'curl -fsSL https://ollama.com/install.sh | sh'
        ''
        'echo "[OK] Ollama installed"'
        ''
        'echo "[LLclaw] Starting Ollama service..."'
        'ollama serve &>/dev/null &'
        'sleep 2'
        ''
        'echo "[LLclaw] Pulling recommended model (qwen2.5:7b)..."'
        'ollama pull qwen2.5:7b 2>&1 || echo "[WARN] Model pull failed, run manually: ollama pull qwen2.5:7b"'
        ''
        'echo "[OK] Ollama setup complete"'
    )

    Invoke-WslScript -Lines $scriptLines -Description "Ollama installation"

    Write-OK "Ollama installed"
}

# ===== 配置导入 =====
function Import-Config {
    if (-not $ConfigFile) { return }

    Write-Step "Importing config: $ConfigFile"

    if (-not (Test-Path $ConfigFile)) {
        Write-Err "Config file not found: $ConfigFile"
        return
    }

    try {
        $config = Get-Content $ConfigFile -Raw | ConvertFrom-Json
        Write-OK "Config file parsed successfully"

        $cfgDrive = (Resolve-Path $ConfigFile).Path.Substring(0, 1).ToLower()
        $cfgRest = (Resolve-Path $ConfigFile).Path.Substring(2).Replace('\', '/')
        $wslCfgPath = "/mnt/$cfgDrive$cfgRest"

        $scriptLines = @(
            '#!/bin/bash'
            'cp "' + $wslCfgPath + '" ~/.openclaw/openclaw.json'
            'echo "[OK] Config imported to ~/.openclaw/openclaw.json"'
        )
        Invoke-WslScript -Lines $scriptLines -Description "Config import"

        Write-OK "Config imported"
    } catch {
        Write-Err "Invalid config file: $_"
    }
}

# ===== Docker 部署模式 =====
function Install-DockerMode {
    if (-not $DockerMode) { return }

    Write-Step "Docker deployment mode..."

    try {
        $dockerVersion = docker --version 2>&1
        Write-OK "Docker installed: $dockerVersion"
    } catch {
        Write-Err "Docker not installed. Please install Docker Desktop first."
        Write-Info "Download: https://www.docker.com/products/docker-desktop/"
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
    Write-OK "docker-compose.yml generated: $deployDir"

    New-Item -ItemType Directory -Path "$deployDir\config" -Force | Out-Null
    New-Item -ItemType Directory -Path "$deployDir\logs" -Force | Out-Null

    Write-Step "Starting Docker containers..."
    Push-Location $deployDir
    docker compose up -d 2>&1 | ForEach-Object { Write-Info "  $_" }
    Pop-Location

    Write-OK "Docker deployment complete"
    Write-Info "Deploy directory: $deployDir"
}

# ===== 安装后验证 =====
function Test-Installation {
    Write-Step "Verifying installation..."

    $scriptLines = @(
        '#!/bin/bash'
        'echo "--- Installation Verification ---"'
        ''
        'if command -v node &>/dev/null; then'
        '    echo "[OK] Node.js: $(node --version)"'
        'else'
        '    echo "[FAIL] Node.js not installed"'
        'fi'
        ''
        'if command -v npm &>/dev/null; then'
        '    echo "[OK] npm: $(npm --version)"'
        'else'
        '    echo "[FAIL] npm not installed"'
        'fi'
        ''
        'if command -v openclaw &>/dev/null; then'
        '    echo "[OK] OpenClaw: installed"'
        'else'
        '    echo "[WARN] OpenClaw: not detected (may need to reopen terminal)"'
        'fi'
        ''
        'if command -v ollama &>/dev/null; then'
        '    echo "[OK] Ollama: installed"'
        'else'
        '    echo "[INFO] Ollama: not installed (optional)"'
        'fi'
        ''
        'if [ -f ~/.openclaw/openclaw.json ]; then'
        '    echo "[OK] Config: ~/.openclaw/openclaw.json"'
        'else'
        '    echo "[WARN] Config file not found"'
        'fi'
        ''
        'echo "--- Verification Complete ---"'
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
    Write-Host "           LLclaw Installation Complete!                     " -ForegroundColor Green
    Write-Host "  =========================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Duration: ${minutes}m ${seconds}s" -ForegroundColor Gray
    Write-Host "  Log file: $script:LogFile" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  --- Next Steps ---" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  1. Enter WSL:" -ForegroundColor Yellow
    Write-Host "     wsl" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  2. Configure model API Key:" -ForegroundColor Yellow
    Write-Host "     nano ~/.openclaw/openclaw.json" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  3. Start Gateway:" -ForegroundColor Yellow
    Write-Host "     openclaw gateway --verbose" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  4. Open monitoring panel:" -ForegroundColor Yellow
    Write-Host "     http://localhost:18789" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  --- Supported Models ---" -ForegroundColor Cyan
    Write-Host "  China:   DeepSeek | Qwen | Wenxin | GLM | Moonshot" -ForegroundColor Gray
    Write-Host "           Baichuan | Hunyuan | Spark | Doubao | MiniMax" -ForegroundColor Gray
    Write-Host "  Global:  OpenAI | Claude | Gemini" -ForegroundColor Gray
    Write-Host "  Private: Ollama | vLLM | Custom endpoint" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  Docs: https://github.com/rocketeee/LLclaw" -ForegroundColor DarkGray
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
