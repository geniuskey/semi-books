/* Copyright (c) 2026 geniuskey and SemiBooks contributors. MIT. */
/* SemiBooks series setting for the @euiyun/book UI (book-ui.js):
   - the shelf links in the top bar and the chapter drawer go to the semi.euiyun.com shelf instead of the books.euiyun.com portal
   - the top bar search uses the book's prebuilt index (<book>/search.json, tools/search-index.mjs) and the shelf's search
     engine (search-core.js): terms, body text, simulators and figures, with Korean/English/abbreviation synonyms and chosung
   - every book's drawer gets 찾아보기 (<book>/terms.html), the back-of-book index */
(function () {
  "use strict";
  const script = document.currentScript;
  const site = new URL("../../", script.src).href;
  const NS = (window.EuiyunBook = window.EuiyunBook || {});
  NS.shelf = { href: site + "index.html", label: "반도체 서가", title: "SemiBooks · 반도체 서가", back: "← 반도체 서가로" };
  const slug = script.dataset.book;
  if (!slug) return;
  const book = site + slug + "/";
  const terms = book + "terms.html";
  NS.drawerExtra = [{ href: terms, num: "ㄱ", label: "찾아보기", active: location.pathname.endsWith(`/${slug}/terms.html`) }];

  const TYPE = { c: "장", s: "절", m: "시뮬레이터", g: "용어", f: "그림" };
  const SHOW = 8;
  let engine = null, failed = false;
  const core = () => window.SemiSearchCore;
  function load() {
    const ready = core() ? Promise.resolve() : new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = site + "shared/js/search-core.js";
      s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
    return ready.then(() => fetch(book + "search.json")).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); }).then((index) => {
      engine = core().create(index, { base: site });
      engine.setTexts(index.texts);
    }).catch((error) => { failed = true; throw error; });
  }
  const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const links = (q) => {
    const enc = encodeURIComponent(q);
    return `<a href="${terms}${q ? "?q=" + enc : ""}">찾아보기${q ? `에서 ‘${esc(q)}’` : " (가나다 색인)"} →</a>` +
      (q ? ` · <a href="${site}index.html?q=${enc}">반도체 서가 전체에서 찾기 →</a>` : "");
  };
  function run(query) {
    if (!engine) return { note: failed ? "색인을 불러오지 못했습니다." : "색인을 불러오는 중…", footer: links(query) };
    const { mark, snippet } = core();
    const result = engine.find(query);
    const re = result.re;
    const items = result.hits.slice(0, SHOW).map(({ e }) => {
      const ch = engine.chapters[e.b]?.[e.c];
      const alt = e.t === "g" ? [e.e, e.a].filter(Boolean).map((f) => ` <span style="font-weight:400;color:var(--text-dim)">${mark(f, re)}</span>`).join("") : "";
      const source = e.t === "c" || e.t === "g" ? e.x : e.body || e.k || "";
      return { href: engine.link(e, re), type: TYPE[e.t], title: mark(e.h, re) + alt,
        meta: ch && e.t !== "c" ? `${ch[0]} · ${ch[1]}` : "", text: source ? mark(snippet(source, re, 110), re) : "" };
    });
    const notes = [];
    if (result.fixed) notes.push(`한/영 전환: <b>${esc(result.fixed)}</b>(으)로 찾았습니다.`);
    if (!items.length) notes.push("이 책에서 찾지 못했습니다. 더 짧은 낱말이나 영어·약어로 찾아 보세요.");
    else if (result.hits.length > SHOW) notes.push(`상위 ${SHOW}개 · 모두 ${result.hits.length.toLocaleString("ko-KR")}개`);
    return { items, note: notes.join(" "), footer: links(query) };
  }
  NS.search = {
    placeholder: "이 책 검색 · 용어·본문",
    label: "이 책의 용어, 본문, 챕터, 시뮬레이터, 그림 검색",
    load,
    run,
    idle: () => `<p>용어·본문·시뮬레이터·그림까지 찾습니다. 한글·영어·약어, 초성(ㄱㅍㅊ)도 됩니다. <kbd>/</kbd> 로 바로 검색.</p><div class="bk-sr-foot">${links("")}</div>`,
  };
})();
