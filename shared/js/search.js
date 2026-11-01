/* Copyright (c) 2026 geniuskey and SemiBooks contributors. MIT. */
/* 서가 홈 통합 검색: 24권의 장·절·시뮬레이터·용어를 한 번에 찾는다.
   색인은 tools/search-index.mjs가 만든다. search-index.json(제목·핵심어·용어)을 처음 포커스할 때 받고,
   search-text.json(본문)을 이어서 받아 본문 일치까지 찾는다.
   - 한·영·약어 동의어: 용어집의 ko/en/abbr을 서로 바꿔 찾는다(공핍층 ↔ depletion region)
   - 띄어쓰기·대소문자·기호 무시, 초성 검색(ㄱㅍㅊ), 끝 조사 떼기(공핍층의 → 공핍층)
   - 한/영 전환을 잊고 친 영문(rhdvlqcmd → 공핍층) 자동 교정
   - "따옴표"는 붙여 찾기, -단어는 제외. 본문 일치는 그 문장으로 바로 이동(text fragment) */
(function () {
  "use strict";
  const input = document.getElementById("book-search");
  const panel = document.getElementById("search-results");
  const filters = document.getElementById("filters");
  if (!input || !panel) return;
  const books = window.SEMI_BOOKS || [];
  const bySlug = new Map(books.map((b) => [b.slug, b]));
  const TYPE = { c: "장", s: "절", m: "시뮬레이터", g: "용어" };
  const TABS = [["all", "전체", "csmg"], ["text", "장·절", "cs"], ["m", "시뮬레이터", "m"], ["g", "용어", "g"]];
  const EXAMPLES = ["FinFET", "공핍층", "EUV 확률적 결함", "HBM TSV", "디싱", "PLL 위상 잡음", "ㅅㅎㅁ", "SiC MOSFET", "웨이퍼 맵"];
  const SIM_TAG = { ANIMATION: "애니메이션", CHALLENGE: "도전", PREDICT: "예측", GAME: "게임", "QUIZ GAME": "게임", MISSION: "미션", SANDBOX: "실험실", WORKBENCH: "실험실", "CROSS-SECTION": "단면", MAP: "지도" };
  const PAGE = 30;
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---------------------------------------------------------------- 정규화 */
  const PUNCT = /[\s·・•\-‐‑–—_/\\.,:;()[\]{}'"“”‘’!?~`|<>+=*^]+/g;
  const norm = (s) => String(s || "").normalize("NFKC").toLocaleLowerCase("ko").replace(PUNCT, "");
  const CHO = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
  const chosung = (s) => s.replace(/[가-힣]/g, (c) => CHO[Math.floor((c.charCodeAt(0) - 0xac00) / 588)]);
  const PARTICLE = /(으로서|으로|에서|에게|까지|부터|이란|이라|처럼|보다|하고|이며|란|은|는|이|가|을|를|의|에|로|와|과|도|만)$/;

  /* 두벌식 자판: 한/영 전환을 잊고 친 영문을 한글로 바꾼다 */
  const KEY = { q: "ㅂ", w: "ㅈ", e: "ㄷ", r: "ㄱ", t: "ㅅ", y: "ㅛ", u: "ㅕ", i: "ㅑ", o: "ㅐ", p: "ㅔ", a: "ㅁ", s: "ㄴ", d: "ㅇ", f: "ㄹ", g: "ㅎ", h: "ㅗ", j: "ㅓ", k: "ㅏ", l: "ㅣ",
    z: "ㅋ", x: "ㅌ", c: "ㅊ", v: "ㅍ", b: "ㅠ", n: "ㅜ", m: "ㅡ", Q: "ㅃ", W: "ㅉ", E: "ㄸ", R: "ㄲ", T: "ㅆ", O: "ㅒ", P: "ㅖ" };
  const JUNG = "ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ";
  const JONG = ["", "ㄱ", "ㄲ", "ㄳ", "ㄴ", "ㄵ", "ㄶ", "ㄷ", "ㄹ", "ㄺ", "ㄻ", "ㄼ", "ㄽ", "ㄾ", "ㄿ", "ㅀ", "ㅁ", "ㅂ", "ㅄ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
  const VV = { "ㅗㅏ": "ㅘ", "ㅗㅐ": "ㅙ", "ㅗㅣ": "ㅚ", "ㅜㅓ": "ㅝ", "ㅜㅔ": "ㅞ", "ㅜㅣ": "ㅟ", "ㅡㅣ": "ㅢ" };
  const CC = { "ㄱㅅ": "ㄳ", "ㄴㅈ": "ㄵ", "ㄴㅎ": "ㄶ", "ㄹㄱ": "ㄺ", "ㄹㅁ": "ㄻ", "ㄹㅂ": "ㄼ", "ㄹㅅ": "ㄽ", "ㄹㅌ": "ㄾ", "ㄹㅍ": "ㄿ", "ㄹㅎ": "ㅀ", "ㅂㅅ": "ㅄ" };
  const SPLIT = Object.fromEntries(Object.entries(CC).map(([pair, jong]) => [jong, [...pair]]));
  function hangul(latin) {
    let out = "", cho = "", jung = "", jong = "";
    const flush = () => {
      out += cho && jung ? String.fromCharCode(0xac00 + (CHO.indexOf(cho) * 21 + JUNG.indexOf(jung)) * 28 + JONG.indexOf(jong)) : cho + jung + jong;
      cho = jung = jong = "";
    };
    for (const ch of latin) {
      const j = KEY[ch] || KEY[ch.toLowerCase()];
      if (!j) { flush(); out += ch; continue; }
      if (!JUNG.includes(j)) {
        if (cho && jung && !jong && JONG.includes(j)) { jong = j; continue; }
        if (cho && jung && jong && CC[jong + j]) { jong = CC[jong + j]; continue; }
        if (cho || jung) flush();
        cho = j;
      } else {
        if (jung && !jong && VV[jung + j]) { jung = VV[jung + j]; continue; }
        if (jong) {
          const [keep, move] = SPLIT[jong] || ["", jong];
          jong = keep; flush(); cho = move; jung = j; continue;
        }
        if (cho && !jung) { jung = j; continue; }
        flush(); jung = j;
      }
    }
    flush();
    return out;
  }

  /* ---------------------------------------------------------------- 색인 */
  let entries = null, chapters = {}, alias = new Map(), loading = null, textState = "none";
  const context = (b) => { const book = bySlug.get(b); return book ? [book.title, book.subtitle, book.code, ...(book.topics || [])].join(" ") : b; };
  function prepare(index) {
    chapters = Object.fromEntries(index.books.map((b) => [b.slug, b.chapters]));
    entries = index.entries.map((e, n) => {
      const heads = [e.h, e.e, e.a].filter(Boolean).map(norm);
      const ch = chapters[e.b]?.[e.c];
      return { ...e, n, heads, cho: chosung(heads[0] || ""), K: norm(e.k), X: norm(e.x), C: norm(context(e.b) + (ch ? ch[1] : "")), T: "" };
    });
    // 용어집 동의어: 어느 표기로 쳐도 나머지 표기까지 함께 찾는다.
    for (const e of entries) {
      if (e.t !== "g") continue;
      const forms = [e.h, e.e, e.a].filter(Boolean);
      for (const f of forms) {
        const key = norm(f);
        if (key.length < 2) continue;
        const set = alias.get(key) || new Set();
        // 한두 글자 영문 약어(W, PM)는 아무 데나 걸리므로 동의어로 쓰지 않는다.
        forms.forEach((g) => { const n = norm(g); if (n !== key && !(n.length <= 2 && /^[a-z0-9]+$/.test(n)) && n.length >= 2) set.add(g); });
        alias.set(key, set);
      }
    }
  }
  function load() {
    if (loading) return loading;
    loading = fetch("search-index.json").then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); }).then((index) => {
      prepare(index);
      textState = "loading";
      fetch("search-text.json").then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); }).then((text) => {
        if (text.n !== entries.length) throw new Error("search-text.json does not match search-index.json");
        text.texts.forEach((t, i) => { if (t) { entries[i].body = t; entries[i].T = norm(t); } });
        textState = "ready";
        if (input.value.trim()) run();
      }).catch(() => { textState = "failed"; if (input.value.trim()) run(); });
    }).catch((error) => { entries = []; loading.failed = error; throw error; });
    loading.catch(() => {}).finally(() => { if (input.value.trim() || document.activeElement === input) run(); });
    return loading;
  }

  /* ---------------------------------------------------------------- 질의 */
  function parse(raw) {
    const terms = [], exclude = [];
    raw.replace(/(-?)"([^"]+)"|(-?)(\S+)/g, (_, neg1, phrase, neg2, word) => {
      const text = phrase ?? word, neg = neg1 || neg2;
      if (!norm(text)) return "";
      (neg ? exclude : terms).push(text);
      return "";
    });
    return { terms, exclude };
  }
  // 한 검색어의 대안: 원문 1, 용어집 동의어 .85, 조사를 뗀 형태 .7, 초성
  function variants(text) {
    // NFKC는 ㄱ(호환 자모)을 다른 코드로 바꾸므로 초성은 정규화 전에 본다.
    const bare = text.replace(/\s+/g, "");
    if (/^[ㄱ-ㅎ]{2,}$/.test(bare)) return [{ q: bare, w: 1, cho: true, raw: text }];
    const q = norm(text), list = [{ q, w: 1, raw: text }];
    for (const form of alias.get(q) || []) list.push({ q: norm(form), w: 0.85, raw: form });
    const stem = /^[가-힣]{3,}$/.test(q) && q.replace(PARTICLE, "");
    if (stem && stem !== q && stem.length >= 2) list.push({ q: stem, w: 0.7, raw: stem, stem: true });
    return list;
  }
  function scoreOne(e, v) {
    const q = v.q;
    if (v.cho) return e.cho.includes(q) ? (e.cho.startsWith(q) ? 70 : 50) : e.K && chosung(e.K).includes(q) ? 12 : 0;
    // 한 글자 영문·숫자(c, 3)는 거의 모든 글에 들어 있으므로 제목이 정확히 같을 때만 친다.
    if (q.length === 1 && /[a-z0-9]/.test(q)) return e.heads.includes(q) ? 100 * v.w : 0;
    let best = 0;
    for (const h of e.heads) {
      if (h === q) return 100 * v.w;
      best = Math.max(best, h.startsWith(q) ? 72 : h.includes(q) ? 52 : 0);
    }
    if (!best && e.K.includes(q)) best = 30;
    if (!best && e.X.includes(q)) best = 20;
    if (!best && e.T && e.T.includes(q)) best = 14;
    if (!best && e.C.includes(q)) best = 5;
    return best * v.w;
  }
  const BONUS = { c: 9, s: 5, m: 4, g: 5 };
  function search(query, stages) {
    const { terms, exclude } = parse(query);
    if (!terms.length || !entries) return { hits: [], terms, vars: [] };
    let vars = terms.map(variants);
    // 조사를 뗀 형태는 원래 형태가 어디에도 없을 때만 쓴다.
    vars = vars.map((list) => (list.length > 1 && list.some((v) => v.stem) && entries.some((e) => scoreOne(e, list[0]) > 5) ? list.filter((v) => !v.stem) : list));
    const ex = exclude.map(norm), phrase = terms.length > 1 ? norm(terms.join("")) : "";
    const hits = [];
    for (const e of entries) {
      if (stages && !stages.includes(bySlug.get(e.b)?.stage)) continue;
      let total = 0, strong = false, inHead = 0;
      for (const list of vars) {
        let s = 0;
        for (const v of list) s = Math.max(s, scoreOne(e, v));
        if (!s) { total = 0; break; }
        if (s > 5) strong = true;
        if (s >= 50) inHead++;
        total += s;
      }
      if (!total || !strong) continue;
      if (ex.length && ex.some((q) => e.heads.some((h) => h.includes(q)) || e.K.includes(q) || e.X.includes(q) || e.T.includes(q))) continue;
      // 여러 낱말을 친 그대로 붙어 있으면(위상 잡음) 흩어져 걸린 것보다 위로 올린다.
      if (phrase) {
        if (e.heads.some((h) => h.includes(phrase))) total += 60;
        else if (e.K.includes(phrase) || e.X.includes(phrase) || e.T.includes(phrase)) total += 40;
        else total *= 0.6;
      }
      total += BONUS[e.t] + (inHead === vars.length ? 25 : 0) - Math.min(12, (e.heads[0] || "").length * 0.15);
      hits.push({ e, s: total });
    }
    hits.sort((a, b) => b.s - a.s || a.e.n - b.e.n);
    return { hits, terms, vars };
  }

  /* ---------------------------------------------------------------- 표시 */
  // 정규화 전 원문에서 찾도록 글자 사이에 공백·기호가 끼어도 맞는 정규식을 만든다.
  function matcher(vars) {
    const parts = vars.flat().filter((v) => !v.cho && v.q).map((v) => [...v.q].map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("[\\s·\\-–—_/.,]*"));
    return parts.length ? new RegExp(parts.sort((a, b) => b.length - a.length).join("|"), "gi") : null;
  }
  function mark(text, re) {
    text = String(text || "");
    if (!re) return esc(text);
    let out = "", last = 0;
    for (const m of text.matchAll(re)) { if (!m[0]) continue; out += esc(text.slice(last, m.index)) + "<mark>" + esc(m[0]) + "</mark>"; last = m.index + m[0].length; }
    return out + esc(text.slice(last));
  }
  function snippet(text, re, size = 150) {
    text = String(text || "");
    if (!re) return text.slice(0, size);
    re.lastIndex = 0;
    const m = re.exec(text);
    re.lastIndex = 0;
    if (!m || m.index < 40) return text.length > size ? text.slice(0, size) + "…" : text;
    const start = text.lastIndexOf(" ", m.index - 30) + 1;
    return "…" + text.slice(start, start + size) + (start + size < text.length ? "…" : "");
  }
  // 본문 일치는 그 낱말로 바로 스크롤하도록 text fragment를 붙인다. 못 찾으면 브라우저가 #id로 간다.
  function fragment(text, re) {
    if (!re || !text) return "";
    re.lastIndex = 0;
    const m = re.exec(text);
    re.lastIndex = 0;
    if (!m) return "";
    // 같은 낱말이 장 머리말에 먼저 나올 수 있으므로 앞뒤 낱말을 문맥(prefix-, -suffix)으로 붙인다.
    const words = text.split(" "), at = text.slice(0, m.index).split(" ").length - 1;
    const clean = (w) => (w || "").replace(/^[("'“‘[]+|[)"'”’\],.;:!?…]+$/g, "");
    const ok = (w) => w && w.length <= 40 && !/[−₀-₉⁰-⁹^\\…]/.test(w);
    const word = clean(words[at]), before = clean(words[at - 1]), after = clean(words[at + 1]);
    if (!ok(word)) return "";
    const enc = (w) => encodeURIComponent(w).replace(/-/g, "%2D");
    return ":~:text=" + (ok(before) ? enc(before) + "-," : "") + enc(word) + (ok(after) ? ",-" + enc(after) : "");
  }
  function link(e, re) {
    let url = `${e.b}/chapters/${e.c}.html`, hash = e.i || "";
    let directive = "";
    if ((e.t === "s" || e.t === "m") && re) {
      re.lastIndex = 0;
      const inTitle = re.test(e.h);
      re.lastIndex = 0;
      if (!inTitle) directive = fragment(e.body || e.k, re);
    }
    if (e.t === "g") {
      // 용어가 실제로 쓰인 절을 찾아 그 문장으로 보낸다.
      const termRe = new RegExp(e.h.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
      const where = entries.find((s) => s.t === "s" && s.b === e.b && s.c === e.c && s.body && termRe.test(s.body));
      if (where) { hash = where.i; directive = fragment(where.body, termRe); }
    }
    return url + (hash || directive ? "#" + hash + directive : "");
  }
  function crumb(e) {
    const book = bySlug.get(e.b), ch = chapters[e.b]?.[e.c];
    return `${esc(book ? book.title : e.b)}${ch ? ` · ${esc(ch[0])} ${esc(ch[1])}` : ""}`;
  }
  function row(hit, re) {
    const e = hit.e, book = bySlug.get(e.b) || {};
    const title = e.t === "g" ? mark(e.h, re) + [e.e, e.a].filter(Boolean).map((f) => ` <span class="sr-alt">${mark(f, re)}</span>`).join("") : mark(e.h, re);
    const source = e.t === "c" ? e.x : e.t === "g" ? e.x : (e.body || e.k || "");
    const tag = e.t === "m" ? SIM_TAG[e.g] || TYPE.m : TYPE[e.t];
    return `<li><a class="sr-item" href="${esc(link(e, re))}" style="--c:${esc(book.color || "#8db8ea")};--cd:${esc(book.colorDark || book.color || "#8db8ea")}">
      <span class="sr-code" aria-hidden="true">${esc(book.code || "")}</span>
      <span class="sr-main"><span class="sr-title"><span class="sr-type sr-${e.t}">${esc(tag)}</span>${title}</span>
      <span class="sr-crumb">${crumb(e)}</span>${source ? `<span class="sr-text">${mark(snippet(source, re), re)}</span>` : ""}</span></a>${hit.more.length ? `<span class="sr-also">다른 책에도 ${hit.more.map((m) => { const b = bySlug.get(m.b) || {}; return `<a href="${esc(link(m, re))}" title="${crumb(m)}" style="--cd:${esc(b.colorDark || b.color || "#8db8ea")}">${esc(b.code || m.b)}</a>`; }).join("")}</span>` : ""}</li>`;
  }

  let tab = "all", shown = PAGE, last = null, fixed = null;
  function stagesNow() { const s = filters?.dataset.stages; return s ? s.split(",") : null; }
  function publish(counts) { window.SEMI_SEARCH_HITS = counts; document.dispatchEvent(new CustomEvent("semi:search")); }
  function idle() {
    let recent = [];
    try { recent = JSON.parse(localStorage.getItem("semi-search-recent") || "[]"); } catch (e) {}
    const chips = (list, cls) => list.map((q) => `<button type="button" class="sr-chip${cls}" data-q="${esc(q)}">${esc(q)}</button>`).join("");
    panel.innerHTML = `<div class="sr-idle">${recent.length ? `<span class="sr-label">최근</span>${chips(recent, " recent")}` : ""}<span class="sr-label">예시</span>${chips(EXAMPLES, "")}
      <span class="sr-tip">한글·영어·약어 어느 쪽이든, 초성(ㄱㅍㅊ)도 됩니다<span class="sr-keys"> · <kbd>/</kbd> 로 바로 검색 · <kbd>↓</kbd> <kbd>Enter</kbd> 로 이동</span></span></div>`;
    panel.hidden = false;
  }
  function run() {
    const raw = input.value.trim();
    syncUrl(raw);
    if (!raw) { publish(null); if (document.activeElement === input) idle(); else panel.hidden = true; return; }
    panel.hidden = false;
    if (!entries) { panel.innerHTML = '<p class="sr-note">색인을 불러오는 중…</p>'; publish(null); load(); return; }
    if (loading?.failed) { panel.innerHTML = '<p class="sr-note">본문 색인을 불러오지 못해 책 이름과 주제로만 찾습니다.</p>'; publish(null); return; }
    const stages = stagesNow();
    let result = search(raw, stages);
    fixed = null;
    // 한/영 전환 실수: 영문만으로 친 검색어가 거의 안 걸리면 두벌식으로 바꿔 다시 찾는다.
    if (result.hits.length < 3 && /^[a-zA-Z\s"-]+$/.test(raw)) {
      const ko = hangul(raw);
      if (/[가-힣]/.test(ko)) { const alt = search(ko, stages); if (alt.hits.length > result.hits.length) { result = alt; fixed = ko; } }
    }
    last = result;
    const counts = new Map();
    for (const h of result.hits) counts.set(h.e.b, (counts.get(h.e.b) || 0) + 1);
    publish(counts);
    render();
  }
  function render() {
    const { hits, vars } = last, re = matcher(vars);
    // 여러 책에 같은 용어가 있으면 한 줄로 묶고 나머지 책은 옆에 링크로 단다.
    const rows = [], same = new Map();
    for (const h of hits) {
      const key = h.e.t === "g" && norm(h.e.h);
      if (key && same.has(key)) { same.get(key).more.push(h.e); continue; }
      const item = { ...h, more: [] };
      if (key) same.set(key, item);
      rows.push(item);
    }
    const types = TABS.find((t) => t[0] === tab)[2];
    const list = rows.filter((h) => types.includes(h.e.t));
    const n = (t) => rows.filter((h) => t.includes(h.e.t)).length;
    const status = textState === "loading" ? '<span class="sr-loading">본문 색인 불러오는 중…</span>' : textState === "failed" ? '<span class="sr-loading">제목·용어에서만 찾았습니다</span>' : "";
    const fix = fixed ? `<p class="sr-note">한/영 전환: <b>${esc(fixed)}</b>(으)로 찾았습니다. <button type="button" class="sr-link" data-q="${esc(fixed)}">이 검색어로 바꾸기</button></p>` : "";
    panel.innerHTML = `${fix}<div class="sr-head"><div class="sr-tabs" role="tablist" aria-label="결과 종류">${TABS.map(([id, label, t]) => `<button type="button" role="tab" data-tab="${id}" aria-selected="${tab === id}">${label}<span>${n(t).toLocaleString("ko-KR")}</span></button>`).join("")}</div>${status}</div>
      ${list.length ? `<ol class="sr-list">${list.slice(0, shown).map((h) => row(h, re)).join("")}</ol>` : `<p class="sr-note">${hits.length ? "이 종류에는 결과가 없습니다." : "본문에서도 찾지 못했습니다. 더 짧은 낱말이나 영어·약어로 찾아 보세요."}</p>`}
      ${list.length > shown ? `<button type="button" class="sr-more">결과 더 보기 <span>${(list.length - shown).toLocaleString("ko-KR")}개 남음</span></button>` : ""}`;
  }

  /* ---------------------------------------------------------------- 상호작용 */
  let timer = 0, urlTimer = 0;
  function syncUrl(q) {
    clearTimeout(urlTimer);
    urlTimer = setTimeout(() => {
      const url = new URL(location.href);
      if (q) url.searchParams.set("q", q); else url.searchParams.delete("q");
      if (url.href !== location.href) history.replaceState(history.state, "", url);
    }, 400);
  }
  function remember(q) {
    q = q.trim();
    if (!q) return;
    try {
      const list = JSON.parse(localStorage.getItem("semi-search-recent") || "[]").filter((x) => x !== q);
      localStorage.setItem("semi-search-recent", JSON.stringify([q, ...list].slice(0, 6)));
    } catch (e) {}
  }
  function setQuery(q) { input.value = q; tab = "all"; shown = PAGE; run(); input.focus(); }
  input.addEventListener("focus", () => { load(); if (!input.value.trim()) idle(); });
  input.addEventListener("input", () => { tab = "all"; shown = PAGE; clearTimeout(timer); timer = setTimeout(run, entries ? 70 : 0); });
  input.addEventListener("keydown", (event) => {
    if (event.isComposing) return;
    if (event.key === "Escape") { input.value = ""; run(); panel.hidden = true; }
    if (event.key === "ArrowDown") { const first = panel.querySelector(".sr-item, .sr-chip"); if (first) { event.preventDefault(); first.focus(); } }
    if (event.key === "Enter") { const first = panel.querySelector(".sr-item"); if (first) { event.preventDefault(); remember(input.value); location.href = first.href; } }
  });
  panel.addEventListener("click", (event) => {
    const t = event.target.closest("[data-tab]"), q = event.target.closest("[data-q]"), item = event.target.closest(".sr-item");
    if (t) { tab = t.dataset.tab; shown = PAGE; render(); panel.querySelector(`[data-tab="${tab}"]`)?.focus(); }
    else if (q) setQuery(q.dataset.q);
    else if (event.target.closest(".sr-more")) { shown += PAGE * 2; render(); }
    else if (item) remember(input.value);
  });
  panel.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp" && event.key !== "Escape") return;
    const items = [...panel.querySelectorAll(".sr-item, .sr-chip")], i = items.indexOf(document.activeElement);
    if (i < 0) return;
    event.preventDefault();
    if (event.key === "Escape" || (event.key === "ArrowUp" && i === 0)) { input.focus(); return; }
    items[Math.min(items.length - 1, Math.max(0, i + (event.key === "ArrowDown" ? 1 : -1)))].focus();
  });
  document.addEventListener("click", (event) => { if (!input.value.trim() && !panel.contains(event.target) && event.target !== input) panel.hidden = true; });
  filters?.addEventListener("click", (event) => { if (event.target.closest("button[data-filter]") && input.value.trim()) { shown = PAGE; run(); } });
  document.addEventListener("keydown", (event) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
    if ((event.key === "/" && !typing) || (event.key === "k" && (event.metaKey || event.ctrlKey))) {
      event.preventDefault();
      input.focus(); input.select();
      input.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  });
  const initial = new URLSearchParams(location.search).get("q");
  if (initial) { input.value = initial; load(); run(); }
  window.SemiSearch = { search: (q, stages) => (load(), search(q, stages)), hangul, norm, ready: () => load() };
})();
