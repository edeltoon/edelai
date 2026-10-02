# 현재 사용 시 주의

스타터 참고 자료입니다. 실제 Claude 호출과 서버 실행 기준은 `docs/ARCHITECTURE.md`, API 형식은 `docs/API.md`를 우선합니다. 목데이터·localStorage 흐름은 화면 개발용 예시이며 실제 서버 연동 완료가 아닙니다.

# Claude Code 프롬프트 모음

사용법: 프로젝트 폴더에서 `claude` 실행 → 큰 단계는 **Shift+Tab으로 Plan 모드**로 바꾼 뒤 아래 프롬프트를 붙여넣기 →
계획을 읽고 괜찮으면 승인 → 구현. 한 프롬프트 = 한 브랜치 = 한 PR이 기본 단위다.
한 단계가 끝나면 `/clear`로 대화를 비우고 다음 단계를 시작하면 맥락이 섞이지 않는다.

---

## P0. 뼈대 만들기 (리더 1명만, 가장 먼저)
브랜치: `chore/scaffold`

```
CLAUDE.md, DESIGN.md, docs/PLAN.md를 먼저 읽어줘.
이 저장소는 Next.js(App Router, TypeScript, Tailwind v4 postcss)로 이미 초기화돼 있어. 그 위에 데모 뼈대를 만들 거야. 화면 내용은 아직 만들지 말고 구조만.

1. create-next-app 기본 예제(src/app/page.tsx 내용, public/의 기본 SVG, Geist 폰트)를 걷어내. CLAUDE.md, DESIGN.md, docs/, .claude/, .github/, next.config.ts는 지우거나 덮어쓰지 마.
2. src/app/globals.css의 @theme에 DESIGN.md 1장 색 토큰과 2장 타이포 스케일을 정의해줘. Tailwind 설정 방식(postcss)은 그대로.
3. src/app/layout.tsx: Pretendard Variable CDN 연결, <html lang="ko">, metadata 제목 "세종대학교 학습공간 (시연용)".
4. App Router 라우트 골격 (각 page.tsx는 제목만 있는 빈 화면):
   / 로그인(역할 선택), /student, /student/course/[courseId], /student/course/[courseId]/challenge/[challengeId],
   /student/course/[courseId]/result/[challengeId], /student/profile,
   /professor, /professor/course/[courseId], /professor/course/[courseId]/cards, /professor/course/[courseId]/students/[studentId]
   동적 라우트는 서버에서 처리하고 존재하지 않는 id는 404로 처리해줘.
5. CLAUDE.md 폴더 구조대로 디렉터리를 만들고, mock-data 스킬의 타입을 src/data/types.ts에 작성.
   화면 개발용 샘플로 mock-data 스킬의 고정 id(과목 phil, 챌린지 ch1·ch2, 학생 s1~s5)만 최소 필드로 자리를 잡아줘.
6. UtilityBar, AppHeader, DemoResetButton과 역할별 레이아웃(src/app/student/layout.tsx, src/app/professor/layout.tsx)을 DESIGN.md 3장대로 구현.
   역할은 src/providers의 RoleProvider(Context + localStorage edeltoon:role, useEffect 안에서 읽기). 역할이 안 맞으면 RoleGuard가 /로 보낸다.
7. 로그인 화면: "학생으로 시작(김세종, 철학과 2학년)" / "교수로 시작(이석배 교수)" 두 버튼. 실제 인증은 없다는 작은 안내 문구.
8. npm run build 통과(Next.js 서버 빌드)와 npm run lint 확인.

끝나면 만든 파일 트리와, 내가 브라우저에서 확인할 주소(http://localhost:3000/)를 알려줘.
```

---

## P1. 목데이터 채우기
브랜치: `data/philosophy`  (철학 내용 담당 팀원과 함께)

```
mock-data 스킬을 따라 src/data/ 파일들을 채워줘.
오류 카드 문장은 docs/PLAN.md 3.2절과 10장 예시를 우선 쓰고, 부족한 건 초안을 만든 뒤 전부 // TODO(검수 필요) 표시를 달아줘.
챌린지 1번은 "플라톤의 이데아론과 우리가 보는 현실 세계의 관계를 설명해줘" 질문에 대한 답변으로, 주장 5개 중 오류 2개(개념 반전 1, 개념 혼동 1).
analytics.ts 수치는 PLAN.md 6장 예시(42명 중 27명 혼동, AI 수용 26%)와 맞춰줘.
끝나면 검수가 필요한 문장 목록을 표로 보여줘.
```

---

## P2. 학생: 나의강좌 + 과목 공간 + 일반 학습 모드
브랜치: `feat/student-home`

```
sejong-lms-ui 스킬과 DESIGN.md를 따라 학생 화면을 만들어줘.

1. /student "나의강좌": 첨부한 세종대 LMS 스크린샷 구조 그대로. CourseRow 7개, 서양철학 행 오른쪽 지표에 "검증 챌린지 2건"을 추가. 서양철학만 클릭 가능.
2. /student/course/phil: 과목 제목 영역 + UnderlineTabs(일반 학습 / 검증 챌린지 / 내 기록).
3. 일반 학습 탭: 질문 입력창과 AIAnswerBlock. 답변은 docs/API.md의 POST /api/chat으로 실제 요청하고 로딩·실패 상태를 표시해.
   learning-loop-rules의 정답 직행 감지를 적용해서 "정답 번호만 해설 없이 알려줘"를 입력하면 답 대신 경고와 "검증 챌린지로 확인해 보세요" 안내를 보여줘.
4. 검증 챌린지 탭: 챌린지 2개를 목록으로, 각 행에 "교수님이 승인한 오류 2개 포함" 문장 표시. 클릭하면 챌린지 화면으로.
```
(스크린샷 이미지는 프롬프트 창에 드래그해서 함께 첨부)

