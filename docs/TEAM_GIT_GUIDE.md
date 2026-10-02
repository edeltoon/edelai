# 현재 사용 시 주의

스타터 참고 자료입니다. 실제 Claude 호출과 서버 실행 기준은 `docs/ARCHITECTURE.md`, API 형식은 `docs/API.md`를 우선합니다. 목데이터·localStorage 흐름은 화면 개발용 예시이며 실제 서버 연동 완료가 아닙니다.

# 팀원용 Git 작업 가이드 (Windows PowerShell 기준)

## 처음 한 번만
```powershell
winget install Git.Git
winget install OpenJS.NodeJS.LTS
winget install Microsoft.VisualStudioCode
winget install GitHub.cli
# 설치 후 터미널을 닫았다 다시 연다

git config --global user.name "본인 이름"
git config --global user.email "GitHub에 등록한 이메일"
gh auth login            # GitHub.com → HTTPS → 브라우저 로그인

cd $HOME\Documents
git clone https://github.com/edeltoon/edelai.git
cd edelai
npm install
code .
```

Claude Code 설치 (Pro 이상 요금제 필요):
```powershell
irm https://claude.ai/install.ps1 | iex
claude --version
```

## 매일 작업 순서
```powershell
# 1) 최신 main 받기
git switch main
git pull

# 2) 내 작업 브랜치 만들기 (작업 하나당 하나)
git switch -c feat/student-challenge

# 3) 개발 서버 켜기 (터미널 하나는 이걸로 계속 켜둔다)
npm run dev
# → http://localhost:3000/

# 4) 다른 터미널에서 Claude Code
claude
# ... 작업 ...
# 마무리할 때 Claude Code 안에서:  /pr-ready
```

직접 올릴 때:
```powershell
npm run build
git add .
git commit -m "feat: 검증 챌린지 확신도 슬라이더 추가"
git push -u origin feat/student-challenge
gh pr create --base main --fill
```

## PR이 머지된 뒤
```powershell
git switch main
git pull
git branch -d feat/student-challenge
```

## 자주 생기는 문제
| 상황 | 해결 |
|---|---|
| `main`에서 작업해 버렸다 (아직 커밋 전) | `git switch -c feat/새이름` → 변경이 그대로 새 브랜치로 따라온다 |
| push가 거절됨 (main 보호) | 정상. 브랜치로 올리고 PR을 만든다. 레포가 Private(무료)이면 보호가 안 걸리니 main 직접 push 금지는 약속으로 지킨다 |
| PR에 충돌 표시 | `git fetch origin` → `git merge origin/main` → 충돌 파일 수정 → 커밋 → push. 남의 담당 파일이면 그 사람과 상의 |
| `npm run dev` 했는데 404 | 주소가 `http://localhost:3000/`인지 확인 |
| 하이드레이션 오류 (Hydration failed) | 렌더 중에 localStorage를 읽고 있음. `useEffect` 안으로 옮긴다 |
| `claude` 명령을 못 찾음 | 터미널(VS Code 포함)을 완전히 껐다 켠다. 그래도 안 되면 설치 명령을 다시 실행하고 https://code.claude.com/docs/en/troubleshoot-install 참고 |
