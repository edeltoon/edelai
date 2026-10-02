# 학생 기록 저장 키와 API 계약 (학생 화면 ↔ 교수 화면·서버 API)

학생 화면이 무엇을 어디에 저장하는지, 교수 화면과 서버 API 담당이 무엇을 읽고 만들어야 하는지 정리한 문서입니다.
타입 원본은 코드입니다. 이 문서와 코드가 다르면 코드가 맞습니다.

| 무엇 | 파일 |
|---|---|
| 세션 타입 (확정) | `src/types/session.ts` |
| 학생 기록 타입 (초안) | `src/types/student-records.ts` |
| 콘텐츠 타입 | `src/types/content.ts` |
| 학생 화면 ↔ 서버 API 요청·응답 (계약 초안) | `src/features/student/services/ai.types.ts` |
| 저장소 인터페이스와 임시 구현 | `src/features/student/services/store.ts` |
| 점수·지표 계산 (순수 함수, 서버에서도 사용 가능) | `src/lib/scoring.ts`, `calibration.ts`, `reasoning.ts`, `challengeInput.ts`, `directAnswer.ts`, `schedule.ts` |

## 1. 현재 상태와 교체 계획

- **저장소는 임시 localStorage입니다.** 같은 브라우저 안에서만 학생 기록이 보입니다. `docs/ARCHITECTURE.md` 기준으로도 localStorage는 공유 저장소가 아닙니다.
  - 교수 화면이 지금 학생 기록을 읽으려면 같은 브라우저에서 `studentStore.readStudentRecords('s1')`을 호출합니다.
- **서버 저장소가 정해지면 서버 API 담당의 API로 교체합니다.**
  - 제출 저장·채점은 `POST /api/challenges/{id}/submissions` 응답이 원본이 되고, localStorage는 화면 캐시가 됩니다.
  - 교수 화면은 서버의 학생 기록 조회 API를 씁니다.
  - `StudentStore` 인터페이스가 Promise 기반이라, `store.ts` 맨 아래 `studentStore` 한 줄만 바꾸면 학생 화면 코드는 그대로 둘 수 있습니다.
- **검증 챌린지 채점은 지금 mock입니다** (`NEXT_PUBLIC_CHALLENGE_API` 기본값 `mock`).
  - 채점 결과에 `grader: 'mock'`이 남고, 화면에 "시연용 예시 채점"으로 표시합니다.
  - mock 정답 키(`services/mock/answerKey.ts`)는 제출 시점에만 동적 import합니다. 제출 전에는 화면·props·네트워크 응답에 오류 위치가 없습니다.
  - 다만 청크 자체는 클라이언트 번들 산출물에 있습니다. 서버 채점이 생기면 `NEXT_PUBLIC_CHALLENGE_API=live`로 바꾸고 이 파일을 지웁니다.
- **자유 학습은 실제 `POST /api/chat`을 씁니다** (`docs/API.md`). 실패하면 오류만 보여주고 mock으로 대체하지 않습니다.
- **교수 승인 오류 카드 → 학생 챌린지 연결은 통합 단계에서 처리합니다.** 현재는 `src/features/student/content/challenges.ts`를 씁니다.
  - mock 정답 키는 `approvalStatus === 'approved'`인 오류 카드만 채점에 씁니다.
- **강의자료 근거는 아직 API에 없습니다.**
  - 자유 학습 답변의 개념 카드·근거 칩: `content/studyAids.ts`가 학생 질문 키워드로 찾아 붙입니다. 매칭이 없으면 붙이지 않습니다.
  - 근거 원문·챌린지 근거 선택지: `content/lecture.ts`.
  - **API가 근거(강의자료 검색 결과)를 주면 이 두 파일 대신 API 응답으로 교체합니다.** 쪽수·발췌문은 실제 강의자료 전 초안입니다(`TODO(검수 필요)`).

## 2. localStorage 키 (접두사 `edeltoon:`, 값은 JSON)

