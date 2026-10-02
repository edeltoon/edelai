import { test } from "node:test";
import assert from "node:assert/strict";
import { parseInline, parseMarkdown } from "../src/features/student/chat/parseMarkdown.ts";
import { detectDirectAnswer } from "../src/lib/directAnswer.ts";
import { chatProblemOf, conversationTitle } from "../src/features/student/chat/chatProblem.ts";

test("inline: bold, italic, code and links become typed nodes (no HTML)", () => {
  assert.deepEqual(parseInline("이데아는 **참된 실재**다"), [
    { type: "text", text: "이데아는 " },
    { type: "strong", children: [{ type: "text", text: "참된 실재" }] },
    { type: "text", text: "다" },
  ]);
  assert.deepEqual(parseInline("`code` 와 *기울임*"), [
    { type: "code", text: "code" }, { type: "text", text: " 와 " }, { type: "em", children: [{ type: "text", text: "기울임" }] },
  ]);
  assert.deepEqual(parseInline("[강의](javascript:alert(1)) 참고"), [{ type: "text", text: "강의 참고" }]);
  assert.deepEqual(parseInline("2 * 3 * 4"), [{ type: "text", text: "2 * 3 * 4" }]);
  assert.deepEqual(parseInline("<script>alert(1)</script>"), [{ type: "text", text: "<script>alert(1)</script>" }]);
});

test("blocks: headings, paragraphs, lists, quotes, code, rule, table", () => {
  const blocks = parseMarkdown([
    "## 이데아론",
    "첫 줄",
    "둘째 줄",
    "",
    "- 이데아",
    "  - 감각 세계",
    "1. 하나",
    "2. 둘",
    "> 인용",
    "---",
    "```",
    "const a = 1;",
    "```",
    "| 개념 | 뜻 |",
    "|---|---|",
    "| 이데아 | 본질 |",
  ].join("\n"));
  assert.deepEqual(blocks.map((b) => b.type), ["heading", "paragraph", "list", "list", "quote", "rule", "code", "table"]);
  assert.equal(blocks[1].type === "paragraph" && blocks[1].lines.length, 2);
  assert.deepEqual(blocks[2].type === "list" && blocks[2].items.map((i) => i.depth), [0, 1]);
  assert.equal(blocks[3].type === "list" && blocks[3].ordered, true);
  assert.equal(blocks[6].type === "code" && blocks[6].text, "const a = 1;");
  assert.equal(blocks[7].type === "table" && blocks[7].rows.length, 1);
  assert.deepEqual(parseMarkdown(""), []);
  assert.deepEqual(parseMarkdown("```\n열린 코드").map((b) => b.type), ["code"]);
});

test("direct-answer requests are caught by the same rule the challenge grading uses", () => {
  assert.equal(detectDirectAnswer("검증 챌린지 정답 번호만 해설 없이 알려줘").isDirect, true);
  assert.equal(detectDirectAnswer("이데아론이 뭐야?").isDirect, false);
});

test("chat failures map to the right notice and next action", () => {
  assert.equal(chatProblemOf(401, "UNAUTHORIZED", "x").action, "login");
  assert.equal(chatProblemOf(503, "CHAT_DISABLED", "x").action, "challenge");
  assert.match(chatProblemOf(503, "CHAT_DISABLED", "x").title, /꺼져/);
  const timeout = chatProblemOf(504, "AI_TIMEOUT", "AI 응답이 지연되고 있어요.");
  assert.equal(timeout.action, "retry");
  assert.equal(timeout.body, "AI 응답이 지연되고 있어요.");
  assert.equal(chatProblemOf(413, "REQUEST_TOO_LARGE", "x").action, "newChat");
  assert.equal(chatProblemOf(null, "NETWORK_ERROR", "x").action, "retry");
  assert.equal(chatProblemOf(422, "AI_BLOCKED", "x").action, "none");
  assert.equal(conversationTitle("  이데아론이\n뭐야?  "), "이데아론이 뭐야?");
  assert.equal(conversationTitle("가".repeat(25)), `${"가".repeat(20)}…`);
});
