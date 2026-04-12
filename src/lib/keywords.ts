// 金融关键词分类，用于 AI 分析文本中的自动高亮
export const KEYWORD_STYLES: { pattern: RegExp; className: string }[] = [
  // 看多信号词 — 绿色
  {
    pattern: /(?:多头建仓|多头挤压|空头回补|看多|做多|抄底|反弹|上涨|偏多|牛市|risk-on|买入)/g,
    className: 'text-green-text font-semibold',
  },
  // 看空信号词 — 红色
  {
    pattern: /(?:空头建仓|空头施压|多头平仓|看空|做空|抛售|下跌|偏空|熊市|risk-off|卖出)/g,
    className: 'text-red-text font-semibold',
  },
  // 风险/极端词 — 橙色
  {
    pattern: /(?:极端|拥挤|反转风险|背离|警惕|风险|过度|泡沫|恐慌)/g,
    className: 'text-accent-primary font-semibold',
  },
  // z-score 数值 — 等宽加重
  {
    pattern: /(?:z[=＝]?[-−]?\d+\.?\d*|[-−]?\d+\.?\d*[σz]|z-score\s*[-−]?\d+\.?\d*)/gi,
    className: 'font-mono font-semibold text-text-primary bg-bg-secondary px-0.5 rounded',
  },
];
