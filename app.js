/* 주제30 「학생 참정권」 의견 글쓰기 웹앱 — 로직(app.js) */
const CONFIG = {
  SHEET_WEBAPP_URL: "https://script.google.com/macros/s/AKfycbyXSjCfWY_HiZFqW_OBR-FQDoIfF1z_STqyKWUI31MacHeY3u7hbirFSFDvW-5yuUHaJQ/exec",
  /* 포털 커리큘럼 관리에 이 id 하나로 활동을 등록한다 */
  GAME_NAME: "30차시_학생참정권_의견",
  /* 백엔드 비공개 시트 `이전글`의 주제키. 학번+이름이 둘 다 맞아야 본인 글 한 건만 내려온다 */
  PRIOR_TOPIC: "suffrage_age"
};

const S = {
  sid: "", name: "", ban: 0, preview: false,
  prior: null,            // { found, text, aiStance, aiReasons } — 서버가 준 본인 글(없으면 found:false)
  priorState: "idle",     // idle | loading | ok | fail
  stance: "", reasons: [], facts: [],
  stanceTouched: false, reasonsTouched: false,
  sending: false, submitted: false
};

/* 화면 목록: stage는 위쪽 5단계 막대 */
const SCREENS = { s0: "", s1: "before", s2: "stance", s3: "fact", s4: "write", s5: "wrap" };
const STAGES = ["before", "stance", "fact", "write", "wrap"];

const $ = id => document.getElementById(id);
const labelOf = (list, k) => { const x = list.find(i => i.k === k); return x ? x.label : ""; };

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

function show(key) {
  Object.keys(SCREENS).forEach(k => { $(k).hidden = (k !== key); });
  const stage = SCREENS[key];
  $("steps").hidden = !stage;
  const cur = STAGES.indexOf(stage);
  document.querySelectorAll("#steps li").forEach(li => {
    const i = STAGES.indexOf(li.dataset.k);
    li.className = i === cur ? "on" : (i < cur ? "done" : "");
  });
  window.scrollTo(0, 0);
}

function parseSid(sid) {
  if (!/^\d{5}$/.test(sid)) return null;
  return { grade: Number(sid[0]), ban: Number(sid.slice(1, 3)), num: Number(sid.slice(3)) };
}

function hasPrior() { return !!(S.prior && S.prior.found && S.prior.text); }

/* ── 시트 전송 ── */
async function postToSheet(payload) {
  if (S.preview) return { result: "success", preview: true };
  const res = await fetch(CONFIG.SHEET_WEBAPP_URL, { method: "POST", body: JSON.stringify(payload) });
  const json = await res.json();
  if (json.result !== "success") {
    const err = new Error(json.message || "저장 실패");
    err.locked = !!json.locked;
    throw err;
  }
  return json;
}

/* ── 지난번 글 불러오기: 학번+이름이 둘 다 맞을 때만 서버가 본인 글 1건을 준다 ──
 *    글을 못 찾은 것(found:false)과 불러오기 실패(네트워크·서버)는 다르게 다룬다. 글은 메모리에만 두고 저장소에 남기지 않는다. */
function cleanPrior(j) {
  if (!j || j.result !== "success") return null;
  if (!j.found || !String(j.text || "").trim()) return { found: false };
  return {
    found: true,
    text: String(j.text),
    aiStance: STANCE_KEYS.indexOf(j.aiStance) >= 0 ? j.aiStance : "",
    aiReasons: (Array.isArray(j.aiReasons) ? j.aiReasons : []).filter(k => REASON_KEYS.indexOf(k) >= 0).slice(0, MAX_REASONS)
  };
}

async function fetchPrior() {
  if (S.preview) {
    const none = new URLSearchParams(location.search).get("prior") === "none";
    return none ? { found: false } : PREVIEW_PRIOR;
  }
  const url = CONFIG.SHEET_WEBAPP_URL + "?mode=priorWriting&topic=" + encodeURIComponent(CONFIG.PRIOR_TOPIC) +
    "&studentId=" + encodeURIComponent(S.sid) + "&name=" + encodeURIComponent(S.name);
  const res = await fetch(url);
  const prior = cleanPrior(await res.json());
  if (!prior) throw new Error("bad response");
  return prior;
}

