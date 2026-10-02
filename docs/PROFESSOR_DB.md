# 교수 DB 연결

교수 카드 관리, 학생 제출 조회, 수업 분석, 교수 평가 저장·확정을 Supabase에 연결했다. 로그인(PR #14)과 학생 API(PR #15)가 머지된 최신 main을 통합한 `feat/professor-db` 브랜치이다. 교수 DB 연결 PR의 머지는 별도이다.

## 실행 조건
- `.env.local`: 기존 Supabase URL/secret key, Auth publishable key/회원 매핑 필요. 실제 값은 커밋하지 않는다.
- `PROFESSOR_DB_ENABLED=true`를 설정하고 서버 재시작.
- 서버는 `npm run dev -- --hostname 127.0.0.1`처럼 로컬에 바인딩한다.
- 교수 DB API는 인증된 교수 `p1`의 `phil` 과목만 지원하고, `PROFESSOR_DB_ENABLED=true`일 때만 열린다(배포 환경 포함, localhost 제한 없음). 다중 과목·실서비스 전 담당 과목 권한을 확장해야 한다.
- 학생의 `NEXT_PUBLIC_STORE_MODE`는 변경하지 않았다. 학생 API #15는 통합됐으며 학생 화면 연결 후 팀원과 server 모드로 전환한다. local 모드의 제출은 교수 서버 화면에 자동 전송되지 않는다.

## API
모든 응답은 no-store이고 성공은 `{ok:true,...}`, 실패는 `{ok:false,error:{message}}` 형식이다. 변경 요청은 JSON, 동일 Origin이 필요하다.

| 경로 | 동작 |
|---|---|
| GET /api/professor/cards | phil 과목 카드 조회 |
| POST /api/professor/cards | `{cards: ReviewCard[]}` 1~5개 저장. 승인 상태·작성자는 서버에서 결정. 중복 ID는 기존 행 보존하여 재시도 가능 |
| PATCH /api/professor/cards/:id | `{action, updatedAt, ...}` approve(reviewed=true), reject(reason), reset, edit(wrongClaim/correctClaim/evidence) |
| GET /api/professor/records | 학생 이름·학번, phil 제출 원문, 원본/교수 점수, 평가 상태 조회. 대화는 DB 테이블이 없어 미포함 |
| PATCH /api/professor/submissions/:id | `{action:'draft'|'finalize', updatedAt, reviewed:true, score, reason, feedback}` 교수 검토 저장 또는 평가 확정 |

## 데이터 기준
- 교수 API는 `src/lib/db/` 함수만 사용한다. 새 `professor.ts`는 교수 전용 조건부 쓰기를 담당한다.
- 카드 상태 변경과 편집은 updated_at을 비교한다. 오래된 화면의 요청은 409로 차단한다. 수정 시 승인 상태·작성자·승인 시각을 초기화한다.
- 챌린지 정답 키에 연결된 카드의 문구 수정은 잠근다. 기존 학생 문제의 문구·채점 키와 카드가 어긋나는 것을 방지한다. 승인·반려·검토 대기 변경은 가능하다.
- 새로 생성한 카드는 저장·승인이 가능하지만 새로운 학생 챌린지를 자동 생성하지 않는다. 팀원의 출제 연결 범위와 별도로 맞춘다. 기존 ch1 연결 카드를 승인하면 팀원 DB 공개 조건에 반영된다.
- 교수 점수는 항목별 정수(판정 0~1, 이유·개념·근거 0~2, 과정 감점 0/-2). DB total이 integer인 계약에 맞춘다. 합계는 서버가 계산하며 클라이언트 total을 무시한다.
- 점수 항목 변경 시 사유 필수. 원문 검토 확인과 피드백 필수. 미채점(null) 점수는 저장·확정할 수 없다.
- professor_score, professor_comment, total, pending_review와 finalized_*를 단일 UPDATE로 저장한다. 원본 score는 보존한다.
- 확정 후에는 수정 불가. 다른 화면에서 수정했거나 이미 확정된 요청은 409. 학생 원본 채점 항목은 바꾸지 않는다.
- 조회·통계에는 professor_score가 있으면 반영한다. 확정 전 저장한 검토 점수도 포함한다. 원본 점수는 학생 상세에 별도 표시한다.
- 검토 사유와 피드백은 별도 DB 컬럼이 없어 professor_comment에 구분해 저장한다.
- 현재 가상 데이터용 시연 기능이며 실제 대학 성적 시스템과 연동하지 않는다.

## 검증 (2026-10-03)
- 린트, 프로덕션 빌드, API 자동 테스트.
- 실제 Auth 및 DB 통합 검사 28개: 로그인/역할/HttpOnly, 카드 생성·저장 재시도·승인·반려·수정, 오래된 버전 차단, 검토 저장·합계 계산·확정·원본 보존·확정 잠금·재조회.
- 별도 UUID 테스트 카드와 제출 행만 생성한 뒤 삭제했다. 기존 학생 기록 및 ch1의 승인 대기 상태는 변경하지 않았다.
- 브라우저에서 학생 이름, 교수 DB 카드/학생 목록, 새로고침 세션 유지, 로그아웃 후 뒤로 가기 차단 확인.
- 이번 작업에서 실제 Claude 생성은 호출하지 않았다. 학생 API #15 통합 후 빌드·린트·자동 테스트를 다시 확인했다. 전체 학생 제출→교수 확정 시연은 학생 화면 연결 후 다시 확인해야 한다.
