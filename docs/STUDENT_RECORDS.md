# 학생 기록 저장과 서버 API 계약 (학생 화면 ↔ 서버 API·교수 화면)

학생 화면이 무엇을 어디에 저장하는지, 서버 API 담당이 무엇을 만들어야 하는지 정리한 문서입니다.
타입 원본은 코드입니다. 이 문서와 코드가 다르면 코드가 맞습니다.

## 0. 결정: Supabase + 서버 API로 확정

- 저장소는 **Supabase(Postgres)**입니다. **DB 접근은 서버 API 라우트(`src/app/api/**`)에서만** 합니다(서버 API 담당).
- 학생 화면은 DB를 모르고, `src/features/student/services/store.ts`의 `StudentStore` 인터페이스만 씁니다.
- 비밀 값(`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY` 등)은 `.env.local`에만 둡니다. `NEXT_PUBLIC_` 접두사는 쓰지 않습니다.
- 학생 화면이 쓰는 공개 설정은 `NEXT_PUBLIC_STORE_MODE` 하나뿐입니다(비밀 아님).

| 무엇 | 파일 |
|---|---|
| 저장소 인터페이스 + **서버 API 계약(요청·응답 타입)** | `src/features/student/services/store.types.ts` |
| 구현 선택 (`NEXT_PUBLIC_STORE_MODE`) | `src/features/student/services/store.ts` |
| local 구현 (localStorage) | `src/features/student/services/store.local.ts` |
| server 구현 (`/api/student/*` 호출) | `src/features/student/services/store.server.ts`, `serverApi.ts` |
| 자유 학습 AI (`/api/chat`) | `src/features/student/services/ai.ts`, `ai.live.ts`, `ai.types.ts` |
| 세션 타입 (확정) / 학생 기록 타입 / 콘텐츠 타입 | `src/types/session.ts`, `student-records.ts`, `content.ts` |
| 점수·지표 계산 (순수 함수, 서버 채점에서도 그대로 사용 가능) | `src/lib/scoring.ts`, `calibration.ts`, `reasoning.ts`, `challengeInput.ts`, `directAnswer.ts`, `schedule.ts` |

## 1. 학생 쪽 전환 방법 (`NEXT_PUBLIC_STORE_MODE`)

`.env.local`에 아래 줄을 두고 개발 서버를 재시작합니다. 없으면 `local`입니다.

```
# 학생 기록 저장소: local(브라우저 저장 + 학생 화면 예시 채점, 기본) | server(/api/student/* 서버 API)
NEXT_PUBLIC_STORE_MODE=local
```

| | `local` (기본) | `server` |
|---|---|---|
| 챌린지 조회·제출·채점 | 학생 화면 mock (`ai.mock.ts`, 키워드 규칙, `grader: 'mock'`, 화면에 "시연용 예시 채점") | `/api/student/challenges/...` (서버 채점, `grader: 'server'`) |
| 제출·해설 후 설명·정답 직행 시도·재인출 | localStorage | `/api/student/*` → Supabase |
| 대화 기록 | localStorage | localStorage (**질문 1**) |
| 제출 전 입력(draft) | localStorage | localStorage (서버 불필요) |
| 실패 시 | — | 오류 문구를 화면에 그대로 표시. **local로 몰래 대체하지 않음** |
| 용도 | 서버 없이 노트북 한 대로 시연 (끝까지 유지) | 실제 서비스 |

- 시연 중 네트워크 문제가 생기면 `local`로 바꾸고 재시작합니다. 그 브라우저 안에서 학생·교수 화면을 함께 시연할 수 있습니다.
- 자유 학습은 두 모드 모두 실제 `POST /api/chat`을 씁니다. 키가 없으면 안내 문구가 나옵니다.

## 2. 서버 API 담당에게 요청할 엔드포인트

타입은 `store.types.ts`의 "서버 API 계약"에 있고, 경로 목록은 `studentApi`입니다.
- **학생 식별**: 실제 인증이 아직 없으므로 세션의 `userId`(예: `s1`)를 보냅니다. GET은 쿼리, POST·PATCH는 본문에 넣습니다. 인증이 생기면 서버가 세션에서 꺼내고 이 값은 무시해도 됩니다.
- **오류 형식**: `/api/chat`과 같습니다. HTTP 상태 코드 + `{ ok: false, error: { code, message } }`. `message`는 학생에게 그대로 보이므로 해요체 한국어로 써 주세요.
- **성공 형식**: `{ ok: true, ... }`

