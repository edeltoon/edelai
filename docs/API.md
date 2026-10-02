# Claude 대화 API

## 현재 구현 범위

`POST /api/chat`는 서버에서 Claude의 `Messages` REST API를 호출한다.
학생·교수 UI, 실제 인증, DB, 강의자료 검색, 오류 카드 생성·채점은 아직 연결하지 않았다.
현재는 일반 서양철학 학습 대화 전용이다. 챌린지의 정답 조회 API로 사용하지 않는다.

팀원 스타터 PR #1 (`docs/starter`)을 검토했다. `phil` 과목 ID와 일반 학습/검증 챌린지의
분리 원칙을 참고했다. 목데이터 전용 답변, 정적 export 및 Pages 배포 설정은 적용하지 않았다.
PR #1의 기획·디자인 문서는 보존하고 정적 export 설정은 제거했다. 기존 Pages 워크플로는 테스트·린트·빌드 검증으로 전환했다.

## 로컬 설정

Node.js 22.18 이상 또는 24 LTS에서 테스트를 실행한다.

```sh
npm ci
# .env.local이 없을 때만 복사한다. 기존 키를 덮어쓰지 않는다.
cp -n .env.example .env.local
```

Claude Console에서 발급한 키를 `.env.local`의 `ANTHROPIC_API_KEY`에 직접 입력한다.
`ANTHROPIC_MODEL`은 본인 프로젝트에서 사용할 수 있는 Messages 모델 ID로 설정한다.
예제의 모델은 계정의 이용 가능 여부를 보장하지 않는다.
키를 채팅이나 PR에 붙이지 않는다. 키 파일은 Git에서 제외된다.

워크스페이스가 지정되지 않은 키라면 `ANTHROPIC_WORKSPACE_ID`도 설정한다.
Claude Console의 Settings → Workspaces의 ID를 사용하며, 서버가
`anthropic-workspace-id` 헤더로 전달한다. 워크스페이스 전용 키는 생략할 수 있다.

```sh
npm run dev
```

환경 변수를 변경한 뒤 개발 서버를 재시작한다.
개발 환경은 `http://localhost:3000/api/chat`을 사용한다.
인증·사용자별 한도는 아직 구현하지 않아 프로덕션은 기본적으로 503으로 비활성화한다.
`AI_CHAT_ENABLED=true`는 신뢰할 수 있는 로컬 프로덕션 테스트에서만 켠다.
공개 서비스에서는 인증과 사용량 제한을 구현한 뒤 활성화한다.

## 요청

Content-Type: `application/json`

```json
{
  "courseId": "phil",
  "message": "플라톤의 이데아론을 간단하게 설명해 주세요.",
  "history": [
    { "role": "user", "text": "서양철학 공부를 시작하고 싶어요." },
    { "role": "model", "text": "어떤 개념부터 알아볼까요?" }
  ]
}
```

- `courseId`: 현재 `phil`만 지원.
- `message`: 공백만 있는 입력 제외, 최대 4,000자.
- `history`: 생략 가능. user/model 순서의 완료된 대화 최대 5쌍. 각 메시지 최대 4,000자.
- 기존 화면 호환을 위해 요청의 `model` 역할 이름은 유지한다. 서버가 Claude 요청의 `assistant`로 변환한다.
- 전체 JSON 본문: UTF-8 기준 최대 32 KiB. 길어지면 새 대화를 시작한다.
- 키·모델·시스템 지시문을 클라이언트에서 지정할 수 없다.
- 이전 대화는 브라우저가 보낸 비신뢰 데이터다. 평가나 사용자 인증의 근거로 사용하지 않는다.
- 대화 내용은 외부 Claude API로 전송되며 서버 DB에는 저장하지 않는다.

## 응답과 화면 연결

응답의 `source`는 `claude`이다. 화면에서 이전 공급자 이름을 비교하던 코드가 있다면 함께 변경한다.

```json
{ "ok": true, "reply": "응답 본문", "source": "claude", "model": "설정한 모델 ID" }
```

```json
{ "ok": false, "error": { "code": "AI_NOT_CONFIGURED", "message": "서버의 Claude API 키와 모델 설정이 필요해요." } }
```

```ts
import type { ChatResponse } from "@/types/chat";

const response = await fetch("/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ courseId: "phil", message: question }),
});
const result: ChatResponse = await response.json();
if (!result.ok) throw new Error(result.error.message);
// result.reply를 React 텍스트로 표시한다. 원문 HTML로 삽입하지 않는다.
```

네트워크 오류도 화면에서 처리하고, 전송 중 중복 제출을 막는다.
서버는 30초 뒤 요청을 중단한다. 실패 시 목데이터로 자동 대체하지 않는다.

| HTTP | 의미 |
| --- | --- |
| 400 | 잘못된 JSON·과목·질문·이전 대화 |
| 413 / 415 | 본문 크기 초과 / JSON이 아닌 요청 |
| 422 | Claude 질문 차단 |
| 429 | Claude 사용량 제한 |
| 502 | 외부 서비스 오류, 비어 있거나 완료되지 않은 응답 |
| 503 | 서버 키·모델 미설정 또는 프로덕션 비활성화 |
| 504 | 30초 응답 시간 초과 |

## 확인

```sh
npm run test:api
npm run lint
npm run build
curl -sS http://localhost:3000/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"courseId":"phil","message":"이데아론을 두 문장으로 설명해 주세요."}'
```

`test:api`는 외부 응답을 대체한 자동 테스트이며 유료 호출을 하지 않는다.
실제 연결 검증은 키를 설정한 뒤 마지막 요청에서 `ok: true`, `source: claude`와 답변을 확인한다.

공식 문서: [Messages](https://platform.claude.com/docs/en/api/messages/create),
[API 키 관리](https://platform.claude.com/docs/en/api/overview).
