# EdelAI

AI 오류 검증 기반 대학 학습 평가 플랫폼을 위한 해커톤 프로젝트입니다.
현재는 개발 환경과 기본 실행 확인용 페이지만 준비되어 있습니다.

## 기술 구성

- Next.js App Router
- TypeScript
- Tailwind CSS
- ESLint
- npm
- `src/` 디렉터리 구조

추가 UI 라이브러리, 실제 제품 화면, 데이터베이스, 인증, LLM API는 아직 포함하지 않습니다.

## 사전 준비

- Node.js 22 또는 24 LTS 권장 (최소 20.9)
- npm
- 비공개 GitHub 저장소 접근 권한

## 설치 및 개발 서버 실행

```sh
git clone https://github.com/edeltoon/edelai.git
cd edelai
npm ci
npm run dev
```

이미 저장소를 받은 경우 해당 폴더에서 `npm ci`부터 실행하세요.
개발 서버가 실행되면 [http://localhost:3000](http://localhost:3000)에 접속합니다.
현재는 환경 변수나 외부 서비스 API 키가 필요하지 않습니다.

`package-lock.json`을 함께 관리하며, 기존 의존성 설치에는 `npm ci`를 사용합니다.
의존성을 추가하거나 변경할 때는 `npm install`을 사용하고 잠금 파일도 함께 반영합니다.

## 코드 검사 및 프로덕션 실행

```sh
npm run lint
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

제품 기획이 확정되면 이 구조를 바탕으로 기능을 추가합니다.
