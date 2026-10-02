-- SeTask 첫 목표 시드: 학생 s1, 오류 카드 ec-idea-1(승인 대기), 챌린지 ch1(공개 정보 + 서버 전용 정답)
-- 실행: 0001_init.sql 다음에 SQL Editor에 붙여넣고 Run. 여러 번 실행해도 같은 상태가 된다(upsert).
-- 시연: ec-idea-1은 pending으로 시작한다. 교수가 승인해야 학생에게 ch1이 열린다(승인 전에는 학생 API가 409).
--       다시 실행하면 카드가 pending으로 돌아간다. 학생 기록은 지우지 않는다(시연 리셋은 docs/DATABASE.md).
-- 내용 출처: 학생 화면 content/challenges.ts, content/lecture.ts, services/mock/answerKey.ts (같은 문장)
-- TODO(검수 필요): 주장·해설·정답 키워드·근거 쪽수는 철학 내용 검수 전 초안. 실명·실제 학번 아님.

begin;

-- 학생 (가상 계정, 역할 선택 화면의 DEMO_ACCOUNTS.student와 같은 값)
insert into public.students (id, name, member_no, major)
values ('s1', '김동하', '26011225', '철학과')
on conflict (id) do update set name = excluded.name, member_no = excluded.member_no, major = excluded.major;

-- 오류 카드 (ch1의 주장 B). 시연에서 교수가 직접 승인하도록 pending으로 시작
insert into public.error_cards (
  id, course_id, concept_id, title, wrong_claim, correct_claim, correct_keywords,
  evidence_id, evidence, source, error_type, difficulty, approval_status, approved_by, approved_at
) values (
  'ec-idea-1', 'phil', 'idea', '이데아와 감각 세계',
  '플라톤은 감각 세계를 진정한 실재, 이데아를 그 모방으로 보았다.',
  '이데아가 진정한 실재이고, 감각 세계는 그 불완전한 모방이다.',
  array['이데아', '실재', '모방', '감각'],
  'ev-w3-p12',
  '동굴의 비유에서 동굴 밖의 세계가 이데아에, 벽의 그림자가 감각 세계에 대응한다. 실재와 모방의 관계가 뒤집힌 주장이다.',
  null,
  '개념 반전', '중', 'pending', null, null
)
on conflict (id) do update set
  course_id = excluded.course_id, concept_id = excluded.concept_id, title = excluded.title,
  wrong_claim = excluded.wrong_claim, correct_claim = excluded.correct_claim,
  correct_keywords = excluded.correct_keywords, evidence_id = excluded.evidence_id,
  evidence = excluded.evidence, error_type = excluded.error_type, difficulty = excluded.difficulty,
  approval_status = excluded.approval_status, approved_by = excluded.approved_by,
  approved_at = excluded.approved_at, rejection_reason = null;

-- 챌린지 ch1: 학생에게 공개되는 정보 (오류 위치 없음)
insert into public.challenges (id, course_id, concept_id, title, question, error_count, public)
values (
  'ch1', 'phil', 'idea', '이데아론',
  '플라톤의 이데아론과 우리가 보는 현실 세계의 관계를 설명해줘.',
  1,
  '{
    "conceptName": "이데아론",
    "claims": [
      { "id": "ch1-a", "label": "A", "text": "감각 세계는 우리가 감각으로 경험하는 세계다." },
      { "id": "ch1-b", "label": "B", "text": "플라톤은 감각 세계를 진정한 실재, 이데아를 그 모방으로 보았다." },
      { "id": "ch1-c", "label": "C", "text": "동굴의 비유는 인식의 단계와 실재에 대한 이해를 설명한다." }
    ],
    "evidenceOptions": [
      { "id": "ev-w3-p12", "label": "3주차 강의자료 · p.12", "topic": "동굴의 비유" },
      { "id": "ev-w3-p10", "label": "3주차 강의자료 · p.10", "topic": "이데아론의 실재관" },
      { "id": "ev-w3-p14", "label": "3주차 강의자료 · p.14", "topic": "인식의 단계" },
      { "id": "ev-w4-p05", "label": "4주차 강의자료 · p.5", "topic": "형상과 질료" }
    ]
  }'::jsonb
)
on conflict (id) do update set
  course_id = excluded.course_id, concept_id = excluded.concept_id, title = excluded.title,
  question = excluded.question, error_count = excluded.error_count, public = excluded.public;

-- 챌린지 ch1: 서버 채점 전용 정답 (학생 응답으로 내보내지 않음)
insert into public.challenge_keys (challenge_id, answer_key)
values (
  'ch1',
  '{
    "reasonKeywords": ["이데아", "실재", "모방", "감각", "본질", "동굴", "그림자", "인식", "불완전"],
    "claims": [
      {
        "claimId": "ch1-a",
        "isError": false,
        "explanation": "맞는 주장이에요. 감각 세계는 우리가 보고 듣고 만지며 경험하는 세계이고, 플라톤은 이 세계가 변하고 소멸한다고 보았어요."
      },
      {
        "claimId": "ch1-b",
        "isError": true,
        "errorCardId": "ec-idea-1",
        "explanation": "실재와 모방의 관계가 뒤집혔어요. 이데아가 진정한 실재이고, 감각 세계는 그것의 불완전한 모방입니다."
      },
      {
        "claimId": "ch1-c",
        "isError": false,
        "explanation": "맞는 주장이에요. 동굴의 비유는 그림자만 보던 사람이 동굴 밖으로 나가 실재를 알아 가는 과정으로, 인식이 높아지는 단계를 보여 줘요."
      }
    ]
  }'::jsonb
)
on conflict (challenge_id) do update set answer_key = excluded.answer_key;

commit;
