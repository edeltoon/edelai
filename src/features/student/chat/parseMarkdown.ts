// AI 답변용 작은 마크다운 해석기 (순수 함수). 결과는 React 요소로만 그린다(Markdown.tsx). HTML 문자열을 만들지 않는다.
// 지원: 제목(#~####), 문단·줄바꿈, 목록(-, *, +, •, 1.), 인용(>), 코드 블록(```), 구분선(---), 표(| a | b |),
//       굵게(**), 기울임(*), 인라인 코드(`). 링크 [글](주소)는 글만 남긴다(답변 속 외부 주소로 이동시키지 않음).
// 추가 라이브러리 없이 Claude 답변에 흔한 형식만 다룬다. 모르는 형식은 일반 문단으로 보여 준다.
// node 테스트에서도 불러오도록 브라우저 API를 쓰지 않는다.

export type Inline =
  | { type: 'text'; text: string }
  | { type: 'strong'; children: Inline[] }
  | { type: 'em'; children: Inline[] }
  | { type: 'code'; text: string };

export interface ListItem {
  /** 들여쓰기 단계 0~3 */
  depth: number;
  inlines: Inline[];
}

export type Block =
  | { type: 'heading'; level: 1 | 2 | 3 | 4; inlines: Inline[] }
  | { type: 'paragraph'; lines: Inline[][] }
  | { type: 'list'; ordered: boolean; start: number; items: ListItem[] }
  | { type: 'quote'; lines: Inline[][] }
  | { type: 'code'; text: string }
  | { type: 'rule' }
  | { type: 'table'; header: Inline[][]; rows: Inline[][][] };

const INLINE_TOKEN = /(`[^`\n]+`)|(\*\*[^*\n]+?\*\*)|(__[^_\n]+?__)|(\*[^*\s][^*\n]*?\*)|(\[[^\]\n]+\]\((?:[^()\s]|\([^()\s]*\))*\))/g;

/**
 * 한 줄 안의 강조·코드.
 * 예) '이데아는 **참된 실재**다' → text, strong(text), text / '`a`' → code / '[강의](http://x)' → text '강의'
 *     '2 * 3 * 4' → text 그대로 (별표 뒤 공백이면 기울임 아님)
 */
export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  let last = 0;
  const push = (t: string) => {
    if (!t) return;
    const prev = out[out.length - 1];
    if (prev?.type === 'text') prev.text += t;
    else out.push({ type: 'text', text: t });
  };
  for (const m of text.matchAll(INLINE_TOKEN)) {
    const at = m.index ?? 0;
    push(text.slice(last, at));
    const token = m[0];
    if (m[1]) out.push({ type: 'code', text: token.slice(1, -1) });
    else if (m[2] || m[3]) out.push({ type: 'strong', children: parseInline(token.slice(2, -2)) });
    else if (m[4]) out.push({ type: 'em', children: parseInline(token.slice(1, -1)) });
    else push(token.slice(1, token.indexOf('](')));
    last = at + token.length;
  }
  push(text.slice(last));
  return out;
}

const FENCE = /^\s*```/;
const HEADING = /^(#{1,6})\s+(.+?)\s*#*\s*$/;
const RULE = /^\s*([-*_])(\s*\1){2,}\s*$/;
const LIST_ITEM = /^(\s*)([-*+•]|(\d+)[.)])\s+(.*)$/;
const QUOTE = /^\s*>\s?(.*)$/;
const TABLE_SEPARATOR = /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/;

function tableCells(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());
}

/**
 * 답변 전체 → 블록 목록.
 * 예) '' → [], '## 정리\n- 이데아\n- 감각 세계' → [heading 2, list(2개)],
 *     '첫 줄\n둘째 줄\n\n새 문단' → [paragraph(2줄), paragraph(1줄)], '```\ncode\n```' → [code 'code']
 */
export function parseMarkdown(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i += 1;
      continue;
    }
    if (FENCE.test(line)) {
      const body: string[] = [];
      i += 1;
      while (i < lines.length && !FENCE.test(lines[i])) body.push(lines[i++]);
      i += 1; // 닫는 ``` (없으면 끝까지)
      blocks.push({ type: 'code', text: body.join('\n') });
      continue;
    }
    const heading = HEADING.exec(line);
    if (heading) {
      blocks.push({ type: 'heading', level: Math.min(4, heading[1].length) as 1 | 2 | 3 | 4, inlines: parseInline(heading[2]) });
      i += 1;
      continue;
    }
    if (RULE.test(line)) {
      blocks.push({ type: 'rule' });
      i += 1;
      continue;
    }
    if (line.includes('|') && i + 1 < lines.length && TABLE_SEPARATOR.test(lines[i + 1]) && lines[i + 1].includes('-')) {
      const header = tableCells(line).map(parseInline);
      const rows: Inline[][][] = [];
      i += 2;
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) rows.push(tableCells(lines[i++]).map(parseInline));
      blocks.push({ type: 'table', header, rows });
      continue;
    }
    const first = LIST_ITEM.exec(line);
    if (first) {
      const ordered = first[3] !== undefined;
      const items: ListItem[] = [];
      while (i < lines.length) {
        const m = LIST_ITEM.exec(lines[i]);
        // 맨 바깥 단계에서 번호 목록 ↔ 글머리 목록이 바뀌면 새 목록
        if (m && items.length > 0 && m[1].length === 0 && (m[3] !== undefined) !== ordered) break;
        if (m) {
          items.push({ depth: Math.min(3, Math.floor(m[1].replace(/\t/g, '  ').length / 2)), inlines: parseInline(m[4]) });
          i += 1;
        } else if (lines[i].trim() && /^\s{2,}\S/.test(lines[i]) && items.length > 0) {
          // 목록 항목이 다음 줄로 이어짐
          const prev = items[items.length - 1];
          prev.inlines = [...prev.inlines, { type: 'text', text: ' ' }, ...parseInline(lines[i].trim())];
          i += 1;
        } else break;
      }
      blocks.push({ type: 'list', ordered, start: ordered ? Number(first[3]) : 1, items });
      continue;
    }
    if (QUOTE.test(line)) {
      const quoted: Inline[][] = [];
      while (i < lines.length && QUOTE.test(lines[i])) quoted.push(parseInline(QUOTE.exec(lines[i++])![1]));
      blocks.push({ type: 'quote', lines: quoted });
      continue;
    }
    const para: Inline[][] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !FENCE.test(lines[i]) &&
      !HEADING.test(lines[i]) &&
      !RULE.test(lines[i]) &&
      !LIST_ITEM.test(lines[i]) &&
      !QUOTE.test(lines[i])
    ) {
      para.push(parseInline(lines[i].trim()));
      i += 1;
    }
    blocks.push({ type: 'paragraph', lines: para });
  }
  return blocks;
}
