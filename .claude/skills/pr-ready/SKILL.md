---
name: pr-ready
description: 작업을 마무리하고 커밋, 푸시, PR 생성까지 진행. 사용자가 /pr-ready를 입력했을 때만 실행.
disable-model-invocation: true
---

# PR 준비 절차

순서대로 진행하고, 실패하면 그 단계에서 멈추고 원인과 해결책을 보고한다.

1. **브랜치 확인**: `git branch --show-current`. `main`이면 진행하지 말고, 작업 내용에 맞는 브랜치 이름(`feat/…`, `fix/…`, `data/…`, `docs/…`)을 제안한 뒤 `git switch -c <이름>`으로 옮긴다.
2. **최신화**: `git fetch origin` 후 `git merge origin/main`. 충돌이 나면 충돌 파일 목록과 양쪽 변경 요약을 보여주고, 사용자 확인 후 해결한다. 다른 팀원 담당 폴더의 충돌은 임의로 해결하지 않는다.
3. **검사**: `npm run build`(정적 export까지 통과해야 함)와 `npm run lint`. 실패하면 고친다. `generateStaticParams` 누락, 서버 기능 사용 같은 export 오류는 CLAUDE.md의 Next.js 정적 export 규칙대로 고친다.
4. **위험 파일 확인**: `git status`와 `git diff --stat`으로 변경 파일을 보여준다. `.env`, API 키 형태 문자열(`sk-`, `AIza`), `node_modules`, `.next`, `out`, 개인 정보, 세종대 교표 이미지가 있으면 커밋에서 빼고 알린다.
5. **커밋**: 변경을 의미 단위로 나눠 커밋. 메시지는 한국어, 형식 `feat: 검증 챌린지 확신도 슬라이더 추가`. (`feat`/`fix`/`style`/`data`/`docs`/`chore`)
6. **푸시**: `git push -u origin <브랜치>`.
7. **PR**: `gh`가 있으면 `gh pr create --base main --fill` 후 본문을 아래 형식으로 수정. 없으면 GitHub에서 PR을 여는 URL과 본문을 출력.

PR 본문 형식:
```
## 무엇을
- (화면/기능 단위 요약)

## 확인 방법
- npm run dev → http://localhost:3000/edelai/(경로) 에서 (동작)

## 체크
- [ ] npm run build 통과
- [ ] DESIGN.md 토큰만 사용
- [ ] learning-loop-rules 위반 없음
```
