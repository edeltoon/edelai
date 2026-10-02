import { test } from "node:test";
import assert from "node:assert/strict";
import { keywordItemGrades, type GradingClaim } from "../src/lib/challengeGrading.ts";
import {
  isContentlessReason, keywordConceptScore, keywordReasonGrade, ruleReasonFeedback,
} from "../src/lib/reasoning.ts";
import { averageScore, reasoningPoint } from "../src/lib/scoring.ts";
import { retrievalDate, seoulDateLabel } from "../src/lib/schedule.ts";
import type { ClaimAnswer } from "../src/types/student-records.ts";

const kw = ["이데아", "실재", "모방", "감각", "본질", "동굴", "그림자", "인식", "불완전"];

test("content-free reasons are detected; reasons with substance are not", () => {
  for (const text of [
    "기억이 나지 않는다.",
    "모르겠다",
    "잘 모르겠지만 그냥 맞는 것 같다고 생각한다.",
    "이데아가 뭔지 기억이 안 난다",
    "맞다고 생각합니다. 맞는 것 같아요. 그렇다고 봅니다.",
    "헷갈리는데 그냥 맞는 것 같아요",
  ]) assert.equal(isContentlessReason(text), true, text);
  for (const text of [
    "그냥 맞는 말 같다. 감각으로 경험한다고 했으니까.",
    "확실하지 않지만 이데아가 실재라고 배워서 감각 세계가 실재라는 말은 틀렸다.",
    "플라톤 얘기랑 좀 다른 것 같다. 이데아가 더 중요했던 걸로 기억한다.",
    "감각 세계는 우리가 보고 만지며 경험하는 현상의 세계라서 맞다고 생각한다.",
  ]) assert.equal(isContentlessReason(text), false, text);
});

test("keyword reason grade: content-free reasons score 0 even when long or with keywords", () => {
  assert.deepEqual(keywordReasonGrade("기억이 나지 않는다. 그래서 잘 모르겠지만 맞는 것 같다고 생각합니다.", kw), { score: 0, basis: "contentless" });
  assert.deepEqual(keywordReasonGrade("이데아가 뭔지 기억이 안 나서 모르겠어요", kw), { score: 0, basis: "contentless" });
  assert.deepEqual(keywordReasonGrade("동굴 비유는 배운 내용", kw), { score: 0, basis: "short" });
  assert.deepEqual(keywordReasonGrade("수업에서 들은 설명과 같은 이야기라서 맞다고 판단했어요", kw), { score: 1, basis: "noKeyword" });
  assert.deepEqual(keywordReasonGrade("동굴 밖으로 나가며 그림자가 모방임을 아는 과정이 인식의 단계를 보여준다.", kw), { score: 2, basis: "keyword" });
});

test("concept explanation: '모르겠다' with keywords is 0, short valid explanation keeps its score", () => {
  assert.equal(keywordConceptScore("이데아가 실재인지 모르겠다", kw), 0);
  assert.equal(keywordConceptScore("이데아가 실재다", kw), 2);
  assert.equal(keywordConceptScore("확실하지 않지만 이데아가 진정한 실재이고 감각 세계는 그 모방이다", kw), 2);
});

test("rule feedback always matches the score", () => {
  assert.match(ruleReasonFeedback(0, false, { basis: "contentless" }), /판단 근거가 없는 이유는 0점/);
  assert.match(ruleReasonFeedback(0, false, { basis: "short" }), /0점/);
  assert.match(ruleReasonFeedback(1, false), /연결이 약해요/);
  assert.match(ruleReasonFeedback(2, false), /설명했어요/);
  assert.match(ruleReasonFeedback(2, true), /이유 점수는 0/);
  // 칭찬 문구는 2점에만, 0점 문구는 0점에만
  for (const score of [0, 1, 2]) {
    const text = ruleReasonFeedback(score, false);
    assert.equal(/0점/.test(text), score === 0, text);
  }
});

const claims: GradingClaim[] = [
  { claimId: "ch1-a", isError: false, explanation: "맞는 주장" },
  { claimId: "ch1-b", isError: true, explanation: "관계가 뒤집힘",
    errorCard: { errorType: "개념 반전", correctClaim: "이데아가 실재", correctKeywords: ["이데아", "실재", "모방", "감각"], evidenceId: "ev-w3-p12", evidenceLabel: "3주차" } },
  { claimId: "ch1-c", isError: false, explanation: "맞는 주장" },
];

test("missed error keeps the rule score but the feedback says it was missed", () => {
  const answers: ClaimAnswer[] = [
    { claimId: "ch1-a", judgment: "correct", confidence: 70, reasoning: "기억이 나지 않는다. 그냥 맞는 것 같다.", pastedChars: 0 },
    { claimId: "ch1-b", judgment: "correct", confidence: 70, reasoning: "이데아는 감각 세계를 모방한 것이라고 배워서 맞다고 생각했다.", pastedChars: 0 },
    { claimId: "ch1-c", judgment: "correct", confidence: 70, reasoning: "동굴의 비유는 인식의 단계를 보여 주는 이야기라서 맞다.", pastedChars: 0 },
  ];
  const items = keywordItemGrades(claims, answers, kw);
  assert.equal(items.reasoning["ch1-a"].score, 0);
  assert.match(items.reasoning["ch1-a"].feedback, /판단 근거가 없는 이유는 0점/);
  assert.equal(items.reasoning["ch1-b"].score, 2);
  assert.match(items.reasoning["ch1-b"].feedback, /오류는 놓쳤어요/);
  assert.equal(items.reasoning["ch1-c"].score, 2);
  assert.doesNotMatch(items.reasoning["ch1-c"].feedback, /놓쳤/);
  assert.deepEqual(items.concept, {});
});

test("average shown on the result screen matches the rounded reasoning point", () => {
  assert.equal(averageScore([]), 0);
  assert.equal(averageScore([2, 2, 0]).toFixed(1), "1.3");
  assert.equal(reasoningPoint([2, 2, 0]), 1);
  assert.equal(averageScore([2, 2, 2]), 2);
});

test("retrieval date is labeled in Asia/Seoul regardless of the runtime time zone", () => {
  // 10/3 15:30 UTC = 한국 10/4 00:30 제출 → 7일 뒤 한국 10/11(일)
  const scheduled = retrievalDate("2026-10-03T15:30:00.000Z");
  assert.equal(scheduled, "2026-10-10T15:30:00.000Z");
  assert.equal(seoulDateLabel(scheduled), "10월 11일(일)");
  assert.equal(seoulDateLabel("2026-10-10T03:00:00.000Z"), "10월 10일(토)");
  assert.equal(seoulDateLabel("not-a-date"), "");
});
