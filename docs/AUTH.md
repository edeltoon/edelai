# 학번·교번 로그인 (연결 준비)

첫 화면은 등록된 학번·교번과 비밀번호를 받는다. 학교 SSO가 아닌 SeTask 전용 Supabase Auth 계정이다.
관리자가 사전에 생성한 이메일/비밀번호 계정에 학번을 서버에서 매핑한다. 회원가입·이메일 확인·비밀번호 복구 UI는 포함하지 않는다.

## 설정
서버 .env.local:
- SUPABASE_URL: 프로젝트 URL
- SUPABASE_PUBLISHABLE_KEY: 프로젝트의 publishable(또는 legacy anon) key. DB 관리자 secret key와 별도이며 인증 요청에 사용.
- AUTH_MEMBER_EMAILS: 학번/교번을 Auth 이메일에 연결하는 JSON 객체. 예: {"P001":"prof@example.test"} (실제 사용 가능한 등록 이메일로 대체)
- SUPABASE_SECRET_KEY: 팀원의 DB 전용 키. 이 로그인 코드에서는 사용하지 않음.

비밀번호는 환경 변수나 매핑에 저장하지 않는다. 테스트 계정 비밀번호는 사용자가 로그인 화면에 직접 입력한다.
매핑은 초기 소규모 테스트용이다. 팀원 DB가 준비되면 관리자만 관리하는 계정 매핑 조회로 교체한다.

## 계정 준비 (관리자)
1. Supabase Authentication에서 이메일/비밀번호 테스트 계정 생성 및 이메일 인증 완료.
2. 관리자 API 등으로 Auth 사용자의 app_metadata에 아래 필드를 등록한다.
   - role: student 또는 professor
   - member_no: 화면에 입력할 학번·교번
   - app_user_id: 팀원 DB 학생/교수 ID와 동일한 값 (s1/p1 등)
   - name: 표시 이름
3. AUTH_MEMBER_EMAILS에 member_no와 같은 사용자의 이메일을 등록한다.

사용자가 수정할 수 있는 user_metadata로 권한을 부여하지 않는다.
기존 DB users/profiles 테이블에 행이 있다고 Auth 사용자가 자동 생성되지는 않는다.
이 구현은 원격 계정·권한·테이블을 생성하거나 변경하지 않았다.

## 보안 및 세션 동작
- POST /api/auth/login -> Supabase password 인증 -> /auth/v1/user로 검증.
- 관리자 app_metadata의 역할과 번호를 확인한 뒤 HttpOnly·SameSite=Lax 쿠키에 access token만 저장. HTTPS에서는 Secure.
- 비밀번호/토큰을 로그나 JSON 응답에 담지 않음. 브라우저 localStorage는 기존 학생 UI용 표시 정보만 저장하며 접근 권한에 사용하지 않음.
- Next proxy에서 /professor, /student 및 /api/professor, /api/student, /api/chat 접근을 검증. 학생은 교수 경로 접근 불가.
- 쿠키 변경 및 API 변경 요청에 동일 origin 요구.
- refresh token은 저장하지 않음. 최대 1시간 또는 토큰 만료 후 다시 로그인해야 함.
- 로그아웃은 이 브라우저의 쿠키를 삭제. 서버의 기존 access token 즉시 폐기나 전체 기기 로그아웃은 구현하지 않음.
- Supabase 인증 한도에 따른 429 표시. 공개 배포 전 별도 분산 요청 제한 및 팀원 API의 사용자별 리소스 권한 검증 필요.
- PR #6 학생 셸과 통합. 학생 레이아웃은 서버에서 확인한 계정을 전달하고 로그아웃을 제공한다. localStorage 변경으로 학생 ID를 선택하지 않는다. 학생 화면 본문과 서버 API는 팀원 후속 작업이다.
- 기존 역할 선택 컴포넌트는 보존하지만 첫 화면에서는 사용하지 않음. 이전 데모 localStorage로 로그인할 수 없음.

## 검증 상태
2026-10-03 실제 Supabase 테스트 계정으로 학생·교수 로그인, 잘못된 비밀번호, 역할별 페이지/API 접근 차단, 로그인 유지, 로그아웃을 확인했다. 브라우저에서 학생 이름 표시, 교수 화면 이동, 새로고침 및 로그아웃 후 뒤로 가기도 확인했다. 로그인 응답에 토큰·비밀번호가 없고 쿠키가 HttpOnly인 것도 검증했다.
자동 테스트는 대체 Auth 응답으로 회원 매핑·역할·번호·실패 처리를 검사한다. 실제 비밀번호·키는 테스트 코드나 문서에 저장하지 않는다.
세션은 여전히 최대 1시간이며 자동 갱신이 없다. 쿠키 시간만 늘리면 Supabase access token 만료를 연장하지 못한다. 긴 시연 세션이 필요하면 Supabase 토큰 만료 설정과 서버 세션 정책을 함께 조정하거나 HttpOnly refresh token 갱신을 별도 구현해야 한다. 이번 작업에서는 원격 인증 설정을 변경하지 않았다.
로그인 도입 후 curl API 호출 역시 인증 쿠키와 Origin 헤더가 필요하다.