| 키 | 타입 | 쓰는 곳 → 읽는 곳 |
|---|---|---|
| `edeltoon:session` | `Session` | 역할 선택 화면 → 학생·교수 화면 (`src/lib/session.ts`) |
| `edeltoon:student-index` | `string[]` | 기록이 있는 학생 id 목록 → 교수 화면 |
| `edeltoon:student:{studentId}:conversations` | `Conversation[]` | 자유 학습 대화(질문, AI 답, 정답 직행 안내) → 교수 학생 기록(원문 열람) |
| `edeltoon:student:{studentId}:direct-answer-attempts` | `DirectAnswerAttempt[]` | 정답 직행 요청 시도 → 교수 학생 기록(과정 보호 지표) |
| `edeltoon:student:{studentId}:drafts` | `Record<challengeId, ChallengeDraft>` | 제출 전 입력(새로고침 유지). **교수 화면은 읽지 않음** |
| `edeltoon:student:{studentId}:submissions` | `ChallengeSubmission[]` | 챌린지 제출·점수·해설·해설 전후 설명 → 교수 대시보드·학생 기록 |
| `edeltoon:student:{studentId}:retrievals` | `RetrievalResult[]` | 재인출 퀴즈 결과 (첫 목표 이후 구현) |

- 같은 탭 변경 알림 이벤트: `edeltoon:store-change` (기록), `edeltoon:session-change` (세션). 다른 탭은 `storage` 이벤트로 받습니다. `studentStore.subscribe()`가 둘 다 처리합니다.
- 시연 리셋은 `studentStore.resetAll({ keepSession: true })`이며 `edeltoon:*`를 지웁니다.

## 3. 교수 화면이 주로 쓸 필드 (`ChallengeSubmission`)

| 필드 | 뜻 |
|---|---|
| `answers[]` | 주장별 판정(`judgment`), 확신도(`confidence` 0~100), 본인 생각(`reasoning`), 올바른 개념(`correction`), 근거(`evidenceId`), 붙여넣은 글자 수(`pastedChars`) |
| `score` | `{ judgment 0~1, reasoning 0~2, concept 0~2, evidence 0~2, penalty 0/-2, total 0~7 }` |
| `calibration` | 확신도 보정 정확도 0~100 |
| `claimGrades[]` | 주장별 오류 여부, 판정 정오, 본인 생각 점수, 해설 |
| `errorReveals[]` | 오류 주장의 오류 유형, 정답 설명, 근거, 개념·근거 점수 |
| `directAnswerFlag`, `pastedRatio` | 과정 우회 판단 근거 (직행 시도 + 붙여넣기 비율 > 0.5 이면 −2) |
| `beforeSummary`, `afterExplanation` | 해설 전 생각 요약 / 해설 후 내 설명 (설명 변화 비교) |
| `retrievalScheduledAt` | 1주 뒤 재인출 예약 시각 |
| `grader` | `'mock'`(시연용 예시 채점) / `'server'` |

점수 규칙(설계안 7점): 판정 +1(모든 주장 정확할 때만), 이유 +2(주장별 평균), 개념 +2·근거 +2(오류 주장 기준), 과정 우회 −2.
세부 식과 경계값은 `src/lib/scoring.ts` 주석을 보세요.

## 4. 서버 API 담당에게 요청할 API (계약 초안)

`ai.types.ts`에 요청·응답 타입과 채점 규칙 주석이 있습니다. 오류 형식은 `/api/chat`과 같은 `{ ok: false, error: { code, message } }`입니다.

| 메서드·경로 | 요청 | 응답 |
|---|---|---|
| `GET /api/challenges/{challengeId}?studentId=` | — | `{ ok, challenge: ChallengePublic }`. 오류 개수만 있고 오류 위치 없음 |
| `POST /api/challenges/{challengeId}/submissions` | `SubmitChallengeRequest` | `{ ok, submission: ChallengeSubmission }`. 이때 처음으로 정답·해설 포함 |
| `PATCH /api/submissions/{submissionId}` | `{ afterExplanation }` | `{ ok, submission }` |

학생 기록 조회·평가 확정·오류 카드 승인 API는 교수 화면 쪽에서 정하고, 학생 화면은 위 세 개만 씁니다.
