/* Copyright (c) 2026 geniuskey. MIT. */
/* @euiyun/book standard book UI: top bar, chapter drawer, previous/next pager and footer.
   Top bar: [menu] [logo · name · subtitle]  [search]  [book actions] [shelf] [feedback] [theme]
   A book calls EuiyunBook.topbar/drawer/pager/footer from its own layout code; a series sets EuiyunBook.shelf once.
   Styles: runtime/ui.css. It uses the book's --bg, --bg-elev, --surface, --text*, --border, --accent*, --mono,
   --radius and --maxw variables. */
(function () {
  "use strict";
  const NS = (window.EuiyunBook = window.EuiyunBook || {});
  const svg = (paths, size) => `<svg width="${size || 18}" height="${size || 18}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
  const ICONS = {
    menu: svg('<path d="M4 6h16M4 12h16M4 18h16"/>'),
    shelf: svg('<path d="M4 5.5h6v14H4zM10 5.5h6v14h-6zM17 7l3-1 2 13-3 1z"/>'),
    feedback: svg('<path d="M5 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-6 4V6a2 2 0 0 1 2-2z"/><path d="M8 9h8M8 13h5"/>'),
    moon: svg('<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>'),
    sun: svg('<circle cx="12" cy="12" r="4.5"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
    search: '<svg class="bk-search-icon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></svg>',
  };
  NS.icons = ICONS;
  // Standalone books link to the portal. A series (e.g. semi.euiyun.com) overrides this with its own shelf.
  // label: top bar button · title: tooltip · back: link at the bottom of the drawer.
  const DEFAULT_SHELF = { href: "https://books.euiyun.com/", label: "전체 책", title: "전체 책 보기", back: "← 전체 책 보기" };
  const shelfOf = (own) => Object.assign({}, DEFAULT_SHELF, NS.shelf, own);
  const feedbackUrl = (book) => `https://books.euiyun.com/feedback.html?book=${encodeURIComponent(book)}&page=${encodeURIComponent(location.href)}`;
  // The reader may have moved to another section since the page loaded, so the page URL is taken at click time.
  function feedbackLink(node, book) {
    Object.assign(node, { href: feedbackUrl(book), target: "_blank", rel: "noopener" });
    node.addEventListener("click", () => { node.href = feedbackUrl(book); });
    return node;
  }
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  function el(tag, cls, attrs) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    Object.entries(attrs || {}).forEach(([k, v]) => { if (v != null && v !== false) node.setAttribute(k, v === true ? "" : v); });
    return node;
  }

  /* action: { id, href, icon, label, title, html, toggle, pressed, mobile, className }
     - label shows next to the icon on wide screens; title is the tooltip and accessible name.
     - mobile: true keeps the button on phones (use for at most one action). */
  function actionButton(a) {
    const node = el(a.href ? "a" : "button", "bk-btn bk-action" + (a.mobile ? " bk-keep" : "") + (a.className ? " " + a.className : ""), {
      id: a.id, href: a.href, type: a.href ? null : "button", title: a.title || a.label,
      "aria-label": a.html ? null : a.title || a.label, "aria-pressed": a.toggle ? String(!!a.pressed) : null,
    });
    node.innerHTML = a.html || (a.icon || "") + (a.label ? `<span class="bk-label">${esc(a.label)}</span>` : "");
    if (a.label && !a.html) node.classList.add("has-label");
    else if (!a.html) node.classList.add("icon");
    return node;
  }

  function topbar(o) {
    const body = document.body;
    const shelf = shelfOf(o.shelf);
    const bar = el("header", "bk-topbar");

    const left = el("div", "bk-nav-left");
    const menu = el("button", "bk-btn icon", { id: "bk-menu", type: "button", "aria-label": "챕터 목록" });
    menu.innerHTML = ICONS.menu;
    const logo = el("a", "bk-logo", { href: o.home });
    logo.innerHTML = `${o.logo || ""}<span>${esc(o.name)}${o.subtitle ? ` <small>${esc(o.subtitle)}</small>` : ""}</span>`;
    left.append(menu, logo);

    const search = el("div", "bk-search");
    search.innerHTML = ICONS.search + '<input type="search" aria-label="이 책의 챕터, 섹션, 시뮬레이터, 그림 검색" placeholder="이 책 검색" autocomplete="off"><div class="bk-search-results" aria-live="polite"></div>';

    const right = el("div", "bk-nav-right");
    (o.actions || []).filter(Boolean).forEach((a) => right.append(actionButton(a)));
    const shelfLink = el("a", "bk-btn bk-shelf", { href: shelf.href, title: shelf.title, "aria-label": shelf.title });
    shelfLink.innerHTML = ICONS.shelf + `<span class="bk-label">${esc(shelf.label)}</span>`;
    const feedback = feedbackLink(el("a", "bk-btn icon bk-feedback", { title: "독자 의견 보내기", "aria-label": "독자 의견 보내기" }), o.feedback);
    feedback.innerHTML = ICONS.feedback;
    const theme = el("button", "bk-btn icon", { id: "bk-theme", type: "button", "aria-label": "테마 전환" });
    right.append(shelfLink, feedback, theme);

    const progress = el("div", "bk-progress");
    bar.append(left, search, right, progress);
    body.prepend(bar);

    menu.addEventListener("click", o.onMenu || (() => setDrawer(true)));
    if (o.theme) {
      const setIcon = () => { theme.innerHTML = o.theme.isDark() ? ICONS.sun : ICONS.moon; };
      setIcon();
      theme.addEventListener("click", () => { o.theme.set(o.theme.isDark() ? "light" : "dark"); setIcon(); });
    }
    const onScroll = () => { const h = document.documentElement.scrollHeight - innerHeight; progress.style.width = (h > 0 ? (scrollY / h) * 100 : 0) + "%"; };
    addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    wireSearch(search, o.chapters || [], o.chapterHref);
    anchorChapter();
    return { bar, menu, theme, search };
  }

  /* Search chapter metadata immediately; fetch section, simulator and figure titles on first use. */
  function wireSearch(search, chapters, href) {
    const input = search.querySelector("input");
    const results = search.querySelector(".bk-search-results");
    const close = () => { search.classList.remove("open"); results.replaceChildren(); };
    let details = [];
    let loaded = false;
    let pending;
    function load() {
      if (pending) return pending;
      pending = Promise.all(chapters.map(async (chapter) => {
        try {
          const response = await fetch(href(chapter.slug));
          if (!response.ok) return [];
          const doc = new DOMParser().parseFromString(await response.text(), "text/html");
          const main = doc.querySelector("main.chapter");
          if (!main) return [];
          // Pre-rendered math goes back to its TeX source so queries can match it.
          main.querySelectorAll(".katex").forEach((k) => k.replaceWith(k.querySelector("annotation")?.textContent || k.textContent));
          const entries = [];
          [...main.querySelectorAll("section > h2")].forEach((heading, i) => {
            entries.push({ type: "섹션", title: heading.textContent.trim(), chapter, hash: heading.parentElement.id || `s${i + 1}` });
          });
          [...main.querySelectorAll(".sim")].filter((sim) => sim.querySelector(".sim-head h3")).forEach((sim, i) => {
            entries.push({ type: "시뮬레이터", title: sim.querySelector(".sim-head h3").textContent.trim(), chapter, hash: sim.id || `search-sim-${i + 1}` });
          });
          [...main.querySelectorAll("figure")].filter((figure) => figure.querySelector("figcaption")).forEach((figure, i) => {
            const caption = figure.querySelector("figcaption").textContent.replace(/\s+/g, " ").trim();
            entries.push({ type: "그림", title: caption.slice(0, 140), chapter, hash: figure.id || `search-fig-${i + 1}` });
          });
          return entries;
        } catch (error) { return []; }
      })).then((parts) => { details = parts.flat(); loaded = true; render(); });
      return pending;
    }
    function note(text) { const p = document.createElement("p"); p.textContent = text; results.appendChild(p); }
    function render() {
      const words = input.value.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
      results.replaceChildren();
      if (!words.length) { close(); return; }
      const has = (value) => words.every((word) => value.toLocaleLowerCase().includes(word));
      const chapterHits = chapters.filter((c) => has([c.num, c.title, c.desc, ...(c.tags || [])].join(" ")))
        .map((c) => ({ type: "챕터", title: c.title, chapter: c, hash: "" }));
      const detailHits = details.filter((entry) => has(entry.title));
      const shown = [
        ...chapterHits.slice(0, 4),
        ...detailHits.filter((e) => e.type === "섹션").slice(0, 5),
        ...detailHits.filter((e) => e.type === "시뮬레이터").slice(0, 4),
        ...detailHits.filter((e) => e.type === "그림").slice(0, 4),
      ];
      shown.forEach((entry) => {
        const link = document.createElement("a");
        link.href = href(entry.chapter.slug) + (entry.hash ? `#${entry.hash}` : "");
        const title = document.createElement("strong");
        title.textContent = entry.title;
        const context = document.createElement("small");
        context.textContent = `${entry.chapter.num} · ${entry.chapter.title} · ${entry.type}`;
        link.append(title, context);
        results.appendChild(link);
      });
      if (chapterHits.length + detailHits.length > shown.length) note(`상위 ${shown.length}개 표시 · 검색어를 더 구체적으로 입력해 보세요`);
      if (pending && !loaded) note("섹션·시뮬레이터·그림 목록을 불러오는 중…");
      else if (!shown.length) note("검색 결과가 없습니다");
      search.classList.add("open");
    }
    input.addEventListener("input", () => { if (input.value.trim()) load(); render(); });
    input.addEventListener("keydown", (e) => {
      const first = results.querySelector("a");
      if (e.key === "Escape") { close(); input.blur(); }
      else if (e.key === "ArrowDown" && first) { e.preventDefault(); first.focus(); }
      else if (e.key === "Enter" && first) { e.preventDefault(); first.click(); }
    });
    results.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { close(); input.focus(); }
      else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        const links = [...results.querySelectorAll("a")];
        const next = links.indexOf(document.activeElement) + (e.key === "ArrowDown" ? 1 : -1);
        e.preventDefault();
        (links[next] || input).focus();
      }
    });
    document.addEventListener("pointerdown", (e) => { if (!search.contains(e.target)) close(); });
  }

  /* Give search results stable anchors on a chapter page, then honour a search hash once the book has laid out. */
  function anchorChapter() {
    const main = document.querySelector("main.chapter");
    if (!main) return;
    [...main.querySelectorAll(".sim")].filter((sim) => sim.querySelector(".sim-head h3")).forEach((sim, i) => { if (!sim.id) sim.id = `search-sim-${i + 1}`; });
    [...main.querySelectorAll("figure")].filter((figure) => figure.querySelector("figcaption")).forEach((figure, i) => { if (!figure.id) figure.id = `search-fig-${i + 1}`; });
    if (/^#(?:s\d+|search-(?:sim|fig)-)/.test(location.hash)) {
      requestAnimationFrame(() => document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView());
    }
  }

  /* Chapter drawer: home, optional extra entries (e.g. a simulator gallery), chapters grouped by `part` when
     chapters have one, and the shelf link that the phone top bar hides.
     { home, homeLabel, chapters, chapterHref, current, extra: [{ href, num, label, active }] } — labels are trusted HTML. */
  const setDrawer = (open) => document.body.classList.toggle("drawer-open", open);
  function drawer(o) {
    const shelf = shelfOf(o.shelf);
    const chapters = o.chapters || [];
    const extra = o.extra || [];
    const item = (href, num, label, active) =>
      `<li><a href="${href}"${active ? ' class="active" aria-current="page"' : ""}><span class="num">${num}</span><span>${label}</span></a></li>`;
    const onHome = !o.current && !extra.some((x) => x.active);
    const list = [item(o.home, "00", o.homeLabel || "홈 · 로드맵", onHome), ...extra.map((x) => item(x.href, x.num || "", x.label, x.active))];
    chapters.forEach((c, i) => {
      if (c.part && (i === 0 || chapters[i - 1].part !== c.part)) list.push(`<li class="bk-part">${c.part}</li>`);
      list.push(item(o.chapterHref(c.slug), c.num, c.title, c.slug === o.current));
    });
    const nav = el("nav", "bk-drawer", { "aria-label": "챕터 목록" });
    nav.innerHTML = `<h4>Chapters</h4><ul class="bk-chlist">${list.join("")}</ul>`;
    const back = el("a", "bk-drawer-shelf", { href: shelf.href });
    back.textContent = shelf.back;
    nav.append(back);
    const backdrop = el("div", "bk-drawer-backdrop");
    document.body.append(backdrop, nav);
    backdrop.addEventListener("click", () => setDrawer(false));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") setDrawer(false); });
    return { drawer: nav, open: () => setDrawer(true), close: () => setDrawer(false) };
  }

  /* Previous/next chapter links, placed after `after` (the chapter layout). The first chapter points back home. */
  function pager(o) {
    const chapters = o.chapters || [];
    const i = chapters.findIndex((c) => c.slug === o.current);
    if (i < 0) return null;
    const prev = chapters[i - 1];
    const next = chapters[i + 1];
    const nav = el("nav", "bk-pager", { "aria-label": "이전·다음 챕터" });
    nav.innerHTML =
      (prev ? `<a class="prev" href="${o.chapterHref(prev.slug)}"><small>← 이전 · ${prev.num}</small>${prev.title}</a>`
        : `<a class="prev" href="${o.home}"><small>← 처음으로</small>${o.homeLabel || "홈 · 로드맵"}</a>`) +
      (next ? `<a class="next" href="${o.chapterHref(next.slug)}"><small>다음 · ${next.num} →</small>${next.title}</a>` : "");
    o.after.after(nav);
    return nav;
  }

  /* Footer: what the book is, related books, then rights, licences (the book's own files) and reader feedback.
     { name, note, related: [{ href, label }], root, feedback, year } — note and labels are plain text. */
  function footer(o) {
    const root = o.root || "";
    const lines = [esc(o.name) + (o.note ? ` — ${esc(o.note)}` : "")];
    if (o.related && o.related.length) lines.push("관련 책: " + o.related.map((r) => `<a href="${r.href}">${esc(r.label)}</a>`).join(" · "));
    lines.push(`© ${o.year || 2026} geniuskey 및 ${esc(o.name)} 기여자 · 콘텐츠 <a rel="license" href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>` +
      ` · 코드 <a href="${root}LICENSE-MIT">MIT</a> · <a href="${root}LICENSE.md">라이선스 안내</a> · <a class="bk-foot-feedback">독자 의견</a>`);
    const foot = el("footer", "bk-foot");
    foot.innerHTML = lines.join("<br>");
    feedbackLink(foot.querySelector(".bk-foot-feedback"), o.feedback);
    document.body.appendChild(foot);
    return foot;
  }

  Object.assign(NS, { topbar, drawer, pager, footer });
})();
