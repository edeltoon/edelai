# CLAUDE.md — 에델톤 데모 (AI 오류 검증 기반 학습·평가 플랫폼)

## 이 프로젝트가 무엇인가
제2회 에델바이스 아이디어톤 시연용 웹 데모. 주제는 "생성형 AI 시대 대학 학습·평가 재설계".
서비스 한 문장: **AI에게 정답을 묻는 대학에서, AI의 오답을 검증하는 대학으로.**
학생은 과목 AI가 낸 답변에서 교수 승인 오류를 찾고(주장별 판정 + 확신도 + 본인 이유),
교수는 반 전체의 오개념·확신도 보정·재인출 결과를 요약으로 본다.
전체 기획: `docs/PLAN.md` (기능 판단이 애매하면 반드시 여기서 근거를 찾을 것)

## 데모 범위 (이 밖의 것은 만들지 않는다)
- 과목 1개: 서양철학. 개념 5개, 교수 승인 오류 카드 10개, 학생 샘플 5명.
- 화면: 로그인(역할 선택) → 학생(나의강좌, 과목 공간, 검증 챌린지, 결과) / 교수(대시보드, 오류 카드 승인, 학생 기록).
- 실제 로그인, 실제 LLM 호출, 백엔드, DB 없음. 모든 AI 응답은 `src/data/`의 사전 작성 데이터를 "생성 중" 연출로 보여준다.
- 3분 시연 시나리오(PLAN.md 9장)가 끊김 없이 돌아가는 것이 최우선. 기능 수보다 흐름 완성도.

## 기술 스택
- Next.js App Router + TypeScript (strict), **정적 export** (`next.config.ts`의 `output: 'export'`)
- Tailwind CSS v4 (`@tailwindcss/postcss`, 토큰은 `src/app/globals.css`의 `@theme`에 DESIGN.md 값으로 정의)
- 라우팅: App Router 파일 기반. `basePath: '/edelai'`, `trailingSlash: true` (GitHub Pages 새로고침 404 방지)
- 상태: React Context + localStorage (키 접두사 `edeltoon:`), 시연 리셋 버튼으로 초기화
- 차트가 필요하면 recharts만 사용. 그 외 UI 라이브러리 추가 금지(필요하면 먼저 물어볼 것)
- 폰트: Pretendard Variable (CDN, `src/app/layout.tsx`에서 연결). create-next-app 기본 Geist 폰트는 쓰지 않는다
- 배포: GitHub Pages (https://edeltoon.github.io/edelai/). Pages는 레포가 Public일 때 무료로 동작

## 명령어
- `npm install` / `npm run dev` (http://localhost:3000/edelai/) / `npm run build` (결과물 `out/`) / `npm run lint`
- basePath 때문에 `http://localhost:3000/`은 404가 정상이다. 항상 `/edelai/`로 접속
- 코드 변경 후 마무리 전에 항상 `npm run build`로 타입 에러와 정적 export 오류까지 확인할 것

## 폴더 구조
```
src/
  app/          라우트만 (layout.tsx, page.tsx). page는 얇게 두고 화면 본체는 features/에서 가져온다
    page.tsx                      로그인(역할 선택)
    student/                      layout.tsx(학생 레이아웃) + 나의강좌, course/[courseId]/..., profile
    professor/                    layout.tsx(교수 레이아웃) + 대시보드, course/[courseId]/cards, students/[studentId]
  components/   공용 UI (DESIGN.md 컴포넌트 목록과 이름 일치, UtilityBar·AppHeader·DemoResetButton 포함)
  features/
    student/    나의강좌, 과목 공간, 챌린지, 결과, 역량 카드
    professor/  대시보드, 오류 카드 승인, 학생 기록
  providers/    RoleProvider(Context + localStorage), RoleGuard
  data/         types.ts + 서양철학 목데이터 (스키마는 mock-data 스킬)
  lib/          점수 계산, 확신도 보정, 정답 직행 감지 (순수 함수)
```

## Next.js 정적 export 규칙 (어기면 빌드 실패 또는 배포 후 깨짐)
1. 서버 기능을 쓰지 않는다: Route Handlers(API), Server Actions, middleware, `cookies()`/`headers()`, ISR, next/image 최적화.
2. 동적 라우트(`[courseId]`, `[challengeId]`, `[studentId]`)는 반드시 `generateStaticParams`로 `src/data` 배열의 id를 반환한다.
3. `page.tsx`는 서버 컴포넌트로 두고, 상태·이벤트·localStorage를 쓰는 부분은 `features/` 안의 `'use client'` 컴포넌트로 분리한다.
4. localStorage는 `useEffect` 안에서만 읽는다. 빌드 시 프리렌더에는 `window`가 없어서, 렌더 중에 읽으면 하이드레이션 오류가 난다.
5. 내부 이동은 `next/link`의 `<Link>`와 `useRouter`만 쓴다(basePath 자동 적용). `<a href="/student">`처럼 직접 쓰지 않는다. `public/` 파일을 경로 문자열로 쓸 때는 앞에 `/edelai`를 붙인다.
6. `useSearchParams`를 쓰는 컴포넌트는 `<Suspense>`로 감싼다.

## 반드시 지킬 규칙
1. UI 작업 전 `DESIGN.md`를 읽는다. 색·폰트·간격은 토큰만 쓰고 임의 hex 금지.
2. 학습 흐름 규칙(해설 잠금, 오류 개수만 공개, 해설 공개 필수 등)은 `learning-loop-rules` 스킬이 기준이다. 이 규칙을 깨는 편의 기능을 넣지 않는다.
3. 화면 문구는 한국어, 학생 화면은 해요체. 기능명은 PLAN.md 용어를 그대로 쓴다 (검증 챌린지, 확신도, 본인 생각, 재인출 퀴즈).
4. 점수·지표 계산은 `src/lib/`의 순수 함수로만. 컴포넌트 안에서 계산식을 새로 만들지 않는다.
5. 비밀키, `.env`, 실제 학생 정보, 세종대 공식 교표 이미지 파일을 커밋하지 않는다(공개 저장소로 전환될 수 있음).
6. `main`에 직접 커밋하지 않는다. 기능 브랜치 → PR. 마무리는 `/pr-ready`.
7. 한 번에 한 화면/기능만. 다른 팀원 담당 폴더는 수정 전에 사용자에게 확인.

## 팀 담당 (충돌 방지)
- 공통 뼈대(레이아웃·로그인·`src/providers/`·`src/components/`·배포): (이름)
- 학생 화면 (`src/app/student/`, `src/features/student/`): (이름)
- 교수 화면 (`src/app/professor/`, `src/features/professor/`): (이름)
- `src/data/` 오류 카드 내용(철학 내용 검수): (이름)
