# Docker 环境变量模板

将以下内容保存为 `.env` 文件，放在 `docker-compose.yml` 同级目录下。

```env
# LLclaw Docker 环境变量配置

# ===== OpenClaw Gateway =====
OPENCLAW_PORT=18789
OPENCLAW_VERBOSE=true

# ===== Ollama (本地模型) =====
OLLAMA_PORT=11434

# ===== vLLM (高性能推理) =====
VLLM_PORT=8000
VLLM_MODEL=Qwen/Qwen2.5-7B-Instruct

# ===== 模型 API Keys =====
# 国内大模型
DEEPSEEK_API_KEY=your_deepseek_key
QWEN_API_KEY=your_qwen_key
ERNIE_API_KEY=your_ernie_key
ZHIPU_API_KEY=your_zhipu_key
MOONSHOT_API_KEY=your_moonshot_key
BAICHUAN_API_KEY=your_baichuan_key
HUNYUAN_API_KEY=your_hunyuan_key
SPARK_API_KEY=your_spark_key
DOUBAO_API_KEY=your_doubao_key
MINIMAX_API_KEY=your_minimax_key

# 国际大模型
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
GEMINI_API_KEY=your_gemini_key

# ===== 消息通道 =====
TELEGRAM_BOT_TOKEN=your_telegram_token
DISCORD_BOT_TOKEN=your_discord_token
SLACK_BOT_TOKEN=your_slack_token
FEISHU_APP_ID=your_feishu_app_id
FEISHU_APP_SECRET=your_feishu_app_secret
```