function loadPrior() {
  S.priorState = "loading";
  renderBefore();
  return fetchPrior().then(p => { S.prior = p; S.priorState = "ok"; }, () => { S.prior = null; S.priorState = "fail"; })
    .then(() => { initPicks(); renderBefore(); });
}

/* 서버(AI) 분류를 처음 값으로 깔고, 학생이 고치면 touched로 표시한다 */
function initPicks() {
  if (S.stanceTouched || S.reasonsTouched) return;
  S.stance = hasPrior() ? S.prior.aiStance : "";
  S.reasons = hasPrior() ? S.prior.aiReasons.slice() : [];
}

/* ── 시작 ── */
function startApp() {
  const sid = $("sid").value.trim();
  const name = $("sname").value.trim();
  const p = parseSid(sid);
  if (!p) { $("startErr").textContent = "학번은 숫자 5자리로 써 줘. (예: 20512)"; return; }
  if (!name) { $("startErr").textContent = "이름을 써 줘."; return; }
  $("startErr").textContent = "";
  S.sid = sid; S.name = name; S.ban = p.ban;
  FocusGuard.start({ key: CONFIG.GAME_NAME + ":" + sid }); // 작성 중 화면 이탈·붙여넣기 기록 (history26 snippets/focus_guard.js)
  if (window.DraftGuard) DraftGuard.start({ key: CONFIG.GAME_NAME, sid: sid }); // 글쓰기 칸 임시저장 (history26 v75)
  show("s1");
  loadPrior();
}

/* ── 1. 지난번 내 글 ── */
function renderBefore() {
  const note = $("beforeNote"), box = $("beforeText"), btns = $("beforeBtns");
  box.hidden = true; btns.hidden = true;
  $("s1Next").disabled = false;
  if (S.priorState === "loading" || S.priorState === "idle") {
    note.textContent = "내 글을 찾는 중이야…";
    $("s1Next").disabled = true;
  } else if (S.priorState === "fail") {
    note.textContent = "글을 불러오지 못했어. 인터넷을 확인하고 다시 불러오거나, 그냥 새로 써도 돼.";
    btns.hidden = false;
    $("s1Next").disabled = true;
  } else if (hasPrior()) {
    note.textContent = "\"선거할 수 있는 나이(만 18세)를 바꿀 필요가 있을까?\"에 네가 쓴 글이야. 이 글은 너와 선생님만 볼 수 있어.";
    box.textContent = S.prior.text; box.hidden = false;
  } else {
    note.textContent = "네가 쓴 글을 못 찾았어. 괜찮아, 지금 생각대로 처음부터 써 보자.";
  }
}

/* ── 2. 내 입장 확인 ── */
function optEl(role, checked, text, onPick, aiMark) {
  const row = el("div", "opt");
  row.setAttribute("role", role);
  row.tabIndex = 0;
  row.setAttribute("aria-checked", checked ? "true" : "false");
  row.appendChild(el("span", "opt-mark"));
  const p = el("p", "opt-text", text);
  if (aiMark) p.appendChild(el("span", "ai-chip", "AI가 고른 것"));
  row.appendChild(p);
  row.addEventListener("click", e => { if (e.target.closest && e.target.closest(".term")) return; onPick(); });
  row.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPick(); } });
  return row;
}

