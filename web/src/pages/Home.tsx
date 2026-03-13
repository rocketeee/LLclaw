/*
 * Home - Landing Page
 * Industrial Console Style: Deep navy bg, cold blue accents, mission control aesthetic
 * Hero with generated background, feature cards, quick start section
 */
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  Terminal,
  Cpu,
  Activity,
  Download,
  FolderSync,
  ArrowRight,
  Shield,
  Zap,
  Globe,
  Server,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Download,
    title: "一键安装",
    desc: "Windows 11 自动化部署脚本，自动配置 WSL2 + Node.js + OpenClaw 全套环境",
    link: "/install",
  },
  {
    icon: Cpu,
    title: "多模型支持",
    desc: "支持 DeepSeek、通义千问、文心一言、智谱、Moonshot 等 15+ 国内外大模型",
    link: "/models",
  },
  {
    icon: Activity,
    title: "实时监控",
    desc: "Gateway 状态、会话管理、日志追踪、性能指标一览无余",
    link: "/monitoring",
  },
  {
    icon: Server,
    title: "私有化部署",
    desc: "支持 Ollama、vLLM 等本地模型引擎，数据完全自主可控",
    link: "/models",
  },
  {
    icon: FolderSync,
    title: "配置迁移",
    desc: "一键导出/导入全部配置，跨机器无缝迁移部署环境",
    link: "/portable",
  },
  {
    icon: Shield,
    title: "安全可靠",
    desc: "DM 配对认证、沙箱隔离、API Key 加密存储，企业级安全保障",
    link: "/dashboard",
  },
];

