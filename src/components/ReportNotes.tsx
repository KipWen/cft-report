'use client';

export function ReportNotes() {
  return (
    <div className="rounded-lg border border-border-light bg-bg-secondary/50 p-4 text-xs text-text-tertiary">
      <p className="font-semibold text-text-secondary mb-2">说明</p>
      <ul className="list-disc list-inside space-y-1 leading-relaxed">
        <li>z-score = (当前值 - 156周均值) / 156周标准差（3年窗口），基于 OI 归一化占比</li>
        <li>周变化 = 周环比合约数变化（括号内为该变化的 z-score）</li>
        <li>净持仓 = 多头 - 空头 | 同期涨跌 = CFTC 报告期 Tue&rarr;Tue 价格变动</li>
        <li>动作: 多头建仓/平仓、空头建仓/回补、多头挤压/空头施压、多空双增/双减</li>
        <li>拥挤度: net/long/short z 任一 &ge; 2.0 &rarr; 拥挤 | &ge; 2.75 &rarr; 极端</li>
        <li>
          <span className="inline-block px-1.5 py-0 bg-yellow-bg border border-yellow-border rounded text-[10px] font-bold">
            黄色高亮
          </span>
          {' '}= 动作与同期价格背离
        </li>
      </ul>
    </div>
  );
}
