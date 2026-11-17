import React from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import './MathText.css';

interface MathTextProps {
  text: string;
}

interface TextSegment {
  value: string;
  isMath: boolean;
  display?: boolean;
}

const explicitMathPattern = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$|\\\(([\s\S]+?)\\\)|\\\[([\s\S]+?)\\\]/g;
const bareMathPatterns = [
  /\\[A-Za-z]+(?:_(?:\{[^{}]*\}|[A-Za-z0-9]+)|\^(?:\{[^{}]*\}|[A-Za-z0-9]+))*/g,
  /[A-Za-z][A-Za-z0-9]*['′]*(?:(?:_(?:\{[^{}]*\}|[A-Za-z0-9]+))|(?:\^(?:\{[^{}]*\}|[A-Za-z0-9]+))|\([^()\n]*\))+/g,
  /\b[A-Za-z][A-Za-z0-9]*\s*(?:>=|<=|!=|=|>|<)\s*(?:-?\d+(?:\.\d+)?|[A-Za-z][A-Za-z0-9]*)/g,
];

function normalizeLegacyMath(expression: string): string {
  return expression
    .replace(/\b(sum|prod|lim)_(?=\{)/g, '\\$1_')
    .replace(/\b(sum|prod|lim)\^(?=\{)/g, '\\$1^')
    .replace(/>=/g, ' \\ge ')
    .replace(/<=/g, ' \\le ')
    .replace(/!=/g, ' \\ne ');
}

function splitBareMath(text: string): TextSegment[] {
  const matches: Array<{ start: number; end: number; value: string }> = [];

  for (const pattern of bareMathPatterns) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      matches.push({ start: match.index, end: match.index + match[0].length, value: match[0] });
      if (match[0].length === 0) pattern.lastIndex += 1;
    }
  }

  matches.sort((a, b) => a.start - b.start || b.end - a.end);
  const segments: TextSegment[] = [];
  let cursor = 0;

  for (const match of matches) {
    if (match.start < cursor) continue;
    if (match.start > cursor) segments.push({ value: text.slice(cursor, match.start), isMath: false });
    segments.push({ value: normalizeLegacyMath(match.value), isMath: true });
    cursor = match.end;
  }

  if (cursor < text.length) segments.push({ value: text.slice(cursor), isMath: false });
  return segments.length > 0 ? segments : [{ value: text, isMath: false }];
}

function parseMathText(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let cursor = 0;
  explicitMathPattern.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = explicitMathPattern.exec(text)) !== null) {
    if (match.index > cursor) segments.push(...splitBareMath(text.slice(cursor, match.index)));
    const value = match[1] ?? match[2] ?? match[3] ?? match[4] ?? '';
    segments.push({ value, isMath: true, display: Boolean(match[1] || match[4]) });
    cursor = match.index + match[0].length;
  }

  if (cursor < text.length) segments.push(...splitBareMath(text.slice(cursor)));
  return segments.length > 0 ? segments : [{ value: text, isMath: false }];
}

export const MathText: React.FC<MathTextProps> = ({ text }) => (
  <>
    {parseMathText(text).map((segment, index) => {
      if (!segment.isMath) return <React.Fragment key={index}>{segment.value}</React.Fragment>;

      try {
        const html = katex.renderToString(segment.value, {
          displayMode: segment.display,
          throwOnError: false,
          trust: false,
        });
        return (
          <span
            key={index}
            className={segment.display ? 'quiz-math-display' : undefined}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      } catch {
        return <React.Fragment key={index}>{segment.value}</React.Fragment>;
      }
    })}
  </>
);
