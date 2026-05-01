# CFTC 持仓报告分析

基于 CFTC 期货持仓数据（Leveraged Funds & Managed Money）自动生成周度宏观分析报告，结合 Claude AI 进行深度策略研判。

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

| 变量 | 说明 | 必填 |
|---|---|---|
| `AIHUBMIX_API_KEY` | AI 分析 API 密钥 | 否 |
| `AIHUBMIX_API_URL` | AI API 地址（默认 AIHubMix） | 否 |
| `HTTP_PROXY` / `HTTPS_PROXY` | 代理地址（国内访问 CFTC API 需要） | 视网络情况 |

## 生成报告

```bash
# 抓取最新一周数据并生成 AI 分析
curl http://localhost:3000/api/cron/update

# 回填指定日期
curl "http://localhost:3000/api/cron/backfill?date=2026-04-14"
```

## 部署

项目配置了 Vercel Cron（每周五 22:00 UTC 自动更新），部署到 Vercel 即可自动运行：

```bash
npm i -g vercel
vercel
```

需要在 Vercel Dashboard 设置环境变量和创建 Blob 存储。

## 技术栈

- Next.js 16
- TypeScript
- Tailwind CSS
- Vercel Blob
- CFTC Socrata API
