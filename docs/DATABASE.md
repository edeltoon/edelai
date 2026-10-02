# 데이터베이스 (Supabase)

SeTask의 저장소는 **Supabase(Postgres)**입니다. **DB 접근은 서버(`src/app/api/**` 라우트)에서만** 하고, 브라우저는 DB를 직접 보지 않습니다.

## 1. 역할 분담

| 담당 | 범위 |
|---|---|
| 학생 화면 담당 | 스키마(`supabase/migrations/`), 서버 DB 계층(`src/lib/db/`), 학생 API(`/api/student/*`), `GET /api/health/db` |
| 교수 화면 담당 | 교수 API(오류 카드 저장·승인·반려, 학생 기록 조회, 교수 조정·확정). `src/lib/db/` 함수로 만든다 |

DB 함수가 더 필요하면 학생 화면 담당에게 요청하거나, `src/lib/db/`에 추가하는 PR을 올려 주세요.

## 2. 환경 변수 (`.env.local`에만, 커밋 금지)

| 이름 | 값 | 비고 |
|---|---|---|
| `SUPABASE_URL` | `https://<project-ref>.supabase.co` | Supabase 대시보드 → Project Settings → API |
| `SUPABASE_SECRET_KEY` | secret key (`sb_secret_…`) | 같은 화면의 API Keys → Secret keys. **모든 RLS를 우회**하므로 브라우저·문서·로그에 절대 넣지 않음 |
| `NEXT_PUBLIC_STORE_MODE` | `local`(기본) \| `server` | 학생 화면 저장소 선택(비밀 아님). `server`는 학생 API가 생긴 뒤 사용 |

- Supabase 변수에 `NEXT_PUBLIC_` 접두사를 붙이지 않습니다. 붙이면 값이 브라우저 번들에 들어갑니다.
- 공개(publishable) 키는 쓰지 않습니다. 브라우저용 Supabase 클라이언트도 만들지 않습니다.
- 서버 클라이언트는 `src/lib/db/client.ts`(`import 'server-only'`)에 있습니다. 클라이언트 컴포넌트에서 import하면 빌드가 실패합니다.

## 3. SQL 실행 방법

1. Supabase 대시보드 → **SQL Editor** → New query
2. `supabase/migrations/0001_init.sql` 전체를 붙여넣고 **Run** (테이블·인덱스·트리거·RLS)
3. `supabase/migrations/0002_seed.sql` 전체를 붙여넣고 **Run** (시드)
4. 확인: 개발 서버에서 `GET /api/health/db`가 `{ "ok": true, "db": true }`이면 연결됩니다.

- `0001_init.sql`은 한 번만 실행합니다. 다시 실행하면 "already exists" 오류가 납니다.
- `0002_seed.sql`은 여러 번 실행해도 같은 상태가 됩니다(upsert). 다시 실행하면 오류 카드 `ec-idea-1`이 승인 대기로 돌아갑니다.

## 4. 테이블

모든 테이블에 RLS를 켜고 **정책은 만들지 않았습니다.** `anon`·`authenticated` 권한도 회수했습니다. 그래서 브라우저(공개 키)로는 읽기·쓰기가 모두 막히고, 서버의 secret key로만 접근할 수 있습니다.
세부 필드는 jsonb로 앱 타입(`src/types/*.ts`)을 거의 그대로 저장합니다.

| 테이블 | 주요 컬럼 | 쓰는 쪽 | 읽는 쪽 |
|---|---|---|---|
| `students` | `id`(`'s1'`), `name`, `member_no`, `major` (가상 정보) | 시드 | 교수 API |
| `error_cards` | `id`, `course_id`, `concept_id`, `title`, `wrong_claim`, `correct_claim`, `correct_keywords text[]`, `evidence_id`, `evidence`, `source jsonb`, `error_type`, `difficulty`, **`approval_status`**(pending·approved·rejected), `approved_by`, `approved_at`, `rejection_reason` | 교수 API(저장·승인·반려), 시드 | 교수 API, 학생 API(채점) |
| `challenges` | `id`(`'ch1'`), `course_id`, `concept_id`, `title`, `question`, `error_count`, **`public jsonb`**(conceptName, claims, evidenceOptions) | 시드 | 학생 API (공개 정보만) |
| `challenge_keys` | `challenge_id`, **`answer_key jsonb`**(reasonKeywords, claims[{claimId, isError, explanation, errorCardId}]) | 시드 | 학생 API 채점만. **응답으로 내보내지 않음** |
| `submissions` | `id uuid`, `student_id`, `course_id`, `challenge_id`, `submitted_at`, `grader`, `answers`, `score jsonb`, `total`, `calibration`, `false_alarms`, `pending_review text[]`, `direct_answer_flag`, `pasted_ratio`, `claim_grades`, `error_reveals`, `before_summary`, `after_explanation`, `retrieval_scheduled_at`, **`professor_score jsonb`, `professor_comment`, `finalized_by`, `finalized_at`** | 학생 API(제출·해설 후 설명), 교수 API(조정·확정) | 학생 API, 교수 API |
| `direct_answer_attempts` | `id uuid`, `student_id`, `course_id`, `conversation_id`, `text`, `matched`, `at` | 학생 API | 학생 API, 교수 API |
| `retrievals` | `id uuid`, `student_id`, `course_id`, `challenge_id`, `submission_id`, `quiz_id`, `question`, `answer`, `rubric jsonb`, `score`, `feedback` | 학생 API (첫 목표 이후) | 학생·교수 API |

