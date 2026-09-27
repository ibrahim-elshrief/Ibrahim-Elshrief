import React from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  if (!content) return null;

  // Split by line breaks
  const lines = content.split('\n');

  const renderFormattedText = (text: string) => {
    // Basic inline markdown: **bold**, *italic*, `code`
    const parts = [];
    let remaining = text;
    let key = 0;

    while (remaining.length > 0) {
      // Check for bold **...**
      const boldMatch = remaining.match(/^([\s\S]*?)\*\*(.+?)\*\*([\s\S]*)$/);
      // Check for inline code `...`
      const codeMatch = remaining.match(/^([\s\S]*?)`([^`]+)`([\s\S]*)$/);
      // Check for italic *...*
      const italicMatch = remaining.match(/^([\s\S]*?)\*([^*]+)\*([\s\S]*)$/);

      // Prioritize earliest match
      let firstMatch: { type: 'bold' | 'code' | 'italic'; index: number; full: string; before: string; inner: string; after: string } | null = null;

      if (boldMatch) {
        firstMatch = { type: 'bold', index: boldMatch[1].length, full: boldMatch[0], before: boldMatch[1], inner: boldMatch[2], after: boldMatch[3] };
      }
      if (codeMatch && (!firstMatch || codeMatch[1].length < firstMatch.index)) {
        firstMatch = { type: 'code', index: codeMatch[1].length, full: codeMatch[0], before: codeMatch[1], inner: codeMatch[2], after: codeMatch[3] };
      }
      if (italicMatch && (!firstMatch || italicMatch[1].length < firstMatch.index)) {
        firstMatch = { type: 'italic', index: italicMatch[1].length, full: italicMatch[0], before: italicMatch[1], inner: italicMatch[2], after: italicMatch[3] };
      }

      if (!firstMatch) {
        parts.push(<span key={key++}>{remaining}</span>);
        break;
      }

      if (firstMatch.before) {
        parts.push(<span key={key++}>{firstMatch.before}</span>);
      }

      if (firstMatch.type === 'bold') {
        parts.push(<strong key={key++} className="font-bold text-white">{firstMatch.inner}</strong>);
      } else if (firstMatch.type === 'code') {
        parts.push(<code key={key++} className="px-1.5 py-0.5 rounded-md bg-white/10 text-cyan-300 font-mono text-xs border border-white/10">{firstMatch.inner}</code>);
      } else if (firstMatch.type === 'italic') {
        parts.push(<em key={key++} className="italic text-white/90">{firstMatch.inner}</em>);
      }

      remaining = firstMatch.after;
    }

    return parts;
  };

  return (
    <div className={`space-y-3 leading-relaxed ${className}`}>
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-2" />;

        // Heading 3 ###
        if (trimmed.startsWith('### ')) {
          return (
            <h4 key={idx} className="text-base sm:text-lg font-bold text-white mt-4 mb-2 tracking-tight">
              {renderFormattedText(trimmed.slice(4))}
            </h4>
          );
        }

        // Heading 2 ##
        if (trimmed.startsWith('## ')) {
          return (
            <h3 key={idx} className="text-lg sm:text-xl font-extrabold text-white mt-5 mb-2 tracking-tight">
              {renderFormattedText(trimmed.slice(3))}
            </h3>
          );
        }

        // Heading 1 #
        if (trimmed.startsWith('# ')) {
          return (
            <h2 key={idx} className="text-xl sm:text-2xl font-black text-white mt-6 mb-3 tracking-tight">
              {renderFormattedText(trimmed.slice(2))}
            </h2>
          );
        }

        // Bullet list - or *
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <div key={idx} className="flex items-start gap-2.5 ps-2 text-white/80">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2 shrink-0" />
              <span>{renderFormattedText(trimmed.slice(2))}</span>
            </div>
          );
        }

        // Blockquote >
        if (trimmed.startsWith('> ')) {
          return (
            <blockquote key={idx} className="border-s-4 border-cyan-400/80 ps-4 py-1.5 my-2 rounded-r-xl bg-white/5 text-white/85 italic">
              {renderFormattedText(trimmed.slice(2))}
            </blockquote>
          );
        }

        // Regular paragraph
        return (
          <p key={idx} className="text-white/75">
            {renderFormattedText(trimmed)}
          </p>
        );
      })}
    </div>
  );
};
