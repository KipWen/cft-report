# CFTC 持仓报告分析

基于 CFTC 期货持仓数据（Leveraged Funds & Managed Money）自动生成周度宏观分析报告，结合 Claude AI / Kimi AI 进行深度策略研判。

## 数据来源

- CFTC 公开数据（TFF + Disagg）
- Yahoo Finance 价格数据

## 分析维度

- **美股市场**：标普500、纳斯达克100、罗素2000、MSCI 新兴/发达市场、日经225
- **固收与利率**：2年期/10年期/超长期美债、联邦基金
- **外汇市场**：欧元、英镑、日元、澳元
- **大宗商品**：原油、天然气、黄金、白银、铜、玉米
- **加密货币**：比特币

## 本地运行

```bash
cd cft.report
npm install
npm run dev
```

访问 http://localhost:3000。如无本地数据，首页会显示空状态。

## 环境变量

复制 `.env.example` 为 `.env` 并填写：

| 变量 | 说明 | 必填 |
|---|---|---|
| `AIHUBMIX_API_KEY` | AI 分析 API 密钥 | 否（不填则跳过 AI 分析） |
| `AIHUBMIX_API_URL` | AI API 地址 | 否 |
| `AI_MODEL` | AI 模型名称 | 否 |
| `HTTP_PROXY` / `HTTPS_PROXY` | 代理地址（国内访问 CFTC API 需要） | 视网络情况 |
| `CRON_SECRET` | Cron API 鉴权密钥 | 否（生产环境建议设置） |

### AI 配置示例

**Kimi（推荐）**：
```env
AIHUBMIX_API_URL=https://api.moonshot.cn/v1/chat/completions
AIHUBMIX_API_KEY=sk-xxxxxxxx
AI_MODEL=kimi-k2.6
```

**DeepSeek**：
```env
AIHUBMIX_API_URL=https://api.deepseek.com/v1/chat/completions
AIHUBMIX_API_KEY=sk-xxxxxxxx
AI_MODEL=deepseek-chat
```

**OpenAI**：
```env
AIHUBMIX_API_URL=https://api.openai.com/v1/chat/completions
AIHUBMIX_API_KEY=sk-xxxxxxxx
AI_MODEL=gpt-4o
```

> **安全提示**：`.env` 文件已加入 `.gitignore`，不会被提交到 Git。请勿将真实 API 密钥硬编码到代码中。

## 生成报告

```bash
# 抓取最新一周数据并生成 AI 分析
curl http://localhost:3000/api/cron/update

# 回填指定日期
curl "http://localhost:3000/api/cron/backfill?date=2026-04-14"
```

本地开发时无需 `CRON_SECRET`，生产环境需在请求头中携带：
```bash
curl -H "Authorization: Bearer $CRON_SECRET" "http://localhost:3000/api/cron/update"
```

## 部署

项目配置了 Vercel Cron（每周五 22:00 UTC 自动更新），部署到 Vercel 即可自动运行：

```bash
npm i -g vercel
vercel
```

需要在 Vercel Dashboard 设置环境变量和创建 Blob 存储。

### 部署注意事项

- **Vercel Hobby 版函数超时限制为 10 秒**，可能不足以完成 CFTC 数据抓取 + AI 分析。建议升级到 Pro 计划（支持 300 秒）。
- 生产环境务必设置 `CRON_SECRET`，防止 API 被恶意调用。
- CFTC API 偶尔不稳定，已内置 3 次重试机制。

## 技术栈

- Next.js 16
- TypeScript
- Tailwind CSS
- Vercel Blob
- CFTC Socrata API
- Kimi / DeepSeek / OpenAI API

## Contributors

- [KipWen](https://github.com/KipWen)