| # | 메서드·경로 | 요청 | 성공 응답 | 비고 |
|---|---|---|---|---|
| 1 | `GET /api/student/challenges/{challengeId}?userId=` | — | `{ ok, challenge: ChallengePublic }` | **교수 승인 오류 카드로 만든 챌린지만.** 오류 개수(`errorCount`)만 있고 오류 위치·정답·`errorCardId`는 없음. 404 `CHALLENGE_NOT_FOUND`, 409 `CHALLENGE_NOT_APPROVED` |
| 2 | `POST /api/student/challenges/{challengeId}/submissions` | `SubmitChallengeRequest` (`userId`, `courseId`, `answers`, `directAnswerFlag`, `startedAt`) | `{ ok, submission: ChallengeSubmission }` | 서버가 채점·저장. 이 응답에서 처음으로 정답·해설 포함. 입력 미완성 400 `INCOMPLETE_SUBMISSION`. 채점 규칙은 `store.types.ts` 주석 |
| 3 | `PATCH /api/student/submissions/{submissionId}` | `{ userId, afterExplanation }` (1~1,000자) | `{ ok, submission }` | 해설 후 내 설명 |
| 4 | `GET /api/student/records?userId=` | — | `{ ok, records: StudentRecords }` | 제출·정답 직행 시도·재인출. 대화 기록은 질문 1 결정 전까지 빈 배열이어도 됨 |
| 5 | `POST /api/student/direct-answer-attempts` | `{ userId, courseId, conversationId, text, matched, at }` | `{ ok, attempt: DirectAnswerAttempt }` | 정답 직행 요청 기록 (감점 아님, 교수 과정 지표용) |
| 6 | `POST /api/student/retrievals` | `SaveRetrievalRequest` | `{ ok, retrieval: RetrievalResult }` | 재인출 퀴즈 결과 (첫 목표 이후) |
| 7 | `POST /api/student/demo-reset` | `{ userId }` | `{ ok }` | 시연 리셋. 이 학생의 제출·시도·재인출 삭제 |

교수 화면용 API(오류 카드 승인·반려, 학생 목록·기록 조회, 평가 확정)는 서버 API 담당이 정합니다.
교수 화면이 학생 기록을 읽을 때는 아래 3장의 `ChallengeSubmission` 필드를 쓰면 됩니다.

### 팀 결정이 필요한 질문
1. **대화 기록을 서버에 둘까요?** 첫 목표에서는 브라우저(localStorage)에 두는 것을 제안합니다.
   - 교수 "원문 열람"이 필요해지면 `POST /api/student/conversations`(upsert)와 `GET /api/student/conversations?userId=&courseId=`를 추가하면 됩니다.
   - 그때 `store.server.ts`의 대화 메서드 3개만 바꾸면 화면 코드는 그대로입니다.
2. **챌린지 id와 오류 카드 연결**: 학생 화면은 지금 `ch1`(`content/challenges.ts`)을 씁니다. 교수 승인 카드로 만든 챌린지의 id 규칙(`ch1` 유지 여부)을 정해 주세요.
3. **AI 채점 실패 시 응답**: 본인 생각·개념 점수의 AI 평가가 실패하면 제출 전체를 오류(502 등)로 돌려줄지, 해당 항목만 "교수 채점 대기"로 둘지 정해 주세요. 학생 화면은 어느 쪽이든 받은 그대로 표시합니다.

## 3. 학생 기록 필드 (`ChallengeSubmission`, `src/types/student-records.ts`)

