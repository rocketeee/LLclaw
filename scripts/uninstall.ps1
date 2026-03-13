#Requires -RunAsAdministrator
<#
.SYNOPSIS
    LLclaw - OpenClaw Windows 11 一键卸载脚本
.DESCRIPTION
    安全卸载 OpenClaw 及其相关组件，支持选择性卸载和完全清理。
    可选择保留配置文件以便将来重新安装时恢复。
.PARAMETER Full
    完全卸载：移除 OpenClaw + Node.js + WSL2 发行版
.PARAMETER KeepConfig
    保留配置文件和备份（默认会询问）
.PARAMETER KeepWSL
    保留 WSL2 环境（仅卸载 OpenClaw）
.PARAMETER KeepNodeJS
    保留 Node.js（仅卸载 OpenClaw）
.PARAMETER RemoveOllama
    同时卸载 Ollama 及其模型数据
.PARAMETER RemoveDocker
    同时清理 Docker 容器和镜像
.PARAMETER Unattended
    无人值守模式，跳过所有交互确认
.PARAMETER ExportConfig
    卸载前自动导出配置到指定路径
.NOTES
    版本: 1.4.0
    项目: https://github.com/rocketeee/LLclaw
.EXAMPLE
    # 交互式卸载（推荐）
    .\uninstall.ps1

    # 仅卸载 OpenClaw，保留环境
    .\uninstall.ps1 -KeepWSL -KeepNodeJS

    # 完全卸载
    .\uninstall.ps1 -Full -Unattended

    # 卸载前导出配置
    .\uninstall.ps1 -ExportConfig "C:\backup\openclaw-config.json"
#>

