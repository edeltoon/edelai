# EdelAI 작업 규칙

제품 기획은 `docs/PLAN.md`, 구현 기준은 `docs/ARCHITECTURE.md`와 `docs/API.md`이며 실행 방법은 `README.md`를 참고한다.
사용자가 이후 명시적으로 변경한 방향은 이 문서보다 우선한다.

- 실제 Claude API를 호출하는 학습 서비스를 개발한다. 목데이터 전용 시연이 목표가 아니다.
- 기존 Next.js App Router, TypeScript, Tailwind CSS, ESLint, npm을 유지한다.
- 추가 UI 라이브러리는 도입하지 않는다.
- 서버 호출은 `src/app/api/`, Claude 서버 전용 로직은 `src/lib/server/`에 둔다.
- API 키는 서버의 `ANTHROPIC_API_KEY`로만 읽는다. `NEXT_PUBLIC_*`에 넣지 않는다.
- `output: 'export'`, `/edelai` basePath, GitHub Pages 전용 워크플로를 추가하지 않는다.
- 사용자 담당은 교수 화면·서버 API·Claude 연결, 팀원 담당은 학생 화면이다.
- 공통 UI 담당과 API 형식은 팀과 맞춘다. 다른 담당의 파일을 불필요하게 수정하지 않는다.
- 일반 학습과 오류 검증 챌린지를 구분하고, 학생 제출 전에 정답을 클라이언트에 보내지 않는다.
- 실제 API 실패를 목데이터 응답으로 조용히 대체하지 않는다.
- 기능 브랜치에서 작업하고 PR로 검토한다. 사용자 요청 없이 자동 머지하지 않는다.
- 코드 변경 시 린트와 빌드를 확인한다. 실제 Claude 호출 검증 여부는 따로 보고한다.
- 문서에 적힌 계획을 이미 구현된 기능으로 보고하지 않는다.

UI 작업에는 팀원의 `DESIGN.md` 디자인 토큰과 컴포넌트 이름을 사용한다.
스타터 `.claude/skills/`와 `docs/PROMPTS.md`는 참고 자료다. 목데이터 전용·정적 export·클라이언트 채점 전제보다 현재 서버/API 기준과 사용자 지시를 우선한다.