function renderStance() {
  const withAi = hasPrior() && (S.prior.aiStance || S.prior.aiReasons.length);
  $("stanceTitle").textContent = withAi ? "AI가 읽은 내 입장, 맞아?" : "내 입장 고르기";
  $("stanceNote").textContent = withAi
    ? "AI가 네 글을 읽고 이렇게 나눠 봤어. 틀릴 수 있으니까 네 생각과 다르면 바꿔 줘. 최종 입장은 네가 정하는 거야."
    : "선거할 수 있는 나이(만 18세)를 바꿀 필요가 있는지 지금 내 입장을 골라 줘.";
  const sl = $("stanceList"); sl.innerHTML = "";
  STANCES.forEach(s => {
    const mark = withAi && S.prior.aiStance === s.k;
    sl.appendChild(optEl("radio", S.stance === s.k, s.label, () => {
      S.stance = s.k; S.stanceTouched = true; $("s2Err").textContent = ""; renderStance();
    }, mark));
  });
  const rl = $("reasonList"); rl.innerHTML = "";
  REASONS.forEach(r => {
    const on = S.reasons.indexOf(r.k) >= 0;
    const mark = withAi && S.prior.aiReasons.indexOf(r.k) >= 0;
    const row = optEl("checkbox", on, r.label, () => {
      const i = S.reasons.indexOf(r.k);
      if (i >= 0) S.reasons.splice(i, 1);
      else if (S.reasons.length >= MAX_REASONS) { $("s2Err").textContent = "이유는 " + MAX_REASONS + "개까지 고를 수 있어. 하나를 빼고 골라 줘."; return; }
      else S.reasons.push(r.k);
      S.reasonsTouched = true; $("s2Err").textContent = ""; renderStance();
    }, mark);
    if (!on && S.reasons.length >= MAX_REASONS) row.setAttribute("aria-disabled", "true");
    rl.appendChild(row);
  });
}

function goStance() { renderStance(); show("s2"); }

/* ── 3. 교과서 사실 고르기 ── */
function mineTag(box) {
  box.innerHTML = "";
  box.appendChild(el("b", "", "내 입장"));
  box.appendChild(document.createTextNode(" " + labelOf(STANCES, S.stance) +
    (S.reasons.length ? " — " + S.reasons.map(k => labelOf(REASONS, k)).join(" / ") : "")));
}

function renderFacts() {
  mineTag($("s3Mine"));
  const box = $("factBox"); box.innerHTML = "";
  FACT_GROUPS.forEach(g => {
    const wrap = el("div", "fact-group");
    wrap.appendChild(el("h3", "", g.title));
    const list = el("div", "opt-list");
    g.facts.forEach(f => {
      const on = S.facts.indexOf(f.id) >= 0;
      const row = optEl("checkbox", on, f.t + " ", () => {
        const i = S.facts.indexOf(f.id);
        if (i >= 0) S.facts.splice(i, 1);
        else if (S.facts.length >= MAX_FACTS) { $("s3Err").textContent = "사실은 " + MAX_FACTS + "개까지 고를 수 있어. 하나를 빼고 골라 줘."; return; }
        else S.facts.push(f.id);
        $("s3Err").textContent = ""; renderFacts();
      });
      row.querySelector(".opt-text").appendChild(el("span", "pg", "(" + f.p + "쪽)"));
      if (!on && S.facts.length >= MAX_FACTS) row.setAttribute("aria-disabled", "true");
      list.appendChild(row);
    });
    wrap.appendChild(list);
    box.appendChild(wrap);
  });
}

function goFact() {
  if (!S.stance) { $("s2Err").textContent = "내 입장을 하나 골라 줘."; return; }
  if (S.stance !== "unsure" && !S.reasons.length) { $("s2Err").textContent = "이유를 1개 이상 골라 줘."; return; }
  renderFacts(); show("s3");
}

/* ── 4. 쓰기 ── */
function chosenFacts() { return S.facts.map(id => ALL_FACTS.find(f => f.id === id)).filter(Boolean); }
function factText(f) { return f.t + " (" + f.p + "쪽)"; }

