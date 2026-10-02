---
name: mock-data
description: src/data/의 목데이터(과목, 개념, 오류 카드, 챌린지, 학생 기록, 교수 집계, 사전 작성 AI 응답)를 만들거나 수정할 때 사용. 타입 스키마와 데이터 작성 규칙.
paths: "src/data/**"
---

# 목데이터 스키마와 작성 규칙

모든 화면은 `src/data/`만 바라본다. 실제 API가 생기면 이 폴더만 교체하면 되도록 유지한다.

## 타입 (`src/data/types.ts`) — 필드 이름을 바꿀 때는 사용자에게 먼저 확인
```ts
export type Role = 'student' | 'professor';
export type ErrorType = '개념 반전' | '개념 혼동' | '근거 누락' | '허위 출처';

export interface Course { id: string; code: string; name: string; term: string; professorName: string; learningRate: number; }
export interface Concept { id: string; courseId: string; name: string; keywords: string[]; }
export interface Evidence { id: string; label: string; }            // 예: "강의자료 3주차 12쪽"
export interface ErrorCard {
  id: string; conceptId: string; wrongClaim: string; correctClaim: string;
  correctKeywords: string[]; evidenceId: string; errorType: ErrorType;
  difficulty: '하' | '중' | '상'; approvalStatus: 'pending' | 'approved' | 'rejected'; approvedBy?: string;
}
export interface Claim { id: string; text: string; errorCardId?: string; } // errorCardId 있으면 오류 주장
export interface Challenge { id: string; courseId: string; question: string; claims: Claim[]; evidenceOptions: string[]; }
export interface ClaimAnswer { claimId: string; judgment: 'correct' | 'wrong'; confidence: number; reasoning: string; correction?: string; evidenceId?: string; pasted?: boolean; }
export interface Submission { challengeId: string; studentId: string; answers: ClaimAnswer[]; submittedAt: string; directAnswerFlag: boolean; retrievalScheduledAt: string; }
export interface StudentSummary { id: string; name: string; major: string; discoveryRate: number; calibration: number; retrievalScore: number | null; directAnswerAttempts: number; reasoningCompletion: number; flags: string[]; }
export interface ClassAnalytics { courseId: string; week: number; enrolled: number; discoveryRate: number; calibration: number; retrievalScore: number; misconceptionByConcept: { conceptId: string; confusionRate: number; confusedWith?: string }[]; aiAcceptanceBias: number; aiSummary: string; }
export interface ScriptedAnswer { trigger: string[]; paragraphs: string[]; } // 일반 학습 모드 사전 응답
```

## 파일 구성
- `courses.ts`: 학생 나의강좌용 과목 7개(스크린샷처럼 공업수학1, 미적분학2, 선형대수, 일반물리학1, 서양철학:쟁점과토론, 고급C프로그래밍및실습, 대학영어). **서양철학만 클릭 가능**, 나머지는 "준비 중" 툴팁.
- `philosophy.ts`: 개념 5개(이데아론, 동굴의 비유, 소크라테스 문답법, 아리스토텔레스 형상과 질료, 덕 윤리), 오류 카드 10개(개념당 2개, 그중 2개는 `pending` 상태로 승인 대기 화면용), 챌린지 2개, 근거 목록.
- `scripted.ts`: 일반 학습 모드 사전 응답. 키워드 매칭으로 고르고, 매칭 없으면 "강의자료 범위 밖 질문" 안내.
- `students.ts`: 학생 5명 요약 + 데모 주인공 "김세종"의 초기 상태.
- `analytics.ts`: 3주차 반 전체 집계(42명 기준)와 AI 요약 문단. PLAN.md 6장 예시 수치(27/42 혼동, 수용 26%)와 일치시킬 것.

## 고정 id (정적 빌드 라우트가 이 값으로 만들어지므로 바꾸기 전에 사용자에게 확인)
- 과목: 서양철학 `phil` (나머지 6개 과목은 클릭 불가라 라우트 없음)
- 챌린지: `ch1`, `ch2`
- 학생: `s1`~`s5`, 데모 주인공 김세종은 `s1`
- 동적 라우트의 `generateStaticParams`는 위 id를 하드코딩하지 말고 데이터 배열에서 뽑는다.

## 내용 규칙
- 철학 내용 오류 카드는 담당 팀원이 검수한 문장만 넣는다. 새 문장을 지어내야 하면 `// TODO(검수 필요)` 주석을 달고 사용자에게 알린다.
- 오류 주장은 그럴듯하게, 하지만 강의자료 근거 하나로 반박 가능하게. 의학·법률·안전 내용 금지.
- 챌린지 1개당 주장 4~5개, 그중 오류 2개. 오류가 연속으로 붙지 않게 배치.
- 실명·실제 학번 금지. 학생 이름은 가상 이름, 학번은 `2026XXXXXX` 형식의 가짜 값.
- 교수 KpiRow 값은 `analytics.ts`(42명 집계)에서만 가져온다. 학생 표는 5명만 보여주고 "외 37명"으로 표시. 김세종의 실제 제출 결과가 생기면 학생 표의 김세종 행만 그 값으로 갱신한다.
