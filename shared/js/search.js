/* Copyright (c) 2026 geniuskey and SemiBooks contributors. MIT. */
/* 서가 홈 통합 검색: 24권의 장·절·시뮬레이터·용어를 한 번에 찾는다.
   색인은 tools/search-index.mjs가 만든다. search-index.json(제목·핵심어·용어)을 처음 포커스할 때 받고,
   search-text.json(본문)을 이어서 받아 본문 일치까지 찾는다. 찾는 규칙은 search-core.js에 있다. */
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
  const esc = window.SemiSearchCore.esc;

  const { mark, snippet, norm } = window.SemiSearchCore;

  /* ---------------------------------------------------------------- 색인 */
  let engine = null, loading = null, textState = "none";
  const context = (b) => { const book = bySlug.get(b); return book ? [book.title, book.subtitle, book.code, ...(book.topics || [])].join(" ") : b; };
  function load() {
    if (loading) return loading;
    loading = fetch("search-index.json").then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); }).then((index) => {
      engine = window.SemiSearchCore.create(index, { context });
      textState = "loading";
      fetch("search-text.json").then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); }).then((text) => {
        engine.setTexts(text.texts);
        textState = "ready";
        if (input.value.trim()) run();
      }).catch(() => { textState = "failed"; if (input.value.trim()) run(); });
    }).catch((error) => { loading.failed = error; throw error; });
    loading.catch(() => {}).finally(() => { if (input.value.trim() || document.activeElement === input) run(); });
    return loading;
  }
  const keepStages = (stages) => (stages ? (e) => stages.includes(bySlug.get(e.b)?.stage) : null);

  /* ---------------------------------------------------------------- 표시 */
  const link = (e, re) => engine.link(e, re);
  function crumb(e) {
    const book = bySlug.get(e.b), ch = engine.chapters[e.b]?.[e.c];
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
    if (loading?.failed) { panel.innerHTML = '<p class="sr-note">본문 색인을 불러오지 못해 책 이름과 주제로만 찾습니다.</p>'; publish(null); return; }
    if (!engine) { panel.innerHTML = '<p class="sr-note">색인을 불러오는 중…</p>'; publish(null); load(); return; }
    const result = engine.find(raw, keepStages(stagesNow()));
    fixed = result.fixed;
    last = result;
    const counts = new Map();
    for (const h of result.hits) counts.set(h.e.b, (counts.get(h.e.b) || 0) + 1);
    publish(counts);
    render();
  }
  function render() {
    const { hits, re } = last;
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
  input.addEventListener("input", () => { tab = "all"; shown = PAGE; clearTimeout(timer); timer = setTimeout(run, engine ? 70 : 0); });
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
  window.SemiSearch = { search: (q, stages) => (load(), engine ? engine.search(q, keepStages(stages)) : { hits: [], terms: [], vars: [] }), hangul: window.SemiSearchCore.hangul, norm, ready: () => load() };
})();
