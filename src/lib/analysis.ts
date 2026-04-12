import { ReportData, InstrumentRow } from './types';

function formatRowsForPrompt(rows: InstrumentRow[], label: string): string {
  let text = `\n### ${label}\n`;
  let lastSection = '';
  for (const r of rows) {
    if (r.section !== lastSection) {
      lastSection = r.section;
      text += `\n**${r.section}**\n`;
    }
    const priceStr = r.price_chg != null ? `${r.price_chg > 0 ? '+' : ''}${r.price_chg.toFixed(1)}%` : 'N/A';
    text += `- ${r.instrument}: 净持仓=${r.net.toLocaleString()} (z=${r.net_z ?? 'N/A'}), `;
    text += `多头=${r.long.toLocaleString()} (z=${r.long_z ?? 'N/A'}, 周变化=${r.long_ww.toLocaleString()}), `;
    text += `空头=${r.short.toLocaleString()} (z=${r.short_z ?? 'N/A'}, 周变化=${r.short_ww.toLocaleString()}), `;
    text += `动作=${r.flow_state || '无'}, 同期涨跌=${priceStr}\n`;
  }
  return text;
}

function buildPrompt(data: ReportData): string {
  const tffText = formatRowsForPrompt(data.tff_rows, '杠杆基金 Leveraged Funds (TFF)');
  const disaggText = formatRowsForPrompt(data.disagg_rows, '管理资金 Managed Money (Disagg)');

  return `你是一位拥有20年从业经验的全球宏观策略首席分析师。你的分析风格：客观理性，语言干练清晰，逻辑条理分明，不使用模糊修饰词，每个观点有数据支撑。

请基于以下 CFTC 持仓报告（数据截止 ${data.report_date}）进行深度分析。

## 数据口径
- z-score: (当前值 - 156周均值) / 156周标准差，衡量3年历史分位
- 周变化: 周环比合约数变化，括号内为变化幅度的z-score
- 动作: 基于多空变化z-score判定（多头建仓/平仓、空头建仓/回补、多头挤压/空头施压、多空双增/双减）
- 同期涨跌: CFTC报告期 Tue→Tue 价格变动

## 持仓数据
${tffText}
${disaggText}

## 输出格式（使用中文，Markdown格式）

### 一、本周核心变化
用2-3句话概述本周最显著的持仓异动，点明方向和幅度。

### 二、美股市场
分类分析（大盘/成长/小盘/国际）：
- 杠杆基金在各股指期货上的仓位变化意味着什么
- 当前仓位处于历史什么分位，是否存在极端值
- 结合同期价格变动，判断资金行为与价格是否一致
- 给出短期（1-2周）展望

### 三、固收与利率
分析债券和利率期货持仓变化：
- 杠杆基金在收益率曲线不同期限上的押注方向
- 与美联储政策预期的关系
- 对股市和风险资产的传导含义

### 四、外汇市场
分析主要货币对持仓：
- 美元多空力量对比
- 非美货币中哪些出现显著变化
- 套息交易和避险需求的信号

### 五、大宗商品
分类分析：
**能源**: 原油、天然气的供需预期信号
**贵金属**: 黄金、白银的避险/通胀交易信号
**工业金属**: 铜的全球经济前瞻信号
**农产品**: 如有显著变化则分析

### 六、加密货币
分析比特币期货持仓：
- 机构投资者态度变化
- 与传统风险资产的联动或背离

### 七、跨市场主题研判
综合以上分析，提炼1-2个宏观主题（如risk-on/off切换、通胀/通缩交易、衰退定价、流动性变化等），用3-5句话说明逻辑链条。

### 八、风险警示
列出2-3个需要密切关注的风险点：
- 拥挤交易反转风险（z-score极端值品种）
- 价格与持仓背离未修复的品种
- 可能引发连锁反应的仓位变化

每个部分保持精炼，重点突出数据异常和边际变化，避免泛泛而谈。`;
}

export async function generateAnalysis(data: ReportData): Promise<string> {
  const apiKey = process.env.AIHUBMIX_API_KEY;
  const apiUrl = process.env.AIHUBMIX_API_URL || 'https://aihubmix.com/v1/chat/completions';

  if (!apiKey) {
    console.warn('AIHUBMIX_API_KEY not set, skipping AI analysis');
    return '';
  }

  const prompt = buildPrompt(data);

  try {
    const resp = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        messages: [
          {
            role: 'system',
            content: '你是一位拥有20年从业经验的全球宏观策略首席分析师，服务于顶级对冲基金。你的分析以数据驱动、逻辑严密著称，从不含糊其辞。',
          },
          { role: 'user', content: prompt },
        ],
        max_tokens: 4000,
        temperature: 0.2,
      }),
      signal: AbortSignal.timeout(120000),
    });

    if (!resp.ok) {
      const err = await resp.text();
      console.error('AI analysis failed:', resp.status, err);
      return '';
    }

    const json = await resp.json();
    return json.choices?.[0]?.message?.content || '';
  } catch (e) {
    console.error('AI analysis error:', e);
    return '';
  }
}
