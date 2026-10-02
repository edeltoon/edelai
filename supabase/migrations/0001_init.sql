-- SeTask 첫 목표 스키마: 교수 승인 → 학생 검증·제출 → 해설 → 교수 기록 확인
-- 실행: Supabase 대시보드 → SQL Editor에 이 파일 전체를 붙여넣고 Run. 그다음 0002_seed.sql.
-- 접근: 모든 테이블 RLS 켜고 정책 없음 → 브라우저(anon·authenticated)는 읽기·쓰기 불가.
--       서버 API 라우트가 SUPABASE_SECRET_KEY로만 접근한다 (src/lib/db/).
-- 세부 필드는 jsonb로 앱 타입(src/types/*.ts)을 거의 그대로 저장한다.
-- 대화 기록은 첫 목표에서 브라우저(local)에 두므로 테이블이 없다.

begin;

-- updated_at 자동 갱신
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ───────────── 학생 (가상 계정) ─────────────
create table public.students (
  id          text primary key,            -- 세션 userId (예: 's1')
  name        text not null,
  member_no   text not null,               -- 가상 학번
  major       text,
  created_at  timestamptz not null default now()
);

-- ───────────── 오류 카드 (교수 승인 상태 포함) ─────────────
-- 앱 타입: src/types/professor-cards.ts ReviewCard (ErrorCard + title, evidence, source...)
create table public.error_cards (
  id                text primary key,       -- 'ec-idea-1' 또는 카드 생성 API의 uuid 문자열
  course_id         text not null,          -- ReviewCard에는 없음. 생성 API 입력의 courseId('phil')
  concept_id        text not null,
  title             text not null default '',
  wrong_claim       text not null,
  correct_claim     text not null,
  correct_keywords  text[] not null default '{}',
  evidence_id       text,                   -- 강의자료 근거 id. ReviewCard는 필수 string이지만 생성 카드에는 없을 수 있어 null 허용
  evidence          text,                   -- 근거 설명 (ReviewCard.evidence)
  source            jsonb,                  -- { source: 'claude', sourceTitle, sourceExcerpt }
  error_type        text not null check (error_type in ('개념 반전', '개념 혼동', '근거 누락', '허위 출처')),
  difficulty        text not null check (difficulty in ('하', '중', '상')),
  approval_status   text not null default 'pending' check (approval_status in ('pending', 'approved', 'rejected')),
  approved_by       text,
  approved_at       timestamptz,
  rejection_reason  text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index error_cards_course_status_idx on public.error_cards (course_id, approval_status);
create trigger error_cards_updated_at before update on public.error_cards
  for each row execute function public.set_updated_at();

-- ───────────── 챌린지: 학생에게 공개되는 부분 ─────────────
-- public = { conceptName, claims: [{ id, label, text }], evidenceOptions: [{ id, label, topic }] }
-- 어떤 주장이 오류인지는 여기에 넣지 않는다 (challenge_keys).
create table public.challenges (
  id           text primary key,            -- 'ch1'
  course_id    text not null,
  concept_id   text not null,
  title        text not null,
  question     text not null,
  error_count  integer not null check (error_count >= 0),
  public       jsonb not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create trigger challenges_updated_at before update on public.challenges
  for each row execute function public.set_updated_at();

-- ───────────── 챌린지 정답 (서버 채점 전용) ─────────────
-- answer_key = { reasonKeywords: [...], claims: [{ claimId, isError, explanation, errorCardId? }] }
-- 학생 응답으로 절대 내보내지 않는다. 제출 채점과 해설 공개 때만 읽는다.
create table public.challenge_keys (
  challenge_id  text primary key references public.challenges (id) on delete cascade,
  answer_key    jsonb not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger challenge_keys_updated_at before update on public.challenge_keys
  for each row execute function public.set_updated_at();

-- ───────────── 제출 (점수, 해설 전후 설명, 교수 조정·확정) ─────────────
-- 앱 타입: src/types/student-records.ts ChallengeSubmission
create table public.submissions (
  id                      uuid primary key default gen_random_uuid(),
  schema_version          integer not null default 1,
  student_id              text not null,
  course_id               text not null,
  challenge_id            text not null references public.challenges (id),
  concept_id              text not null,
  submitted_at            timestamptz not null default now(),
  grader                  text not null check (grader in ('mock', 'server')),
  answers                 jsonb not null,           -- ClaimAnswer[]
  score                   jsonb not null,           -- ScoreBreakdown (reasoning·concept는 null = 교수 채점 대기)
  total                   integer not null check (total between 0 and 7),
  calibration             integer not null check (calibration between 0 and 100),
  false_alarms            integer not null default 0,
  pending_review          text[] not null default '{}',   -- 'reasoning' | 'concept'
  direct_answer_flag      boolean not null default false,
  pasted_ratio            real not null default 0,
  claim_grades            jsonb not null,           -- ClaimGrade[]
  error_reveals           jsonb not null,           -- ErrorReveal[]
  before_summary          text not null default '',
  after_explanation       text,
  after_explained_at      timestamptz,
  retrieval_scheduled_at  timestamptz not null,
  -- 교수 조정·확정 (교수 담당 확인 필요)
  professor_score         jsonb,                    -- 조정한 ScoreBreakdown. null이면 AI·규칙 점수 그대로
  professor_comment       text,
  finalized_by            text,
  finalized_at            timestamptz,
  updated_at              timestamptz not null default now()
);
create index submissions_student_idx on public.submissions (student_id, challenge_id, submitted_at desc);
create index submissions_course_idx on public.submissions (course_id, submitted_at desc);
create trigger submissions_updated_at before update on public.submissions
  for each row execute function public.set_updated_at();

-- ───────────── 정답 직행 요청 시도 ─────────────
create table public.direct_answer_attempts (
  id               uuid primary key default gen_random_uuid(),
  student_id       text not null,
  course_id        text not null,
  conversation_id  text not null,
  text             text not null,
  matched          text not null,
  at               timestamptz not null default now()
);
create index direct_answer_attempts_student_idx on public.direct_answer_attempts (student_id, at desc);

-- ───────────── 재인출 퀴즈 결과 (첫 목표 이후 사용) ─────────────
create table public.retrievals (
  id             uuid primary key default gen_random_uuid(),
  schema_version integer not null default 1,
  student_id     text not null,
  course_id      text not null,
  challenge_id   text not null references public.challenges (id),
  submission_id  uuid references public.submissions (id) on delete cascade,
  quiz_id        text not null,
  question       text not null,
  answer         text not null,
  rubric         jsonb not null,                    -- RetrievalCriterion[]
  score          integer not null check (score between 0 and 10),
  feedback       text not null default '',
  submitted_at   timestamptz not null default now()
);
create index retrievals_student_idx on public.retrievals (student_id, submitted_at desc);

-- ───────────── 접근 제어: RLS 켜고 정책 없음 ─────────────
alter table public.students               enable row level security;
alter table public.error_cards            enable row level security;
alter table public.challenges             enable row level security;
alter table public.challenge_keys         enable row level security;
alter table public.submissions            enable row level security;
alter table public.direct_answer_attempts enable row level security;
alter table public.retrievals             enable row level security;

-- 브라우저 역할의 권한도 걷어 낸다 (RLS와 이중 방어)
revoke all on public.students, public.error_cards, public.challenges, public.challenge_keys,
  public.submissions, public.direct_answer_attempts, public.retrievals
  from anon, authenticated;

commit;
