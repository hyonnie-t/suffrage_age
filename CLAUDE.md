# suffrage_age — 주제30 학생 참정권 의견 글쓰기 웹앱

2학년 세계사 수업용 개별 웹앱(정적 파일, 빌드 없음). 학생이 근거를 고르고 의견 글을 써서 제출한다.
배포: https://hyonnie-t.github.io/suffrage_age/ (GitHub Pages). 저장소는 public이다.

## 구조
- `index.html` 화면 / `app.js` 동작 / `data.js` 문항·자료 / `glossary.js` 낱말 풀이 / `style.css`
- `draft_guard.js`(임시저장), `focus_guard.js`(이탈 신호), 포털 로그인은 `portal_auth.js` 한 줄(v83)
- 활동 id: `CONFIG.GAME_NAME` = `30차시_학생참정권_의견` (커리큘럼 id와 글자까지 같아야 한다)

## 규칙
- 백엔드는 새로 만들지 않는다. `history26_backend`(Apps Script)의 기존 action을 쓴다.
- 마무리 화면의 글 복사 옆에 «우리 반 패들렛 열기» 버튼(`padletBtn`)을 유지한다. 링크는 레포에 적지 않고 `?mode=curriculum`에서 가져온다.
- 태블릿 대응이 기본이다: 폭 3단계(28/48/64rem), 768x1024와 1180x820에서 확인.
- URL·ID·토큰은 코드에 새로 적지 않는다. 옮겨 적을 땐 grep/diff로 원본과 대조한다.
- 푸시는 작업 브랜치에만, `main` 병합은 효니가 한다. OneDrive 안의 `.git`이니 시작 전에 `git status`와 `.git/index.lock`을 본다.
- 수정·배포 뒤에는 배포 주소를 내장 브라우저로 직접 열어 확인한 다음 보고한다.

## 상태
- v1 완료(2026-10): 제출 뒤 4입장 정리, 패들렛 버튼 추가. 커리큘럼 등록 규칙은 위키 `수업/feedback-register-curriculum-directly.md`.
