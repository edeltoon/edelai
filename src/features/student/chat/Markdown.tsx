import { Fragment, type ReactNode } from 'react';
import { parseMarkdown, type Block, type Inline } from './parseMarkdown';

// AI 답변을 문서형으로 보여 준다. 문자열은 모두 React 텍스트로 넣는다(HTML로 해석하지 않음).

function renderInlines(inlines: Inline[]): ReactNode {
  return inlines.map((node, i) => {
    switch (node.type) {
      case 'text':
        return <Fragment key={i}>{node.text}</Fragment>;
      case 'strong':
        return (
          <strong key={i} className="font-semibold">
            {renderInlines(node.children)}
          </strong>
        );
      case 'em':
        return <em key={i}>{renderInlines(node.children)}</em>;
      case 'code':
        return (
          <code key={i} className="rounded-control bg-subtle px-1 py-0.5 text-[0.95em]">
            {node.text}
          </code>
        );
    }
  });
}

function renderLines(lines: Inline[][]): ReactNode {
  return lines.map((line, i) => (
    <Fragment key={i}>
      {i > 0 && <br />}
      {renderInlines(line)}
    </Fragment>
  ));
}

const HEADING_CLASS = {
  1: 'text-lead font-bold',
  2: 'text-lead font-bold',
  3: 'text-body font-bold',
  4: 'text-body font-semibold',
} as const;

const DEPTH_CLASS = ['', 'ml-5', 'ml-10', 'ml-14'];

function renderBlock(block: Block, key: number): ReactNode {
  switch (block.type) {
    case 'heading': {
      const Tag = (['h3', 'h3', 'h4', 'h5'] as const)[block.level - 1];
      return (
        <Tag key={key} className={`${HEADING_CLASS[block.level]} text-ink`}>
          {renderInlines(block.inlines)}
        </Tag>
      );
    }
    case 'paragraph':
      return <p key={key}>{renderLines(block.lines)}</p>;
    case 'list': {
      const Tag = block.ordered ? 'ol' : 'ul';
      return (
        <Tag
          key={key}
          start={block.ordered && block.start !== 1 ? block.start : undefined}
          className={`space-y-1 pl-5 ${block.ordered ? 'list-decimal' : 'list-disc'}`}
        >
          {block.items.map((item, i) => (
            <li key={i} className={DEPTH_CLASS[item.depth]}>
              {renderInlines(item.inlines)}
            </li>
          ))}
        </Tag>
      );
    }
    case 'quote':
      return (
        <blockquote key={key} className="border-l-2 border-line-strong pl-4 text-ink-sub">
          {renderLines(block.lines)}
        </blockquote>
      );
    case 'code':
      return (
        <pre key={key} className="overflow-x-auto rounded-block bg-subtle px-4 py-3 text-caption">
          <code>{block.text}</code>
        </pre>
      );
    case 'rule':
      return <hr key={key} className="border-line" />;
    case 'table':
      return (
        <div key={key} className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-body">
            <thead>
              <tr className="border-b border-line-strong">
                {block.header.map((cell, i) => (
                  <th key={i} className="px-3 py-2 font-semibold">
                    {renderInlines(cell)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, r) => (
                <tr key={r} className="border-b border-line">
                  {row.map((cell, c) => (
                    <td key={c} className="px-3 py-2 align-top">
                      {renderInlines(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}

/** AI 답변 본문 (마크다운 → 문서형 문단) */
export function Markdown({ text }: { text: string }) {
  return <div className="space-y-3 text-body leading-relaxed text-ink">{parseMarkdown(text).map(renderBlock)}</div>;
}
