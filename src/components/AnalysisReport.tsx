'use client';

import React from 'react';

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-text-primary">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function parseMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];
  let keyCounter = 0;

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`ul-${keyCounter++}`} className="space-y-1.5 mb-4 ml-0.5">
          {listItems.map((item, i) => (
            <li key={i} className="flex gap-2 text-[13px] leading-relaxed text-text-secondary">
              <span className="text-border-dark mt-1 shrink-0">-</span>
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

    if (trimmed.startsWith('# ') && !trimmed.startsWith('## ')) {
      flushList();
      // Skip top-level title, we render our own
      continue;
    } else if (trimmed.startsWith('### ')) {
      flushList();
      const heading = trimmed.replace(/^###\s*/, '');
      elements.push(
        <h4 key={`h4-${keyCounter++}`} className="text-xs font-semibold text-accent-primary mt-5 mb-2 tracking-tight uppercase">
          {heading}
        </h4>
      );
    } else if (trimmed.startsWith('## ')) {
      flushList();
      const heading = trimmed.replace(/^##\s*/, '');
      elements.push(
        <div key={`h3-${keyCounter++}`} className="mt-6 mb-3 first:mt-0">
          <h3 className="text-base font-semibold text-text-primary tracking-tight pb-1.5 border-b border-border-light">
            {heading}
          </h3>
        </div>
      );
    } else if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
      flushList();
      elements.push(
        <p key={`b-${keyCounter++}`} className="text-[13px] font-semibold text-text-primary mt-3 mb-1">
          {trimmed.replace(/\*\*/g, '')}
        </p>
      );
    } else if (/^\*\*[^*]+\*\*[：:]/.test(trimmed)) {
      // Bold label followed by colon: treat as definition
      flushList();
      const match = trimmed.match(/^\*\*([^*]+)\*\*[：:]\s*(.*)/);
      if (match) {
        elements.push(
          <p key={`def-${keyCounter++}`} className="text-[13px] leading-relaxed text-text-secondary mb-1.5">
            <strong className="text-text-primary font-semibold">{match[1]}：</strong>
            {match[2]}
          </p>
        );
      }
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      listItems.push(trimmed.slice(2));
    } else if (trimmed === '') {
      flushList();
    } else {
      flushList();
      elements.push(
        <p key={`p-${keyCounter++}`} className="text-[13px] leading-[1.8] text-text-secondary mb-2">
          {renderInline(trimmed)}
        </p>
      );
    }
  }
  flushList();
  return elements;
}

export function AnalysisReport({ content, reportDate }: { content: string; reportDate: string }) {
  if (!content) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <p className="text-sm text-text-muted">本期报告暂无 AI 分析</p>
        </div>
      </div>
    );
  }

  return (
    <article className="max-w-3xl">
      {/* Report Header */}
      <div className="mb-6">
        <p className="text-[10px] font-semibold text-text-muted uppercase tracking-widest mb-1">
          Weekly Analysis
        </p>
        <h1 className="text-xl font-bold text-text-primary tracking-tight leading-tight" style={{ fontFamily: 'var(--font-serif)' }}>
          CFTC 持仓深度分析
        </h1>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[10px] text-text-muted">{reportDate}</span>
          <span className="w-px h-3 bg-border-medium" />
          <span className="text-[9px] text-text-muted bg-bg-secondary px-1.5 py-0.5 rounded font-medium">
            AI Generated
          </span>
        </div>
      </div>

      <div className="border-t border-border-light pt-5">
        {parseMarkdown(content)}
      </div>
    </article>
  );
}