- **정답 분리**: 공개 정보(`challenges.public`)와 정답(`challenge_keys`)을 아예 다른 테이블에 둡니다. 학생용 조회가 실수로 정답을 읽지 않게 하려는 것입니다.
- **교수 승인 확인**: `getPublicChallenge`·`getChallengeForGrading`은 정답 키가 가리키는 오류 카드가 **모두 approved일 때만** 챌린지를 돌려줍니다. 그 전에는 `not_approved`이고, 학생 API는 409 `CHALLENGE_NOT_APPROVED`로 응답합니다.
- **대화 기록**: 첫 목표에서는 브라우저(local)에 두므로 테이블이 없습니다.

### 교수 담당 확인 필요
1. **교수 조정·확정 필드**: `professor_score jsonb`(조정한 ScoreBreakdown, null이면 원래 점수), `professor_comment`, `finalized_by`, `finalized_at`
   - 함수: `saveProfessorReview(id, { professorScore, professorComment, pendingReview })`, `finalizeSubmission(id, by)`
   - `professorScore`를 저장하면 `total` 컬럼도 그 점수로 맞춥니다.
   - AI 채점 대기(`pending_review`) 항목을 교수가 채점하면 `pendingReview: []`로 비웁니다.
2. **`error_cards`와 PR #5 `ReviewCard` 타입의 차이** (DB 함수가 `ReviewCard` 모양 + 추가 필드로 돌려줍니다. 타입 `ErrorCardRecord`)
   - `course_id`: `ReviewCard`에 없어서 `saveErrorCards(cards, courseId)`로 따로 받습니다.
   - `evidence_id`: DB는 null을 허용합니다. 생성 카드에는 강의자료 근거 id가 없을 수 있어서입니다. `ReviewCard.evidenceId`(필수 string)로 돌려줄 때는 `''`입니다.
   - `source`·`sourceTitle`·`sourceExcerpt`: DB에서는 `source jsonb` 하나에 저장합니다.
   - `approved_at`·`created_at`·`updated_at`: `ReviewCard`에 없는 DB 전용 필드입니다.
   - `rejection_reason`: `ReviewCard.rejectionReason`과 같습니다. 반려할 때 `approved_by`에 반려한 교수를 기록합니다.

## 5. 서버 DB 계층 (`src/lib/db/`)

```ts
import { listErrorCards, approveErrorCard, listSubmissions, DbError } from '@/lib/db';
```

| 파일 | 함수 |
|---|---|
| `errorCards.ts` | `listErrorCards({ courseId, status? })`, `getErrorCard`, `saveErrorCards(cards, courseId)`, `approveErrorCard(id, by)`, `rejectErrorCard(id, by, reason)`, `resetErrorCardToPending` |
| `challenges.ts` | `getPublicChallenge(id)`(공개 정보 + 승인 확인), `listChallenges(courseId)`, `getChallengeForGrading(id)`(서버 채점 전용, `status: ok·not_found·not_approved`) |
| `submissions.ts` | `insertSubmission`, `getSubmission`, `listSubmissions({ studentId?, courseId?, challengeId? })`, `updateAfterExplanation(id, studentId, text)`, `saveProfessorReview`, `finalizeSubmission` |
| `students.ts` | `listStudents`, `getStudent`, `insertDirectAnswerAttempt`, `listDirectAnswerAttempts`, `insertRetrieval`, `listRetrievals`, `getStudentRecords(studentId)`, `resetStudentRecords(studentId)` |
| `demo.ts` | `resetDemo(studentId)`, `DEMO_ERROR_CARD_IDS` |
| `health.ts` | `checkDbConnection()` |

- 반환 타입은 앱 타입(`ChallengeSubmission`, `DirectAnswerAttempt` 등)에 교수 필드를 더한 것입니다(`SubmissionRecord`, `ErrorCardRecord`, `src/lib/db/types.ts`).
- 실패하면 `DbError(code, message)`를 던집니다. `message`는 사용자에게 보여도 되는 한국어이고, DB 원문 메시지와 비밀 값은 담지 않습니다.
- 라우트에서는 `{ ok: false, error: { code, message } }`로 바꿔 응답합니다(`src/lib/db/index.ts` 주석 예시).

## 6. 시연 리셋

- **코드**: `resetDemo(studentId)`를 호출합니다. 학생 API `POST /api/student/demo-reset`이 이 함수를 씁니다.
  - 그 학생의 `retrievals`, `submissions`, `direct_answer_attempts`를 지웁니다.
  - 시연용 오류 카드(`DEMO_ERROR_CARD_IDS` = `ec-idea-1`)를 **승인 대기(pending)**로 되돌려, 교수 승인 장면부터 다시 시연할 수 있게 합니다.
  - 오류 카드 내용·챌린지·학생은 남깁니다.
- **SQL로 직접 할 때** (SQL Editor):
  ```sql
  delete from public.retrievals where student_id = 's1';
  delete from public.submissions where student_id = 's1';
  delete from public.direct_answer_attempts where student_id = 's1';
  update public.error_cards set approval_status = 'pending', approved_by = null, approved_at = null, rejection_reason = null where id = 'ec-idea-1';
  ```
  카드만 되돌리려면 `0002_seed.sql`을 다시 실행해도 됩니다.
- 학생 화면이 `NEXT_PUBLIC_STORE_MODE=local`이면 DB와 상관없이 브라우저 기록만 지웁니다(헤더 "시연 리셋").