function buildParts() {
  const box = $("partBox");
  PARTS.forEach(pt => {
    const card = el("div", "card part " + (pt.kind === "fact" ? "factpart" : "mine"));
    const lab = el("label", "part-label", pt.label);
    lab.htmlFor = pt.id;
    card.appendChild(lab);
    const g = el("p", "part-guide", pt.guide);
    g.id = pt.id + "Guide";
    card.appendChild(g);
    const d = el("details", "hint");
    d.appendChild(el("summary", "", "💡 막막하면 힌트 보기"));
    d.appendChild(el("p", "", pt.hint));
    card.appendChild(d);
    const ta = el("textarea");
    ta.id = pt.id; ta.rows = pt.rows;
    ta.placeholder = "여기에 써 줘.";
    const cnt = el("div", "count");
    const upd = () => { cnt.textContent = ta.value.trim().length + "자"; };
    ta.addEventListener("input", () => { upd(); $("s4Err").textContent = ""; });
    upd();
    card.appendChild(ta);
    card.appendChild(cnt);
    box.appendChild(card);
  });
}

function renderWriteHead() {
  mineTag($("s4Mine"));
  const fb = $("s4Facts"); fb.innerHTML = "";
  chosenFacts().forEach(f => fb.appendChild(el("p", "recap-fact", factText(f))));
  const bf = $("s4Before");
  bf.hidden = !hasPrior();
  if (hasPrior()) $("s4BeforeText").textContent = S.prior.text;
  const end = PARTS.find(p => p.id === "partEnd");
  $("partEndGuide").textContent = hasPrior() ? end.guideChange : end.guide;
}

function partValue(id) { return $(id).value.trim(); }

function checkParts() {
  for (const pt of PARTS) {
    if (partValue(pt.id).length < pt.min) return pt.label.slice(0, 1) + " 칸을 조금 더 써 줘.";
  }
  return "";
}

function goWrite() {
  if (!S.facts.length) { $("s3Err").textContent = "교과서 사실을 1개 이상 골라 줘."; return; }
  renderWriteHead(); show("s4");
}

/* ── 5. 마무리 ── */
function essay() { return PARTS.map(pt => partValue(pt.id)).join("\n\n"); }

function stanceLine() {
  return "내 입장: " + labelOf(STANCES, S.stance) + (S.reasons.length ? " (이유: " + S.reasons.map(k => labelOf(REASONS, k)).join(", ") + ")" : "");
}

function buildOutText() {
  return [
    "[선거 나이, 다시 생각해 보기] " + S.sid + " " + S.name,
    stanceLine(),
    "",
    "[교과서 사실]",
    chosenFacts().map(factText).join("\n"),
    "",
    "[내 의견]",
    essay()
  ].join("\n");
}

function renderFinal() {
  const box = $("final"); box.innerHTML = "";
  box.appendChild(el("p", "f-head", stanceLine()));
  const fb = el("div", "f-book");
  fb.appendChild(el("div", "book-label", "교과서 사실 · 153쪽"));
  chosenFacts().forEach(f => fb.appendChild(el("p", "", factText(f))));
  box.appendChild(fb);
  box.appendChild(el("p", "f-sub", "내 의견"));
  PARTS.forEach(pt => box.appendChild(el("p", "f-mine", partValue(pt.id))));
  $("submitBtn").disabled = S.submitted;
  $("submitBtn").textContent = S.submitted ? "제출 완료" : "제출";
}

function goWrap() {
  const err = checkParts();
  if (err) { $("s4Err").textContent = err; return; }
  renderFinal(); show("s5");
}

/* AI 분류와 학생이 확정한 값을 비교해 교사가 분류 정확도를 볼 수 있게 한다(학생 화면엔 안 나온다) */
function sameSet(a, b) { return a.length === b.length && a.every(x => b.indexOf(x) >= 0); }

