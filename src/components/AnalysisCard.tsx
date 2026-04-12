'use client';

import React from 'react';

function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="list-disc list-outside ml-4 space-y-1 mb-3">
          {listItems.map((item, i) => (
            <li key={i} className="text-xs leading-relaxed">{renderInline(item)}</li>
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('### ')) {
      flushList();
      elements.push(
        <h4 key={`h-${elements.length}`} className="text-sm font-semibold text-accent-primary mt-4 mb-1.5 tracking-tight">
          {trimmed.replace(/^###\s*/, '')}
        </h4>
      );
    } else if (trimmed.startsWith('## ')) {
      flushList();
      elements.push(
        <h3 key={`h-${elements.length}`} className="text-base font-semibold text-text-primary mt-5 mb-2 tracking-tight">
          {trimmed.replace(/^##\s*/, '')}
        </h3>
      );
    } else if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
      flushList();
      elements.push(
        <p key={`b-${elements.length}`} className="text-xs font-bold text-text-primary mt-2 mb-1">
          {trimmed.replace(/\*\*/g, '')}
        </p>
      );
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      listItems.push(trimmed.slice(2));
    } else if (trimmed === '') {
      flushList();
    } else {
      flushList();
      elements.push(
        <p key={`p-${elements.length}`} className="text-xs leading-relaxed mb-2">{renderInline(trimmed)}</p>
      );
    }
  }
  flushList();
  return elements;
}

function renderInline(text: string): React.ReactNode {
  // Bold
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-text-primary">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

export function AnalysisCard({ content }: { content: string }) {
  if (!content) return null;

  return (
    <div className="mb-8 rounded-lg border border-border-light bg-bg-white overflow-hidden">
      <div className="bg-accent-lighter px-6 py-3 border-b border-border-light flex items-center gap-3">
        <div className="w-1 h-5 bg-accent-primary rounded-full" />
        <h2 className="text-base font-semibold text-text-primary tracking-tight" style={{ fontFamily: 'var(--font-serif)' }}>
          AI 持仓分析
        </h2>
        <span className="text-[9px] text-text-muted bg-bg-secondary px-2 py-0.5 rounded-full font-medium tracking-wider uppercase">
          Claude &middot; 自动生成
        </span>
      </div>
      <div className="px-6 py-4 text-text-secondary max-h-[600px] overflow-y-auto">
        {renderMarkdown(content)}
      </div>
    </div>
  );
}
