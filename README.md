# suffrage_age

세계사 주제30 「선거 나이, 다시 생각해 보기」(학생 참정권) 의견 글쓰기 웹앱 (2학년, 교과서 153쪽).

- 파일: `index.html` / `style.css` / `data.js`(교과서 사실·입장/이유 선택지·힌트·낱말 풀이) / `app.js`(로직). 빌드 단계 없음.
  `focus_guard.js`·`draft_guard.js`·`glossary.js`는 history26 `snippets/`에서 복사한 것.
- 미리보기: `?preview=1` (저장 없음, 가짜 이전 글 예시가 나옴, `&prior=none`이면 "이전 글 없음" 화면). 자동채움: `?sid=20512&name=이름`.
- 흐름: ① 지난번 내 글 보기 → ② AI가 읽은 입장·이유를 학생이 확인·수정 → ③ 교과서 153쪽 사실 1~2개 고르기 → ④ 쓰기(교과서 사실 / 내 의견 칸 분리, 힌트 토글) → ⑤ 제출.
- 이전 글은 백엔드 비공개 시트 `이전글` 탭에서 `GET ?mode=priorWriting`으로 학번+이름이 둘 다 맞을 때만 본인 글 1건을 받아 온다.
  글은 이 레포에 없다(학생 개인정보). 글이 없거나(found:false) 조회가 실패하면 처음부터 새로 쓰게 한다.
- 포털 커리큘럼 관리에 activity id 하나 등록: `30차시_학생참정권_의견` (`app.js`의 `CONFIG.GAME_NAME`).
- 제출은 기존 기본 제출 경로(학생당 1행). `reflection`(G열) = ①②③ 합본, `choiceSummary` = 입장·이유, `choicesJson`에 AI 분류·확정값·고른 사실.
- 교과서 사실 문구는 vienna_diary의 uk1832·ukworker·ukwoman 카드 문구와 같다. 바꿔야 하면 효니에게 먼저 묻는다.