---

## P3. 학생: 검증 챌린지 (데모의 핵심)
브랜치: `feat/student-challenge`

```
learning-loop-rules 스킬을 먼저 읽고, 그 규칙을 그대로 지켜서 /student/course/[courseId]/challenge/[challengeId] 를 만들어줘.

- 상단: 학생 질문 → AIAnswerBlock(챌린지 답변 전문) → ChallengeBanner(오류 개수만 공개)
- 아래: 주장별 ClaimCard. 판정, 확신도 슬라이더(숫자 표시), "왜 그렇게 생각했나요?" 입력.
  '틀리다'를 고른 주장에는 "올바른 설명"과 근거 선택(evidenceOptions)이 추가로 열림.
- 제출 버튼 활성 조건과 비활성 시 문구는 스킬 규칙 3번 그대로.
- 이유 입력창 onPaste를 감지해 pasted 플래그 저장.
- 제출하면 결과 페이지로 이동하고 Submission을 localStorage에 저장.
- 점수와 보정 계산은 src/lib/scoring.ts, calibration.ts에 순수 함수로 만들고, 경계값 예시를 주석으로 남겨.
```

---

## P4. 학생: 결과 + 재인출 + 역량 카드
브랜치: `feat/student-result`

```
/student/course/[courseId]/result/[challengeId] 를 만들어줘.
1. RevealCard 목록: DESIGN.md 6장의 공개 연출(120ms 간격) 하나만 적용. 각 카드에 내 판정과 확신도, 내가 쓴 이유, 정답 주장과 근거, 오류 유형.
2. "확신했지만 틀린 주장" 섹션(확신도 80 이상 오답)을 따로 강조.
3. 내가 처음 쓴 이유 vs 해설 후 다시 쓰는 설명 입력칸(설명 변화 비교용).
4. ScoreTable + 확신도 보정 정확도 + 안내 문구.
5. RetrievalNotice(1주 후 날짜 자동 계산) + "결과 미리 보기"로 준비된 재인출 결과 모달.
6. /student/profile 에 CompetencyCard: "서양철학 3주차: AI 답변의 개념 반전 오류를 발견하고 강의자료 근거로 수정했다" 형식.
```

---

## P5. 교수: 대시보드
브랜치: `feat/professor-dashboard`

```
sejong-lms-ui, learning-loop-rules 스킬을 따라 교수 화면을 만들어줘.
1. /professor: 담당 강의 목록(CourseRow 재사용, 지표는 "승인 대기 오류 카드 2건 | 챌린지 참여율 88%").
2. /professor/course/phil 대시보드 순서:
   KpiRow(오류 발견률 / 확신도 보정 정확도 / 1주 후 재인출 점수) →
   AISummaryBlock(analytics.aiSummary) →
   MisconceptionBars(개념별 혼동률, 무엇과 혼동했는지 함께) →
   보조 지표 한 줄(AI 수용 편향, 정답 직행 시도율, 이유 서술 완성률) →
   DataTable 학생 5명 + "외 37명", 플래그 표시, 행 클릭 시 학생 기록으로.
3. 학생이 방금 제출한 김세종 결과가 localStorage에 있으면 표의 김세종 행이 그 값으로 바뀌게.
```

---

## P6. 교수: 오류 카드 승인 + 학생 기록
브랜치: `feat/professor-cards`

```
1. /professor/course/phil/cards: 강의자료 업로드 영역(실제 업로드 없이 파일명만 표시) → "오답 후보" 목록.
   pending 카드는 wrongClaim / correctClaim / 근거 / 유형 / 난이도를 보여주고 [수정하기] [승인하기] [반려하기].
   승인하면 approvalStatus를 바꾸고 "승인했어요" 알림. 승인된 카드만 출제 대상이라는 안내.
2. /professor/course/phil/students/[studentId]: 학생 요약 지표, 챌린지별 판정·확신도·이유 기록,
   교수 점수 조정 입력(AI 점수 옆에 "교수 조정" 칸), 정답 직행 시도 기록, [원문 보기]로 대화 전문 펼치기.
```

---

## P7. 시연 다듬기 (발표 전날)
브랜치: `chore/demo-polish`

```
docs/PLAN.md 9장 3분 시나리오를 처음부터 끝까지 직접 따라가면서 점검해줘.
1. 로그인 → 학생 → 정답 직행 경고 → 챌린지 → 결과 → 재인출 예약 → 역할 전환 → 교수 대시보드 → 김세종 기록, 끊기는 지점 목록.
2. 1280/768/375px에서 깨지는 곳.
3. DESIGN.md 7장 금지 목록 위반.
4. DemoResetButton이 모든 상태를 초기화하는지.
문제 목록을 먼저 보여주고, 내가 승인하면 고쳐줘.
```
