# EdelAI

AI 오류 검증 기반 대학 학습 평가 플랫폼을 위한 해커톤 프로젝트입니다.
현재는 공통 셸, 교수 카드 검토 화면, Claude 대화·오류 카드 생성 API가 준비되어 있습니다.

개발 목표는 **Claude API를 실제 호출하는 학습·평가 서비스**입니다.
학생 질문은 Next.js 서버 API를 통해 Claude에 전달합니다.
목데이터 전용 데모 및 GitHub Pages 정적 배포는 현재 개발 기준이 아닙니다.
역할 분담과 구현 순서는 [개발 계획](docs/PLAN.md)을 참고하세요.

## 기술 구성

- Next.js App Router
- TypeScript
- Tailwind CSS
- ESLint
- npm
- `src/` 디렉터리 구조

`POST /api/chat`으로 일반 학습 대화를, `POST /api/professor/cards/generate`로 강의 텍스트 기반 오류 카드 생성을 처리합니다. 데이터베이스, 인증, 강의자료 검색은 아직 없습니다.
추가 UI 라이브러리 없이 기존 기술 구성으로 개발합니다.

## 사전 준비

- Node.js 22.18 이상 또는 24 LTS 권장 (API 테스트 포함)
- npm
- GitHub 저장소 접근 권한

## 설치 및 개발 서버 실행

```sh
git clone https://github.com/edeltoon/edelai.git
cd edelai
npm ci
npm run dev
```

이미 저장소를 받은 경우 해당 폴더에서 `npm ci`부터 실행하세요.
개발 서버가 실행되면 [http://localhost:3000](http://localhost:3000)에 접속합니다.
기본 페이지는 키 없이 실행되며, AI 응답을 받으려면 `.env.example`을 참고해
서버 전용 `ANTHROPIC_API_KEY`와 `ANTHROPIC_MODEL`을 `.env.local`에 설정합니다.
키는 브라우저 코드나 `NEXT_PUBLIC_*` 변수에 넣지 않고 Git에 커밋하지 않습니다.
교수 화면은 [http://localhost:3000/professor](http://localhost:3000/professor)입니다.
강의 제목과 텍스트(100~12,000자)를 입력하면 Claude 생성 카드를 수정·승인·반려할 수 있습니다.
생성·검토 결과는 새로고침하면 사라집니다. PDF 업로드·서버 저장·학생 배포는 아직 연결하지 않았습니다.
API 사용법과 학생 화면 연결 예시는 [API 문서](docs/API.md)를 참고하세요.

`package-lock.json`을 함께 관리하며, 기존 의존성 설치에는 `npm ci`를 사용합니다.
의존성을 추가하거나 변경할 때는 `npm install`을 사용하고 잠금 파일도 함께 반영합니다.

## 코드 검사 및 프로덕션 실행

```sh
npm run lint
npm run test:api
npm run build
npm start
```

`npm start`는 `npm run build`가 성공한 뒤 실행해야 합니다.
Next.js 빌드와 별도로 ESLint를 실행합니다.

## 디렉터리 구조

```text
src/app/
  globals.css   # Tailwind CSS 진입점
  layout.tsx    # 공통 HTML 구조와 메타데이터
  page.tsx      # 실행 확인용 기본 페이지
```

교수 UI는 `src/features/professor/`, 서버 AI 로직은 `src/lib/server/`에서 관리합니다.

## 서버 및 배포 방향

Next.js Route Handlers (`src/app/api/`)로 Claude 호출을 처리합니다.
`output: 'export'`와 `/edelai` basePath를 추가하지 않습니다.
로컬 주소는 계속 `http://localhost:3000`을 사용합니다.
배포는 Next.js 서버 실행을 지원하는 환경을 사용하며, 제공자는 아직 정하지 않았습니다.
인증·사용량 제한 구현 전까지 프로덕션 AI 호출은 기본적으로 비활성화됩니다.

## 학번·교번 로그인

첫 화면은 Supabase Auth 로그인입니다. 기존 역할 선택만으로는 교수 화면에 들어갈 수 없습니다.
계정 생성, 서버 환경 변수 및 세션 제한은 [로그인 설정](docs/AUTH.md)을 참고하세요.
실제 Auth 계정과 학번·교번 매핑을 준비해야 로그인할 수 있습니다.
