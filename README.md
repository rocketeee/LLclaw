# LLclaw - OpenClaw Windows 11 部署管理工具

<p align="center">
  <strong>一键安装 · 多模型支持 · 实时监控 · 可移植配置</strong>
</p>

<p align="center">
  <a href="#快速开始">快速开始</a> ·
  <a href="#功能特性">功能特性</a> ·
  <a href="#支持的大模型">支持的大模型</a> ·
  <a href="#安装方式">安装方式</a> ·
  <a href="#配置说明">配置说明</a> ·
  <a href="#监控面板">监控面板</a>
</p>

---

## 项目简介

LLclaw 是为 [OpenClaw](https://github.com/openclaw/openclaw) 打造的 **Windows 11 一键部署管理工具**，提供自动化安装脚本、可视化监控面板和多模型配置管理。项目全面支持国内外 15+ 大模型 API 接入，同时支持 Ollama 和 vLLM 私有化部署方案，具备完整的配置导出/导入能力，实现跨机器无缝迁移。

### 核心价值

- **零门槛部署**：一条 PowerShell 命令自动完成 WSL2 + Node.js + OpenClaw 全套环境配置
- **国产模型优先**：深度适配 DeepSeek、通义千问、文心一言、智谱 GLM、Moonshot 等 10+ 国内大模型
- **数据自主可控**：支持 Ollama/vLLM 本地私有化部署，敏感数据不出内网
- **运维可视化**：实时监控 Gateway 状态、会话管理、性能指标、日志追踪
- **可移植性**：一键导出/导入全部配置，支持 JSON/YAML/ENV 多种格式

---

## 快速开始

以 **管理员身份** 打开 PowerShell，执行以下命令：

```powershell
irm https://raw.githubusercontent.com/rocketeee/LLclaw/main/scripts/install.ps1 | iex
```

脚本将自动完成：系统检测 → WSL2 安装 → Node.js 22 安装 → OpenClaw 安装 → 配置向导。

---

## 功能特性

### 一键安装脚本

| 功能 | 说明 |
|------|------|
| 系统检测 | 自动检测 Windows 版本、架构、内存、磁盘、虚拟化、网络 |
| WSL2 配置 | 自动启用 WSL2 并安装 Ubuntu 24.04 |
| Node.js 安装 | 自动安装 Node.js 22 LTS |
| 镜像加速 | 自动检测最佳国内镜像源（淘宝/腾讯/华为） |
| OpenClaw 安装 | 全局安装并运行配置向导 |
| Ollama 集成 | 可选安装本地模型引擎 |
| Docker 部署 | 支持容器化部署方案 |
| 配置导入 | 支持从文件导入已有配置 |
| 无人值守 | 支持 `-Unattended` 参数跳过所有交互 |

### 一键卸载脚本

| 功能 | 说明 |
|------|------|
| 交互式卸载 | 4 种卸载模式菜单，逐项确认 |
| 选择性卸载 | 可单独保留 WSL2、Node.js、配置文件 |
| 完全卸载 | 一键清除所有组件（OpenClaw + Node.js + WSL + Ollama） |
| 卸载前备份 | 自动导出配置到指定路径 |
| Ollama 清理 | 可选移除 Ollama 及全部模型数据 |
| Docker 清理 | 移除相关容器、镜像和数据卷 |
| 系统残留清理 | 清理临时文件、注册表项、快捷方式 |
| 卸载报告 | 完整的卸载结果汇总和日志 |

### 可视化监控面板

- **控制台总览**：Gateway 运行状态、会话统计、Token 消耗、通道状态
- **实时监控**：CPU/内存/网络实时图表、Token 消耗趋势
- **日志查看器**：实时日志流、级别过滤、关键词搜索
- **模型配置**：可视化管理 15+ 模型的 API Key 和端点
- **配置迁移**：导出/导入/备份配置，支持多种格式

### 配置可移植性

- 支持 JSON、YAML、ENV 三种导出格式
- 可选是否包含敏感密钥
- 自动备份管理，支持定时备份
- 跨机器迁移只需导出 → 传输 → 导入三步

### 一键卸载

```powershell
# 下载卸载脚本
irm https://raw.githubusercontent.com/rocketeee/LLclaw/main/scripts/uninstall.ps1 -OutFile uninstall.ps1

# 交互式卸载（推荐）
.\uninstall.ps1

# 仅卸载 OpenClaw，保留环境
.\uninstall.ps1 -KeepWSL -KeepNodeJS

# 完全卸载（无人值守）
.\uninstall.ps1 -Full -Unattended

# 卸载前导出配置
.\uninstall.ps1 -ExportConfig "C:\backup\openclaw-config.json"

# 同时卸载 Ollama 和 Docker 容器
.\uninstall.ps1 -RemoveOllama -RemoveDocker
```

卸载脚本提供 4 种模式：

| 模式 | 说明 |
|------|------|
| 仅卸载 OpenClaw | 移除 OpenClaw 及配置，保留 Node.js 和 WSL2 |
| 卸载 OpenClaw + Node.js | 移除 OpenClaw 和 Node.js，保留 WSL2 |
| 完全卸载 | 移除所有组件：OpenClaw + Node.js + WSL + Ollama |
| 自定义选择 | 逐项确认要卸载的组件 |

---

## 支持的大模型

### 国内大模型

| 模型 | 提供商 | API 端点 | OpenAI 兼容 |
|------|--------|----------|:-----------:|
| DeepSeek | 深度求索 | `https://api.deepseek.com/v1` | ✅ |
| 通义千问 | 阿里云 | `https://dashscope.aliyuncs.com/compatible-mode/v1` | ✅ |
| 文心一言 | 百度 | `https://aip.baidubce.com/...` | ❌ |
| 智谱 GLM | 智谱 AI | `https://open.bigmodel.cn/api/paas/v4` | ✅ |
| Moonshot | 月之暗面 | `https://api.moonshot.cn/v1` | ✅ |
| 百川 | 百川智能 | `https://api.baichuan-ai.com/v1` | ✅ |
| 腾讯混元 | 腾讯云 | `https://api.hunyuan.cloud.tencent.com/v1` | ✅ |
| 讯飞星火 | 科大讯飞 | `https://spark-api-open.xf-yun.com/v1` | ✅ |
| 豆包 | 字节跳动 | `https://ark.cn-beijing.volces.com/api/v3` | ✅ |
| MiniMax | MiniMax | `https://api.minimax.chat/v1` | ✅ |

### 国际大模型

| 模型 | 提供商 | API 端点 | OpenAI 兼容 |
|------|--------|----------|:-----------:|
| GPT-4o | OpenAI | `https://api.openai.com/v1` | ✅ |
| Claude | Anthropic | `https://api.anthropic.com/v1` | ❌ |
| Gemini | Google | `https://generativelanguage.googleapis.com/v1beta` | ❌ |

### 私有化部署

| 引擎 | 说明 | 默认端点 |
|------|------|----------|
| Ollama | 轻量级本地模型引擎，一键拉取模型 | `http://localhost:11434/v1` |
| vLLM | 高性能推理引擎，适合生产环境 | `http://localhost:8000/v1` |
| 自定义端点 | 任何 OpenAI 兼容的 API 端点 | 用户自定义 |

---

## 安装方式

### 方式一：PowerShell 一键安装（推荐）

```powershell
# 标准安装
irm https://raw.githubusercontent.com/rocketeee/LLclaw/main/scripts/install.ps1 | iex

# 使用淘宝镜像加速
.\install.ps1 -Mirror taobao

# 同时安装 Ollama
.\install.ps1 -WithOllama

# 无人值守安装
.\install.ps1 -Unattended

# 导入已有配置
.\install.ps1 -ConfigFile "C:\path\to\config.json"

# 完整参数
.\install.ps1 -NodeVersion 22 -OpenClawVersion latest -Mirror auto -WithOllama -Unattended
```

### 方式二：WSL2 手动安装

```bash
# 1. 安装 WSL2
wsl --install -d Ubuntu-24.04

# 2. 进入 WSL 安装 Node.js
wsl
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. 安装 OpenClaw
npm install -g openclaw@latest
openclaw onboard --install-daemon

# 4. 启动 Gateway
openclaw gateway --port 18789 --verbose
```

### 方式三：Docker 容器部署

```bash
# 1. 克隆仓库
git clone https://github.com/rocketeee/LLclaw.git
cd LLclaw/docker

# 2. 配置环境变量
# 参考 ENV_TEMPLATE.md 创建 .env 文件

# 3. 启动服务
docker compose up -d

# 4. 带 Ollama 启动
docker compose --profile with-ollama up -d

# 5. 带 vLLM 启动
docker compose --profile with-vllm up -d
```

---

## 配置说明

### 配置文件位置

```
~/.openclaw/openclaw.json    # 主配置文件
~/.openclaw/backups/         # 配置备份目录
~/.openclaw/logs/            # 日志目录
```

### 配置结构

参考 `config/openclaw.example.json` 获取完整配置模板。核心配置项说明：

```jsonc
{
  "agent": {
    "model": "deepseek/deepseek-chat",  // 默认使用的模型
    "thinkingLevel": "medium"            // 思考深度: low/medium/high
  },
  "gateway": {
    "port": 18789,                       // Gateway 端口
    "bind": "127.0.0.1",                // 绑定地址
    "verbose": true                      // 详细日志
  },
  "models": {
    "deepseek": {
      "baseUrl": "https://api.deepseek.com/v1",
      "apiKey": "sk-your-key",
      "model": "deepseek-chat"
    }
    // ... 更多模型配置
  }
}
```

### 切换模型

只需修改 `agent.model` 字段即可切换默认模型：

```json
{
  "agent": {
    "model": "qwen/qwen-max"
  }
}
```

### 使用本地模型

1. 安装 Ollama：`curl -fsSL https://ollama.com/install.sh | sh`
2. 拉取模型：`ollama pull qwen2.5`
3. 配置 OpenClaw：

```json
{
  "agent": {
    "model": "ollama/qwen2.5"
  },
  "models": {
    "ollama": {
      "baseUrl": "http://localhost:11434/v1",
      "apiKey": "local",
      "model": "qwen2.5"
    }
  }
}
```

---

## 监控面板

LLclaw 提供基于 React 的可视化监控面板，包含以下功能模块：

| 模块 | 功能 |
|------|------|
| 控制台 | Gateway 状态总览、会话统计、通道管理、资源使用 |
| 模型配置 | 可视化管理 15+ 模型 API、连接测试、一键切换 |
| 系统监控 | CPU/内存/网络实时图表、日志查看器、性能指标 |
| 安装部署 | 安装指南、脚本下载、系统要求检查 |
| 配置迁移 | 导出/导入配置、备份管理、格式转换 |

---

## 系统要求

| 项目 | 最低要求 | 推荐配置 |
|------|----------|----------|
| 操作系统 | Windows 11 22H2 | Windows 11 23H2+ |
| 处理器 | x64，支持虚拟化 | 4 核+ |
| 内存 | 4 GB | 8 GB+ |
| 磁盘空间 | 10 GB | 20 GB+ |
| 网络 | 互联网连接 | 宽带连接 |

如使用 Ollama 本地模型，额外需要：

| 项目 | 7B 模型 | 13B 模型 | 70B 模型 |
|------|---------|----------|----------|
| 内存 | 8 GB | 16 GB | 64 GB |
| 显存 (GPU) | 6 GB | 10 GB | 40 GB+ |

---

## 项目结构

```
LLclaw/
├── scripts/
│   └── install.ps1              # Windows 一键安装脚本
├── config/
│   └── openclaw.example.json    # 完整配置模板（15+ 模型）
├── docker/
│   ├── docker-compose.yml       # Docker 部署配置
│   └── ENV_TEMPLATE.md          # 环境变量模板
├── web/                         # 监控面板源码 (React + Tailwind)
│   └── ...
├── schemas/
│   └── config.schema.json       # 配置文件 JSON Schema
├── LICENSE
└── README.md
```

---

## 许可证

本项目基于 [MIT License](LICENSE) 开源。

## 致谢

- [OpenClaw](https://github.com/openclaw/openclaw) — 个人 AI 助手网关
- [Ollama](https://ollama.com/) — 本地模型运行引擎
- [vLLM](https://docs.vllm.ai/) — 高性能推理引擎