param(
    [switch]$Full,
    [switch]$KeepConfig,
    [switch]$KeepWSL,
    [switch]$KeepNodeJS,
    [switch]$RemoveOllama,
    [switch]$RemoveDocker,
    [switch]$Unattended,
    [string]$ExportConfig = ""
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
$script:StartTime = Get-Date
$script:LogFile = "$env:TEMP\llclaw-uninstall-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"
$script:RemovedComponents = @()
$script:SkippedComponents = @()
$script:Errors = @()

# ===== 编码修复 =====
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$env:WSL_UTF8 = "1"
$OutputEncoding = [System.Text.Encoding]::UTF8

# ===== 颜色输出函数 =====
function Write-Step  { param($msg) $ts = Get-Date -Format "HH:mm:ss"; Write-Host "[$ts] [LLclaw] " -ForegroundColor Cyan -NoNewline; Write-Host $msg; Add-Content $script:LogFile "[$ts] [STEP] $msg" }
function Write-OK    { param($msg) $ts = Get-Date -Format "HH:mm:ss"; Write-Host "[$ts] [  OK  ] " -ForegroundColor Green -NoNewline; Write-Host $msg; Add-Content $script:LogFile "[$ts] [OK] $msg" }
function Write-Warn  { param($msg) $ts = Get-Date -Format "HH:mm:ss"; Write-Host "[$ts] [ WARN ] " -ForegroundColor Yellow -NoNewline; Write-Host $msg; Add-Content $script:LogFile "[$ts] [WARN] $msg" }
function Write-Err   { param($msg) $ts = Get-Date -Format "HH:mm:ss"; Write-Host "[$ts] [ERROR ] " -ForegroundColor Red -NoNewline; Write-Host $msg; Add-Content $script:LogFile "[$ts] [ERROR] $msg"; $script:Errors += $msg }
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
            elseif ($line -match "^\[INFO\]") { Write-Info ($line -replace "^\[INFO\]\s*", "") }
            elseif ($line.Trim() -match "^\d+$") { <# 忽略纯数字行 #> }
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
    Write-Host "  =========================================================" -ForegroundColor Red
    Write-Host "                                                             " -ForegroundColor Red
    Write-Host "    LLclaw - OpenClaw Windows 11 一键卸载工具 v1.4.0        " -ForegroundColor Red
    Write-Host "                                                             " -ForegroundColor Red
    Write-Host "    安全卸载 | 选择性清理 | 配置备份 | 完整日志             " -ForegroundColor Red
    Write-Host "                                                             " -ForegroundColor Red
    Write-Host "  =========================================================" -ForegroundColor Red
    Write-Host ""
}

# ===== 确认操作 =====
function Confirm-Action {
    param(
        [string]$Message,
        [bool]$DefaultYes = $false
    )

    if ($Unattended) { return $true }

    $suffix = if ($DefaultYes) { "(Y/n)" } else { "(y/N)" }
    $response = Read-Host "$Message $suffix"

    if ([string]::IsNullOrWhiteSpace($response)) {
        return $DefaultYes
    }
    return ($response.ToLower() -eq "y" -or $response.ToLower() -eq "yes")
}

# ===== 环境检测 =====
function Get-InstalledComponents {
    Write-Step "正在检测已安装的组件..."

    $components = @{
        OpenClaw    = $false
        NodeJS      = $false
        WSL         = $false
        Ollama      = $false
        Docker      = $false
        ConfigFiles = $false
    }

    try {
        $wslCheck = wsl bash -c "command -v openclaw" 2>&1
        if ($LASTEXITCODE -eq 0 -and $wslCheck) {
            $components.OpenClaw = $true
            Write-OK "OpenClaw: 已安装"
        } else {
            Write-Info "OpenClaw: 未检测到"
        }
    } catch {
        Write-Info "OpenClaw: 未检测到"
    }

    try {
        $wslCheck = wsl bash -c "command -v node" 2>&1
        if ($LASTEXITCODE -eq 0 -and $wslCheck) {
            $nodeVer = wsl bash -c "node --version" 2>&1
            $components.NodeJS = $true
            Write-OK "Node.js: $nodeVer"
        } else {
            Write-Info "Node.js: 未检测到"
        }
    } catch {
        Write-Info "Node.js: 未检测到"
    }

    try {
        $wslList = wsl --list --quiet 2>&1
        if ($LASTEXITCODE -eq 0 -and $wslList) {
            $components.WSL = $true
            Write-OK "WSL2: 已安装"
        } else {
            Write-Info "WSL2: 未检测到"
        }
    } catch {
        Write-Info "WSL2: 未检测到"
    }

    try {
        $wslCheck = wsl bash -c "command -v ollama" 2>&1
        if ($LASTEXITCODE -eq 0 -and $wslCheck) {
            $components.Ollama = $true
            Write-OK "Ollama: 已安装"
        } else {
            Write-Info "Ollama: 未检测到"
        }
    } catch {
        Write-Info "Ollama: 未检测到"
    }

    try {
        $dockerContainers = docker ps -a --filter "name=openclaw" --format "{{.Names}}" 2>&1
        if ($LASTEXITCODE -eq 0 -and $dockerContainers) {
            $components.Docker = $true
            Write-OK "Docker 容器: 已检测到 OpenClaw 容器"
        } else {
            Write-Info "Docker 容器: 未检测到 OpenClaw 容器"
        }
    } catch {
        Write-Info "Docker: 未安装或未运行"
    }

    try {
        $configCheck = wsl bash -c "test -f ~/.openclaw/openclaw.json && echo exists" 2>&1
        if ($configCheck -match "exists") {
            $components.ConfigFiles = $true
            Write-OK "配置文件: ~/.openclaw/ 存在"
        } else {
            Write-Info "配置文件: 未检测到"
        }
    } catch {
        Write-Info "配置文件: 无法检测"
    }

    return $components
}

# ===== 导出配置 =====
function Export-ConfigBeforeUninstall {
    if (-not $ExportConfig) { return }

    Write-Step "正在导出配置文件..."

    $exportDir = Split-Path -Parent $ExportConfig
    if (-not (Test-Path $exportDir)) {
        New-Item -ItemType Directory -Path $exportDir -Force | Out-Null
    }

    try {
        $scriptLines = @(
            '#!/bin/bash'
            'if [ -f ~/.openclaw/openclaw.json ]; then'
            '    cat ~/.openclaw/openclaw.json'
            'else'
            '    echo "CONFIG_NOT_FOUND"'
            'fi'
        )

        $scriptContent = ($scriptLines -join "`n") + "`n"
        $tempFile = Join-Path $env:TEMP ("llclaw_export_" + [System.IO.Path]::GetRandomFileName() + ".sh")
        $utf8NoBom = New-Object System.Text.UTF8Encoding $false
        [System.IO.File]::WriteAllText($tempFile, $scriptContent, $utf8NoBom)

        $driveLetter = $tempFile.Substring(0, 1).ToLower()
        $restPath = $tempFile.Substring(2).Replace('\', '/')
        $wslFilePath = "/mnt/$driveLetter$restPath"

        $configContent = wsl -- bash -c "bash '$wslFilePath'" 2>&1
        Remove-Item $tempFile -Force -ErrorAction SilentlyContinue

        if ($configContent -match "CONFIG_NOT_FOUND") {
            Write-Warn "未找到配置文件, 跳过导出"
            return
        }

        $configContent | Set-Content -Path $ExportConfig -Encoding UTF8
        Write-OK "配置已导出到: $ExportConfig"
    } catch {
        Write-Err "配置导出失败: $_"
    }
}

# ===== 停止服务 =====
function Stop-OpenClawServices {
    Write-Step "正在停止 OpenClaw 相关服务..."

    $scriptLines = @(
        '#!/bin/bash'
        'if pgrep -f "openclaw" > /dev/null 2>&1; then'
        '    pkill -f "openclaw" 2>/dev/null'
        '    echo "[OK] OpenClaw 进程已终止"'
        'else'
        '    echo "[INFO] 未发现运行中的 OpenClaw 进程"'
        'fi'
        ''
        'if systemctl is-active --quiet openclaw 2>/dev/null; then'
        '    sudo systemctl stop openclaw 2>/dev/null'
        '    sudo systemctl disable openclaw 2>/dev/null'
        '    echo "[OK] OpenClaw 守护进程已停止并禁用"'
        'fi'
        ''
        'if pgrep -f "ollama" > /dev/null 2>&1; then'
        '    pkill -f "ollama" 2>/dev/null'
        '    echo "[OK] Ollama 进程已终止"'
        'fi'
    )

    try {
        Invoke-WslScript -Lines $scriptLines -Description "Stop services"
        Write-OK "服务已停止"
    } catch {
        Write-Warn "停止服务时出现警告: $_"
    }
}

# ===== 卸载 OpenClaw =====
function Remove-OpenClaw {
    Write-Step "正在卸载 OpenClaw..."

    $scriptLines = @(
        '#!/bin/bash'
        'set -e'
        ''
        'echo "[LLclaw] 正在卸载 openclaw npm 包..."'
        'npm uninstall -g openclaw 2>/dev/null && echo "[OK] npm 包已卸载" || echo "[WARN] npm 包卸载跳过"'
        ''
        'if [ -f /etc/systemd/system/openclaw.service ]; then'
        '    sudo systemctl stop openclaw 2>/dev/null || true'
        '    sudo systemctl disable openclaw 2>/dev/null || true'
        '    sudo rm -f /etc/systemd/system/openclaw.service'
        '    sudo systemctl daemon-reload'
        '    echo "[OK] systemd 服务已移除"'
        'fi'
        ''
        'if [ -f ~/.config/systemd/user/openclaw.service ]; then'
        '    systemctl --user stop openclaw 2>/dev/null || true'
        '    systemctl --user disable openclaw 2>/dev/null || true'
        '    rm -f ~/.config/systemd/user/openclaw.service'
        '    systemctl --user daemon-reload'
        '    echo "[OK] 用户级 systemd 服务已移除"'
        'fi'
        ''
        'echo "[OK] OpenClaw 卸载完成"'
    )

    try {
        Invoke-WslScript -Lines $scriptLines -Description "Remove OpenClaw"
        $script:RemovedComponents += "OpenClaw"
    } catch {
        Write-Err "OpenClaw 卸载失败: $_"
    }
}

# ===== 清理配置文件 =====
function Remove-ConfigFiles {
    param([bool]$Keep = $false)

    if ($Keep -or $KeepConfig) {
        Write-Step "保留配置文件 (--KeepConfig)"
        $script:SkippedComponents += "配置文件 (已保留)"
        return
    }

    if (-not $Unattended -and -not $Full) {
        $keepIt = Confirm-Action "是否保留配置文件以便将来恢复?" $true
        if ($keepIt) {
            Write-Step "保留配置文件"
            $script:SkippedComponents += "配置文件 (用户选择保留)"
            return
        }
    }

    Write-Step "正在清理配置文件..."

    $scriptLines = @(
        '#!/bin/bash'
        'if [ -d ~/.openclaw ]; then'
        '    BACKUP_PATH="/tmp/openclaw-backup-$(date +%Y%m%d-%H%M%S).tar.gz"'
        '    tar -czf "$BACKUP_PATH" -C ~ .openclaw 2>/dev/null'
        '    echo "[INFO] 安全备份已创建: $BACKUP_PATH"'
        '    rm -rf ~/.openclaw'
        '    echo "[OK] 配置目录 ~/.openclaw 已删除"'
        'else'
        '    echo "[INFO] 配置目录不存在, 跳过"'
        'fi'
        ''
        'npm cache ls 2>/dev/null | grep openclaw | while read line; do'
        '    npm cache clean --force 2>/dev/null'
        '    echo "[OK] npm 缓存已清理"'
        '    break'
        'done'
    )

    try {
        Invoke-WslScript -Lines $scriptLines -Description "Clean config"
        $script:RemovedComponents += "配置文件"
        Write-OK "配置文件清理完成"
    } catch {
        Write-Err "配置文件清理失败: $_"
    }
}

# ===== 卸载 Ollama =====
function Remove-Ollama {
    if (-not $RemoveOllama -and -not $Full) {
        if (-not $Unattended) {
            $removeIt = Confirm-Action "是否同时卸载 Ollama 及其模型数据?"
            if (-not $removeIt) {
                $script:SkippedComponents += "Ollama (用户选择保留)"
                return
            }
        } else {
            $script:SkippedComponents += "Ollama (未指定 -RemoveOllama)"
            return
        }
    }

    Write-Step "正在卸载 Ollama..."

    $scriptLines = @(
        '#!/bin/bash'
        'if systemctl is-active --quiet ollama 2>/dev/null; then'
        '    sudo systemctl stop ollama'
        '    sudo systemctl disable ollama'
        '    echo "[OK] Ollama 服务已停止"'
        'fi'
        ''
        'if [ -f /usr/local/bin/ollama ]; then'
        '    sudo rm -f /usr/local/bin/ollama'
        '    echo "[OK] Ollama 二进制已删除"'
        'fi'
        ''
        'sudo rm -f /etc/systemd/system/ollama.service'
        'sudo systemctl daemon-reload 2>/dev/null'
        ''
        'if [ -d ~/.ollama ]; then'
        '    SIZE=$(du -sh ~/.ollama 2>/dev/null | cut -f1)'
        '    rm -rf ~/.ollama'
        '    echo "[OK] Ollama 模型数据已删除 (释放 $SIZE)"'
        'fi'
        ''
        'sudo userdel ollama 2>/dev/null || true'
        'sudo groupdel ollama 2>/dev/null || true'
        ''
        'echo "[OK] Ollama 卸载完成"'
    )

    try {
        Invoke-WslScript -Lines $scriptLines -Description "Remove Ollama"
        $script:RemovedComponents += "Ollama"
        Write-OK "Ollama 卸载完成"
    } catch {
        Write-Err "Ollama 卸载失败: $_"
    }
}

# ===== 清理 Docker 容器 =====
function Remove-DockerContainers {
    if (-not $RemoveDocker -and -not $Full) {
        $script:SkippedComponents += "Docker 容器 (未指定 -RemoveDocker)"
        return
    }

    Write-Step "正在清理 Docker 容器..."

    try {
        $containers = docker ps -a --filter "name=openclaw" --filter "name=ollama-engine" --filter "name=vllm-engine" --format "{{.Names}}" 2>&1
        if ($containers) {
            foreach ($container in $containers -split "`n") {
                $name = $container.Trim()
                if ($name) {
                    docker stop $name 2>&1 | Out-Null
                    docker rm $name 2>&1 | Out-Null
                    Write-OK "容器 $name 已移除"
                }
            }
        }

        $images = docker images --filter "reference=openclaw/*" --filter "reference=ollama/*" --filter "reference=vllm/*" --format "{{.Repository}}:{{.Tag}}" 2>&1
        if ($images) {
            foreach ($image in $images -split "`n") {
                $img = $image.Trim()
                if ($img) {
                    docker rmi $img 2>&1 | Out-Null
                    Write-OK "镜像 $img 已移除"
                }
            }
        }

        $volumes = docker volume ls --filter "name=ollama" --filter "name=vllm" --format "{{.Name}}" 2>&1
        if ($volumes) {
            foreach ($vol in $volumes -split "`n") {
                $v = $vol.Trim()
                if ($v) {
                    docker volume rm $v 2>&1 | Out-Null
                    Write-OK "卷 $v 已移除"
                }
            }
        }

        $deployDir = "$env:USERPROFILE\openclaw-deploy"
        if (Test-Path $deployDir) {
            Remove-Item -Recurse -Force $deployDir
            Write-OK "部署目录 $deployDir 已删除"
        }

        $script:RemovedComponents += "Docker 容器/镜像"
        Write-OK "Docker 清理完成"
    } catch {
        Write-Warn "Docker 清理时出现警告: $_"
    }
}

# ===== 卸载 Node.js =====
function Remove-NodeJS {
    if ($KeepNodeJS -or (-not $Full)) {
        if (-not $Full -and -not $Unattended) {
            $removeIt = Confirm-Action "是否同时卸载 WSL 中的 Node.js?"
            if (-not $removeIt) {
                $script:SkippedComponents += "Node.js (用户选择保留)"
                return
            }
        } else {
            if ($KeepNodeJS) {
                $script:SkippedComponents += "Node.js (--KeepNodeJS)"
                return
            }
        }
    }

    Write-Step "正在卸载 WSL 中的 Node.js..."

    $scriptLines = @(
        '#!/bin/bash'
        'set -e'
        ''
        'echo "[LLclaw] 正在卸载 Node.js..."'
        'sudo apt-get purge -y nodejs 2>/dev/null || true'
        'sudo apt-get autoremove -y 2>/dev/null || true'
        ''
        'sudo rm -f /etc/apt/sources.list.d/nodesource.list'
        'sudo rm -f /etc/apt/keyrings/nodesource.gpg'
        ''
        'sudo rm -rf /usr/local/lib/node_modules'
        'sudo rm -rf /usr/local/include/node'
        'rm -rf ~/.npm'
        'rm -rf ~/.node-gyp'
        ''
        'echo "[OK] Node.js 卸载完成"'
    )

    try {
        Invoke-WslScript -Lines $scriptLines -Description "Remove Node.js"
        $script:RemovedComponents += "Node.js"
        Write-OK "Node.js 卸载完成"
    } catch {
        Write-Err "Node.js 卸载失败: $_"
    }
}

# ===== 卸载 WSL 发行版 =====
function Remove-WSLDistro {
    if ($KeepWSL -or (-not $Full)) {
        if (-not $Full -and -not $Unattended) {
            $removeIt = Confirm-Action "是否卸载 WSL Ubuntu 发行版? (这将删除 WSL 中的所有数据)"
            if (-not $removeIt) {
                $script:SkippedComponents += "WSL2 (用户选择保留)"
                return
            }
        } else {
            if ($KeepWSL) {
                $script:SkippedComponents += "WSL2 (--KeepWSL)"
                return
            }
        }
    }

    Write-Step "正在卸载 WSL Ubuntu 发行版..."
    Write-Warn "此操作将删除 WSL Ubuntu 中的所有数据!"

    if (-not $Unattended) {
        $confirm = Confirm-Action "确认删除 WSL Ubuntu 发行版?"
        if (-not $confirm) {
            $script:SkippedComponents += "WSL2 (用户取消)"
            return
        }
    }

    try {
        $distros = wsl --list --quiet 2>&1
        foreach ($distro in $distros -split "`n") {
            $name = $distro.Trim()
            if ($name -match "Ubuntu") {
                Write-Info "正在注销发行版: $name"
                wsl --unregister $name 2>&1 | ForEach-Object { Write-Info "  $_" }
                Write-OK "发行版 $name 已注销"
            }
        }

        $script:RemovedComponents += "WSL Ubuntu"
        Write-OK "WSL 发行版卸载完成"
    } catch {
        Write-Err "WSL 卸载失败: $_"
    }
}

# ===== 清理系统残留 =====
function Remove-SystemResiduals {
    Write-Step "正在清理系统残留..."

    try {
        $tempFiles = Get-ChildItem "$env:TEMP" -Filter "llclaw-*" -ErrorAction SilentlyContinue
        if ($tempFiles) {
            $tempFiles | Remove-Item -Force -ErrorAction SilentlyContinue
            Write-OK "临时文件已清理"
        }

        $regPaths = @(
            "HKCU:\Software\LLclaw",
            "HKLM:\Software\LLclaw"
        )
        foreach ($regPath in $regPaths) {
            if (Test-Path $regPath) {
                Remove-Item -Path $regPath -Recurse -Force
                Write-OK "注册表项 $regPath 已清理"
            }
        }

        $shortcuts = @(
            "$env:USERPROFILE\Desktop\LLclaw.lnk",
            "$env:USERPROFILE\Desktop\OpenClaw.lnk",
            "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\LLclaw.lnk"
        )
        foreach ($shortcut in $shortcuts) {
            if (Test-Path $shortcut) {
                Remove-Item -Path $shortcut -Force
                Write-OK "快捷方式已删除: $(Split-Path -Leaf $shortcut)"
            }
        }

        Write-OK "系统残留清理完成"
    } catch {
        Write-Warn "部分残留清理跳过: $_"
    }
}

# ===== 显示卸载报告 =====
function Show-UninstallReport {
    $elapsed = (Get-Date) - $script:StartTime
    $minutes = [math]::Floor($elapsed.TotalMinutes)
    $seconds = $elapsed.Seconds

    Write-Host ""
    Write-Host "  =========================================================" -ForegroundColor Green
    Write-Host "              LLclaw 卸载完成!                               " -ForegroundColor Green
    Write-Host "  =========================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "  卸载耗时: ${minutes}分${seconds}秒" -ForegroundColor Gray
    Write-Host "  卸载日志: $script:LogFile" -ForegroundColor Gray
    Write-Host ""

    if ($script:RemovedComponents.Count -gt 0) {
        Write-Host "  --- 已卸载的组件 ---" -ForegroundColor Green
        foreach ($comp in $script:RemovedComponents) {
            Write-Host "    [x] $comp" -ForegroundColor Green
        }
        Write-Host ""
    }

    if ($script:SkippedComponents.Count -gt 0) {
        Write-Host "  --- 已保留的组件 ---" -ForegroundColor Yellow
        foreach ($comp in $script:SkippedComponents) {
            Write-Host "    [ ] $comp" -ForegroundColor Yellow
        }
        Write-Host ""
    }

    if ($script:Errors.Count -gt 0) {
        Write-Host "  --- 错误信息 ---" -ForegroundColor Red
        foreach ($err in $script:Errors) {
            Write-Host "    [!] $err" -ForegroundColor Red
        }
        Write-Host ""
    }

    Write-Host "  如需重新安装, 请运行:" -ForegroundColor Cyan
    Write-Host "  irm https://raw.githubusercontent.com/rocketeee/LLclaw/main/scripts/install.ps1 | iex" -ForegroundColor Gray
    Write-Host ""

    if ($ExportConfig) {
        Write-Host "  配置备份位置: $ExportConfig" -ForegroundColor Cyan
        Write-Host "  重新安装时使用: .\install.ps1 -ConfigFile `"$ExportConfig`"" -ForegroundColor Gray
        Write-Host ""
    }
}

# ===== 交互式模式菜单 =====
function Show-InteractiveMenu {
    Write-Host ""
    Write-Host "  请选择卸载模式:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  [1] 仅卸载 OpenClaw" -ForegroundColor White
    Write-Host "      移除 OpenClaw 及其配置, 保留 Node.js 和 WSL2" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "  [2] 卸载 OpenClaw + Node.js" -ForegroundColor White
    Write-Host "      移除 OpenClaw 和 Node.js, 保留 WSL2" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "  [3] 完全卸载" -ForegroundColor White
    Write-Host "      移除所有组件: OpenClaw + Node.js + WSL + Ollama" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "  [4] 自定义选择" -ForegroundColor White
    Write-Host "      逐项确认要卸载的组件" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "  [0] 取消" -ForegroundColor White
    Write-Host ""

    $choice = Read-Host "  请输入选项 (0-4)"
    return $choice
}

# ===== 主流程 =====
Show-Banner

$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Err "需要管理员权限运行此脚本"
    Write-Err "请右键 PowerShell 选择「以管理员身份运行」"
    exit 1
}

$components = Get-InstalledComponents

$hasAnything = $components.Values | Where-Object { $_ -eq $true }
if (-not $hasAnything) {
    Write-Warn "未检测到任何 OpenClaw 相关组件"
    Write-Info "无需卸载"
    exit 0
}

Export-ConfigBeforeUninstall

if ($Full) {
    Write-Step "完全卸载模式"
    if (-not $Unattended) {
        $confirm = Confirm-Action "确认完全卸载所有 OpenClaw 相关组件?"
        if (-not $confirm) {
            Write-Info "卸载已取消"
            exit 0
        }
    }

    Stop-OpenClawServices
    Remove-OpenClaw
    Remove-ConfigFiles -Keep $false
    Remove-Ollama
    Remove-DockerContainers
    Remove-NodeJS
    Remove-WSLDistro
    Remove-SystemResiduals

} elseif ($Unattended) {
    Stop-OpenClawServices
    Remove-OpenClaw
    Remove-ConfigFiles -Keep $KeepConfig
    if ($RemoveOllama) { Remove-Ollama }
    if ($RemoveDocker) { Remove-DockerContainers }
    Remove-SystemResiduals

} else {
    $choice = Show-InteractiveMenu

    switch ($choice) {
        "0" {
            Write-Info "卸载已取消"
            exit 0
        }
        "1" {
            Stop-OpenClawServices
            Remove-OpenClaw
            Remove-ConfigFiles
            Remove-SystemResiduals
        }
        "2" {
            Stop-OpenClawServices
            Remove-OpenClaw
            Remove-ConfigFiles
            Remove-NodeJS
            Remove-SystemResiduals
        }
        "3" {
            Stop-OpenClawServices
            Remove-OpenClaw
            Remove-ConfigFiles -Keep $false
            if ($components.Ollama) { Remove-Ollama }
            Remove-DockerContainers
            Remove-NodeJS
            Remove-WSLDistro
            Remove-SystemResiduals
        }
        "4" {
            Stop-OpenClawServices
            Remove-OpenClaw
            Remove-ConfigFiles
            if ($components.Ollama) { Remove-Ollama }
            if ($components.Docker) { Remove-DockerContainers }
            Remove-NodeJS
            Remove-WSLDistro
            Remove-SystemResiduals
        }
        default {
            Write-Err "无效选项: $choice"
            exit 1
        }
    }
}

Show-UninstallReport