| 필드 | 뜻 |
|---|---|
| `answers[]` | 주장별 판정(`judgment`), 확신도(`confidence` 0~100), 본인 생각(`reasoning`), 올바른 개념(`correction`), 근거(`evidenceId`), 붙여넣은 글자 수(`pastedChars`) |
| `score` | `{ judgment 0~1, reasoning 0~2, concept 0~2, evidence 0~2, penalty 0/-2, total 0~7 }` |
| `calibration` | 확신도 보정 정확도 0~100 |
| `falseAlarms` | 오탐 수. 맞는 주장을 '틀리다'로 판정한 개수이고, 그 주장의 이유 점수는 0 |
| `claimGrades[]` | 주장별 오류 여부, 판정 정오, 본인 생각 점수, 해설 |
| `errorReveals[]` | 오류 주장의 오류 유형, 정답 설명, 근거, 개념·근거 점수 |
| `directAnswerFlag`, `pastedRatio` | 과정 우회 판단 근거. 직행 시도가 있고 붙여넣기 비율이 0.5를 넘으면 −2 |
| `beforeSummary`, `afterExplanation` | 해설 전 생각 요약 / 해설 후 내 설명 (설명 변화 비교) |
| `retrievalScheduledAt` | 1주 뒤 재인출 예약 시각 |
| `grader` | `'mock'`(local 모드 예시 채점) / `'server'` |

점수 규칙(설계안 7점):
- 판정 +1: 모든 주장을 맞게 판정했을 때만
- 이유 +2: 주장별 평균. 오탐 주장은 0
- 개념 +2·근거 +2: 오류 주장 기준
- 과정 우회 −2

세부 식과 경계값은 `src/lib/scoring.ts` 주석에 있습니다.

## 4. local 모드 localStorage 키 (접두사 `edeltoon:`, 값은 JSON)

| 키 | 타입 | 내용 |
|---|---|---|
| `edeltoon:session` | `Session` | 역할 선택 화면이 저장 (`src/lib/session.ts`) |
| `edeltoon:student-index` | `string[]` | 기록이 있는 학생 id 목록 |
| `edeltoon:student:{studentId}:conversations` | `Conversation[]` | 자유 학습 대화 (server 모드에서도 여기) |
| `edeltoon:student:{studentId}:direct-answer-attempts` | `DirectAnswerAttempt[]` | 정답 직행 요청 시도 |
| `edeltoon:student:{studentId}:drafts` | `Record<challengeId, ChallengeDraft>` | 제출 전 입력 (server 모드에서도 여기, 교수 화면은 읽지 않음) |
| `edeltoon:student:{studentId}:submissions` | `ChallengeSubmission[]` | 챌린지 제출·점수·해설·해설 전후 설명 |
| `edeltoon:student:{studentId}:retrievals` | `RetrievalResult[]` | 재인출 퀴즈 결과 (첫 목표 이후) |

- 같은 탭 변경 알림은 `edeltoon:store-change`(기록), `edeltoon:session-change`(세션) 이벤트입니다. 다른 탭은 `storage` 이벤트로 받습니다.
- local 모드에서 교수 화면이 학생 기록을 읽으려면 같은 브라우저에서 `studentStore.readStudentRecords('s1')`을 호출합니다.

## 5. 아직 학생 화면 임시 데이터인 것

- **챌린지**: 교수 승인 오류 카드 → 학생 챌린지 연결은 통합 단계에서 처리합니다. 지금은 `src/features/student/content/challenges.ts`를 씁니다.
  - local 모드 mock 정답 키(`services/mock/answerKey.ts`)는 `approvalStatus === 'approved'`인 카드만 채점에 씁니다.
  - 이 정답 키는 제출할 때만 동적 import합니다. 제출 전에는 화면·props·네트워크 응답에 오류 위치가 없습니다.
  - 다만 청크는 클라이언트 번들 산출물에 들어 있습니다. server 모드가 준비되면 이 파일은 지웁니다.
- **강의자료 근거**: API에 아직 없습니다.
  - 자유 학습 답변의 개념 카드·근거 칩은 `content/studyAids.ts`가 학생 질문 키워드로 찾아 붙이고, 매칭이 없으면 붙이지 않습니다.
  - 근거 원문·챌린지 근거 선택지는 `content/lecture.ts`를 씁니다.
  - **API가 근거(강의자료 검색 결과)를 주면 이 두 파일 대신 API 응답으로 교체합니다.**
- 쪽수·발췌문·오류 카드 문장은 실제 강의자료 전 초안입니다(`TODO(검수 필요)`).
