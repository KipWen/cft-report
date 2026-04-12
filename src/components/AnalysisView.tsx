'use client';

import React from 'react';
import { KEYWORD_STYLES } from '@/lib/keywords';

/**
 * Enhanced inline renderer:
 * 1. **bold** → semibold text-primary
 * 2. Financial keywords → colored highlights (green/red/orange)
 * 3. z-score values → mono badge
 */
function renderInline(text: string): React.ReactNode {
  // Step 1: split by **bold**
  const boldParts = text.split(/(\*\*[^*]+\*\*)/g);
  const nodes: React.ReactNode[] = [];

  boldParts.forEach((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const inner = part.slice(2, -2);
      nodes.push(
        <strong key={`b-${i}`} className="font-semibold text-text-primary">{highlightKeywords(inner, `b-${i}`)}</strong>
      );
    } else if (part) {
      nodes.push(...highlightKeywords(part, `t-${i}`));
    }
  });

  return nodes;
}

function highlightKeywords(text: string, prefix: string): React.ReactNode[] {
  // Build a combined regex from all keyword patterns
  const allPatterns = KEYWORD_STYLES.map(k => k.pattern.source).join('|');
  const combinedRegex = new RegExp(`(${allPatterns})`, 'gi');

  const parts = text.split(combinedRegex);
  if (parts.length === 1) return [text];

  return parts.filter(Boolean).map((part, i) => {
    // Check which keyword style matches
    for (const kw of KEYWORD_STYLES) {
      const testRegex = new RegExp(`^(?:${kw.pattern.source})$`, 'i');
      if (testRegex.test(part)) {
        return <span key={`${prefix}-${i}`} className={kw.className}>{part}</span>;
      }
    }
    return <React.Fragment key={`${prefix}-${i}`}>{part}</React.Fragment>;
  });
}

export function AnalysisView({ content, reportDate }: { content: string; reportDate: string }) {
  if (!content) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-[14px] text-text-muted">本期暂无 AI 分析观点</p>
      </div>
    );
  }

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];
  let k = 0;

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`ul-${k++}`} className="space-y-1 mb-3">
          {listItems.map((item, i) => (
            <li key={i} className="flex gap-2 text-[14px] leading-[1.6] text-text-secondary">
              <span className="text-accent-primary shrink-0">&#x2022;</span>
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('# ') && !trimmed.startsWith('## ')) continue;
    if (trimmed.startsWith('### ')) {
      flushList();
      elements.push(
        <h4 key={`h-${k++}`} className="text-[12px] font-semibold text-accent-primary mt-4 mb-1 uppercase tracking-wider">
          {trimmed.replace(/^###\s*/, '')}
        </h4>
      );
    } else if (trimmed.startsWith('## ')) {
      flushList();
      elements.push(
        <h3 key={`h-${k++}`} className="text-[16px] font-semibold text-text-primary mt-5 mb-1.5 pb-1.5 border-b border-border-light first:mt-0">
          {trimmed.replace(/^##\s*/, '')}
        </h3>
      );
    } else if (/^\*\*[^*]+\*\*[：:]/.test(trimmed)) {
      flushList();
      const match = trimmed.match(/^\*\*([^*]+)\*\*[：:]\s*(.*)/);
      if (match) {
        elements.push(
          <p key={`d-${k++}`} className="text-[14px] leading-[1.6] text-text-secondary mb-1">
            <strong className="text-text-primary font-semibold">{match[1]}：</strong>
            {renderInline(match[2])}
          </p>
        );
      }
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      listItems.push(trimmed.slice(2));
    } else if (trimmed === '') {
      flushList();
    } else if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
      flushList();
      elements.push(
        <p key={`b-${k++}`} className="text-[14px] font-semibold text-text-primary mt-3 mb-1">
          {trimmed.replace(/\*\*/g, '')}
        </p>
      );
    } else {
      flushList();
      elements.push(
        <p key={`p-${k++}`} className="text-[14px] leading-[1.65] text-text-secondary mb-1.5">
          {renderInline(trimmed)}
        </p>
      );
    }
  }
  flushList();

  return (
    <div>
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h1 className="text-[18px] font-bold text-text-primary tracking-tight" style={{ fontFamily: 'var(--font-serif)' }}>
            CFTC 持仓深度分析
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[12px] text-text-muted">{reportDate}</span>
            <span className="text-[10px] text-text-muted bg-bg-secondary px-1.5 py-0.5 rounded font-medium">AI</span>
          </div>
        </div>
        {/* Legend */}
        <div className="flex items-center gap-3 text-[10px]">
          <span className="text-green-text font-semibold">看多信号</span>
          <span className="text-red-text font-semibold">看空信号</span>
          <span className="text-accent-primary font-semibold">风险提示</span>
        </div>
      </div>
      <div className="border-t border-border-light pt-4 columns-1 lg:columns-2 gap-8">
        {elements}
      </div>
    </div>
  );
}