async function submitEssay() {
  if (S.sending || S.submitted) return;
  const err = checkParts();
  if (err) { $("s5Err").textContent = err; return; }
  $("s5Err").textContent = "";
  S.sending = true; $("submitBtn").disabled = true; $("submitBtn").textContent = "보내는 중…";
  const withAi = hasPrior();
  const aiStance = withAi ? S.prior.aiStance : "", aiReasons = withAi ? S.prior.aiReasons : [];
  const stanceChanged = withAi && aiStance !== S.stance, reasonsChanged = withAi && !sameSet(aiReasons, S.reasons);
  const payload = {
    studentId: S.sid, studentName: S.name, gameName: CONFIG.GAME_NAME,
    choiceSummary: stanceLine() + " / 교과서 사실 " + S.facts.length + "개",
    diffSummary: !withAi ? "이전 글 없음" : (stanceChanged || reasonsChanged ? "AI 분류에서 고침" : "AI 분류 그대로"),
    reflection: essay(), // 시트 G열: ①②③ 합본(학생 서술). 입장·사실은 choicesJson
    choicesJson: JSON.stringify({
      sid: S.sid, name: S.name, ban: S.ban,
      hadPrior: withAi, aiStance: aiStance, aiReasons: aiReasons,
      stance: S.stance, reasons: S.reasons, stanceChanged: stanceChanged, reasonsChanged: reasonsChanged,
      facts: S.facts, factText: chosenFacts().map(factText),
      parts: PARTS.reduce((o, pt) => { o[pt.id] = partValue(pt.id); return o; }, {}),
      ts: new Date().toISOString()
    })
  };
  Object.assign(payload, FocusGuard.payload());
  try {
    await postToSheet(payload);
  } catch (e) {
    $("s5Err").textContent = e.locked ? e.message : "저장이 안 됐어. 인터넷을 확인하고 다시 눌러 줘.";
    S.sending = false; $("submitBtn").disabled = false; $("submitBtn").textContent = "제출";
    return;
  }
  S.sending = false; S.submitted = true;
  if (window.DraftGuard) DraftGuard.clear(); // 저장 성공 → 임시저장 삭제
  $("submitBtn").textContent = "제출 완료";
  $("outMsg").textContent = S.preview ? "미리보기라 저장하지 않았어." : "제출했어! 수고했어.";
}

async function copyOut() {
  const text = buildOutText();
  try {
    await navigator.clipboard.writeText(text);
  } catch (e) {
    const ta = el("textarea");
    ta.value = text; ta.setAttribute("data-no-draft", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove();
  }
  $("outMsg").textContent = S.submitted ? "복사했어." : "복사했어. 제출 버튼도 꼭 눌러 줘!";
}

/* ── 부팅 (모든 함수 선언 뒤, 파일 맨 마지막) ── */
function init() {
  const q = new URLSearchParams(location.search);
  S.preview = q.get("preview") === "1";
  let sid = (q.get("sid") || "").trim(), name = (q.get("name") || "").trim();
  if (S.preview) {
    $("previewBar").hidden = false;
    if (!sid) sid = "20512";
    if (!name) name = "미리보기";
  }
  $("sid").value = sid; $("sname").value = name;

  $("frameNote").innerHTML = "";
  FRAME_NOTES.forEach(t => $("frameNote").appendChild(el("p", "", t)));
  buildParts();

  $("startBtn").addEventListener("click", startApp);
  $("retryBtn").addEventListener("click", loadPrior);
  $("freshBtn").addEventListener("click", () => { S.prior = { found: false }; S.priorState = "ok"; initPicks(); renderBefore(); });
  $("s1Next").addEventListener("click", goStance);
  $("s2Back").addEventListener("click", () => show("s1"));
  $("s2Next").addEventListener("click", goFact);
  $("s3Back").addEventListener("click", () => { renderStance(); show("s2"); });
  $("s3Next").addEventListener("click", goWrite);
  $("s4Back").addEventListener("click", () => { renderFacts(); show("s3"); });
  $("s4Next").addEventListener("click", goWrap);
  $("s5Back").addEventListener("click", () => show("s4"));
  $("submitBtn").addEventListener("click", submitEssay);
  $("copyBtn").addEventListener("click", copyOut);
  Glossary.start({ terms: GLOSSARY, skip: ["#steps", ".frame-note"] }); // 어려운 낱말 풀이 (glossary.js)
}

init();