const modelProviders = [
  "DeepSeek", "通义千问", "文心一言", "智谱 GLM", "Moonshot",
  "百川", "腾讯混元", "讯飞星火", "OpenAI", "Claude",
  "Gemini", "Ollama", "vLLM",
];

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border backdrop-blur-md"
        style={{ background: "oklch(0.08 0.02 250 / 85%)" }}>
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded flex items-center justify-center glow-blue"
              style={{ background: "oklch(0.65 0.18 250 / 20%)" }}>
              <Terminal className="w-4 h-4 text-primary" />
            </div>
            <span className="font-bold tracking-wider text-primary text-lg">LLclaw</span>
            <span className="text-[10px] font-mono text-muted-foreground ml-1 mt-1">v1.0.0</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/dashboard">
              <span className="text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer">控制台</span>
            </Link>
            <Link href="/models">
              <span className="text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer">模型配置</span>
            </Link>
            <Link href="/install">
              <span className="text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer">安装部署</span>
            </Link>
            <a
              href="https://github.com/rocketeee/project_ctrl"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-14 overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://d2xsxph8kpxj0f.cloudfront.net/310519663068935883/3J5wmZWAcfHQGUkFYtGU5L/hero-bg-GHT9w252yjhcvTojs8q9WW.webp"
            alt=""
            className="w-full h-full object-cover opacity-40"
          />
          <div className="absolute inset-0" style={{
            background: "linear-gradient(180deg, oklch(0.08 0.02 250 / 60%) 0%, oklch(0.12 0.02 250) 100%)"
          }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 py-24 lg:py-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 mb-6">
              <div className="w-1.5 h-1.5 rounded-full bg-[oklch(0.72_0.19_155)] status-pulse" />
              <span className="text-xs font-mono text-primary tracking-wider">OPENCLAW 部署管理工具</span>
            </div>

            <h1 className="text-4xl lg:text-6xl font-bold tracking-tight leading-tight mb-6">
              <span className="text-foreground">在 Windows 上</span>
              <br />
              <span className="text-primary">一键部署 OpenClaw</span>
            </h1>

            <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-2xl">
              LLclaw 为 OpenClaw 提供完整的 Windows 11 部署方案，集成 15+ 国内外大模型 API，
              支持 Ollama/vLLM 私有化部署，配备实时监控面板和可移植配置管理。
            </p>

            <div className="flex items-center gap-4">
              <Link href="/install">
                <Button size="lg" className="gap-2 glow-blue font-semibold">
                  <Download className="w-4 h-4" />
                  开始安装
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button size="lg" variant="outline" className="gap-2 border-border hover:border-primary/50 hover:bg-primary/5">
                  进入控制台
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Terminal Preview */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-16 panel max-w-2xl"
          >
            <div className="panel-header">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[oklch(0.63_0.24_25)]" />
                <div className="w-3 h-3 rounded-full bg-[oklch(0.75_0.18_80)]" />
                <div className="w-3 h-3 rounded-full bg-[oklch(0.72_0.19_155)]" />
              </div>
              <span className="text-xs font-mono text-muted-foreground ml-2">PowerShell - 管理员</span>
            </div>
            <div className="p-4 font-mono text-sm leading-relaxed">
              <div className="text-muted-foreground">
                <span className="text-[oklch(0.72_0.19_155)]">PS C:\&gt;</span> irm https://llclaw.dev/install.ps1 | iex
              </div>
              <div className="text-primary mt-2">
                [LLclaw] 正在检测系统环境...
              </div>
              <div className="text-muted-foreground mt-1">
                [INFO] Windows 11 23H2 ✓
              </div>
              <div className="text-muted-foreground mt-1">
                [INFO] 正在启用 WSL2...
              </div>
              <div className="text-[oklch(0.72_0.19_155)] mt-1">
                [OK] OpenClaw 安装完成！Gateway 运行于 ws://127.0.0.1:18789
              </div>
              <div className="mt-2 flex items-center">
                <span className="text-[oklch(0.72_0.19_155)]">PS C:\&gt;</span>
                <span className="ml-1 w-2 h-4 bg-primary/60 animate-pulse" />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 relative">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mb-12"
          >
            <h2 className="text-2xl font-bold tracking-tight mb-3">核心功能</h2>
            <p className="text-muted-foreground">为 OpenClaw 部署和管理提供全方位支持</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feat, i) => {
              const Icon = feat.icon;
              return (
                <motion.div
                  key={feat.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Link href={feat.link}>
                    <div className="panel group hover:border-primary/40 transition-all duration-300 cursor-pointer h-full">
                      <div className="p-5">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4 transition-all duration-300 group-hover:glow-blue"
                          style={{ background: "oklch(0.65 0.18 250 / 12%)" }}>
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors">{feat.title}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">{feat.desc}</p>
                        <div className="mt-4 flex items-center gap-1 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                          <span>了解更多</span>
                          <ChevronRight className="w-3 h-3" />
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Supported Models */}
      <section className="py-20 border-t border-border">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-2xl font-bold tracking-tight mb-3">支持 15+ 大模型</h2>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                全面覆盖国内外主流大模型 API，同时支持 Ollama 和 vLLM 私有化部署引擎，
                所有模型均通过 OpenAI 兼容接口统一接入，切换模型只需修改一行配置。
              </p>
              <div className="flex flex-wrap gap-2">
                {modelProviders.map((name) => (
                  <span
                    key={name}
                    className="px-3 py-1.5 text-xs font-mono rounded border border-border bg-card hover:border-primary/40 hover:text-primary transition-colors"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
            <div className="relative">
              <img
                src="https://d2xsxph8kpxj0f.cloudfront.net/310519663068935883/3J5wmZWAcfHQGUkFYtGU5L/ai-network-4Hbi9ZmBBY2NgRtjs85cho.webp"
                alt="AI Network"
                className="w-full rounded-lg border border-border opacity-80"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Architecture */}
      <section className="py-20 border-t border-border">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1">
              <img
                src="https://d2xsxph8kpxj0f.cloudfront.net/310519663068935883/3J5wmZWAcfHQGUkFYtGU5L/deploy-illustration-PBSzfsUCXfeSMdUPKW2zyJ.webp"
                alt="Deploy Pipeline"
                className="w-full rounded-lg border border-border opacity-80"
              />
            </div>
            <div className="order-1 lg:order-2">
              <h2 className="text-2xl font-bold tracking-tight mb-3">自动化部署流水线</h2>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                LLclaw 的安装脚本自动完成从环境检测到服务启动的全部流程。
                支持 WSL2 自动配置、Node.js 版本管理、OpenClaw 安装与守护进程注册，
                以及 Docker 容器化部署方案。
              </p>
              <div className="space-y-3">
                {[
                  { icon: Zap, text: "环境自动检测与依赖安装" },
                  { icon: Globe, text: "国内镜像源加速下载" },
                  { icon: Shield, text: "安全配置与密钥管理" },
                  { icon: Server, text: "守护进程自动注册" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded flex items-center justify-center shrink-0"
                      style={{ background: "oklch(0.72 0.19 155 / 12%)" }}>
                      <item.icon className="w-4 h-4" style={{ color: "oklch(0.72 0.19 155)" }} />
                    </div>
                    <span className="text-sm">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 border-t border-border">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight mb-4">开始使用 LLclaw</h2>
          <p className="text-muted-foreground mb-8">
            只需一条命令，即可在 Windows 11 上完成 OpenClaw 的全部部署
          </p>
          <div className="panel inline-block mb-8">
            <div className="px-6 py-3 font-mono text-sm">
              <span className="text-muted-foreground">PS C:\&gt;</span>{" "}
              <span className="text-primary">irm https://llclaw.dev/install.ps1 | iex</span>
            </div>
          </div>
          <div className="flex justify-center gap-4">
            <Link href="/install">
              <Button size="lg" className="gap-2 glow-blue font-semibold">
                <Download className="w-4 h-4" />
                查看安装指南
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button size="lg" variant="outline" className="gap-2 border-border hover:border-primary/50">
                进入控制台
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-primary" />
            <span className="text-sm font-mono text-muted-foreground">LLclaw v1.0.0</span>
          </div>
          <div className="text-xs text-muted-foreground">
            基于 <a href="https://github.com/openclaw/openclaw" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">OpenClaw</a> 构建
          </div>
        </div>
      </footer>
    </div>
  );
}
