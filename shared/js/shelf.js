/* Copyright (c) 2026 geniuskey and euiyun books contributors. MIT. */
/* 공통 파일: books 저장소 tools/shelf-kit/shelf.js가 원본이다. 고칠 때는 원본을 고치고 tools/sync-shelf-kit.py로 배포한다. */
/* 서가 홈: 분야·검색으로 고르는 책장, 대표 실험 덱, 읽는 순서 칩, 테마 전환 */
(function () {
  "use strict";
  // 서가마다 다른 값은 catalog.js의 window.SHELF(book.json에서 생성)에 있다.
  const shelf = window.SHELF || {};
  const books = shelf.books || [];
  const byId = new Map(books.map((b) => [b.id, b]));
  // 분야 버튼과 서가 지도는 book.json의 map에서 만든다. 묶음 하나가 stage 여러 개를 담을 수 있다.
  const shelfMap = shelf.map || { groups: [], links: [] };
  const groups = [{ id: "all", label: "전체", stages: [] },
    ...shelfMap.groups.map((g) => ({ id: g.id, label: g.name, stages: g.stages || [g.id] }))];
  // 세로 표지에는 books 포털처럼 짧은 이름을 쓴다.
  const coverTitles = shelf.coverTitles || {};
  const esc = (value) => String(value || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const count = (group) => books.filter((b) => group.id === "all" || group.stages.includes(b.stage)).length;
  const groupOf = (book) => groups.find((g) => g.stages.includes(book.stage)) || groups[0];
  const titleOf = (book) => coverTitles[book.id] || (book.subtitle || book.title).replace(/ 교과서$/, "");
  const grid = document.getElementById("book-grid"), search = document.getElementById("book-search");
  let selected = "all";

  const chapters = books.reduce((n, b) => n + (b.chapters || 0), 0);
  const simulators = books.reduce((n, b) => n + (b.simulators || 0), 0);
  document.getElementById("stats").innerHTML = `<span><b>${books.filter(b => b.status !== "planned").length}</b>권 공개</span><span><b>${chapters}</b>개 장</span>${books.some(b => b.status === "planned") ? `<span><b>${books.filter(b => b.status === "planned").length}</b>권 준비 예정</span>` : ""}${simulators >= 100 ? `<span><b>${(Math.floor(simulators / 100) * 100).toLocaleString("ko-KR")}+</b> 시뮬레이터</span>` : ""}`;
  // 분야 버튼은 분야 순서로 화살표를 잇는다.
  document.getElementById("filters").innerHTML = groups.map((g, i) => (i === 1 ? '<span class="sep" aria-hidden="true"></span>' : i > 1 ? '<span class="chain" aria-hidden="true">→</span>' : "")
    + `<button type="button" data-filter="${g.id}" aria-pressed="${g.id === selected}">${g.label}<span>${count(g)}</span></button>`).join("");

  function card(book) {
    const title = titleOf(book), writing = book.status === "writing";
    if (book.status === "planned") return `<article class="book planned" data-book="${esc(book.id)}" style="--c:${esc(book.color)}"><div class="book-stand"><div class="book-cover" aria-label="${esc(title)} · 준비 예정"><span class="book-top"><small>${esc(groupOf(book).label)}</small><b>준비 예정</b></span><strong>${esc(title)}</strong><span class="book-art" aria-hidden="true">${window.coverArt(book.motif)}</span><span class="book-foot"><span>${esc(book.title)}</span><span>${esc(book.code)}</span></span></div></div><div class="book-label"><p>${esc(book.headline)}</p><div class="book-meta"><span>준비 예정 · 아직 공개되지 않았습니다</span></div></div></article>`;
    // 본문 검색(서가의 search.js)이 있으면 책마다 찾은 건수를 붙인다. readLink는 book.json의 서가 설정이다.
    const found = window.SHELF_SEARCH_HITS?.get(book.slug);
    const meta = `${found ? `<span class="found">본문 ${found.toLocaleString("ko-KR")}건</span>` : ""}<span>${book.chapters || 0}장</span>${writing ? '<span class="writing">집필 중</span>' : ""}${book.legacyUrl ? `<a href="${esc(book.legacyUrl)}" target="_blank" rel="noopener" aria-label="${esc(book.title)} 기존 사이트에서 읽기 (새 탭)">기존 사이트 ↗</a>` : ""}${shelf.readLink ? `<a href="${esc(book.url)}" aria-label="${esc(book.title)} 읽기">읽기 →</a>` : ""}`;
    return `<article class="book${writing ? " writing" : ""}" data-book="${esc(book.id)}" style="--c:${esc(book.color || "#2f5f96")}">
      <div class="book-stand"><a class="book-cover" href="${esc(book.url)}" aria-label="${esc(title)} · ${esc(book.title)}${writing ? " (집필 중)" : ""} 읽기">
        <span class="book-top"><small>${esc(groupOf(book).label)}</small>${writing ? "<b>집필 중</b>" : ""}</span>
        <strong>${esc(title)}</strong>
        <span class="book-art" aria-hidden="true">${window.coverArt ? window.coverArt(book.motif) : ""}</span>
        <span class="book-foot"><span>${esc(book.title)}</span><span>${esc(book.code)}</span></span>
      </a></div>
      <div class="book-label"><p>${esc(book.headline || book.description)}</p><div class="book-meta">${meta}</div></div>
    </article>`;
  }
  // 마지막 줄의 빈 칸에도 선반이 이어지도록 열 수에 맞춰 빈 자리를 채운다.
  let shelfColumns = 0;
  const columns = () => getComputedStyle(grid).gridTemplateColumns.split(" ").length;
  function fillShelf() {
    grid.querySelectorAll(".book-slot").forEach((slot) => slot.remove());
    const n = grid.children.length;
    shelfColumns = columns();
    if (n) grid.insertAdjacentHTML("beforeend", '<div class="book book-slot" aria-hidden="true"><div class="book-stand"></div></div>'.repeat((shelfColumns - (n % shelfColumns)) % shelfColumns));
  }
  new ResizeObserver(() => { if (columns() !== shelfColumns) fillShelf(); }).observe(grid);

  function render() {
    const group = groups.find((g) => g.id === selected);
    const words = search.value.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    const found = window.SHELF_SEARCH_HITS;
    const hits = books.filter((b) => (selected === "all" || group.stages.includes(b.stage)) && (found?.get(b.slug) || words.every((word) =>
      [b.title, b.subtitle, titleOf(b), b.headline, b.description, ...(b.topics || [])].join(" ").toLocaleLowerCase().includes(word))));
    // 본문 검색이 지금 고른 분야 안에서 찾도록 stage를 알려 준다.
    document.getElementById("filters").dataset.stages = group.stages.join(",");
    grid.innerHTML = hits.map(card).join("");
    fillShelf();
    document.getElementById("book-count").textContent = `${hits.length} / ${books.length}권`;
    document.getElementById("empty").hidden = hits.length !== 0;
    document.querySelectorAll("#filters button").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.filter === selected)));
  }
  document.getElementById("filters").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-filter]");
    if (!button) return;
    selected = button.dataset.filter;
    render();
  });
  // 본문 검색(ShelfSearch)이 있으면 결과가 나올 때(shelf:search) 다시 그린다.
  search.addEventListener("input", () => { if (!window.ShelfSearch) render(); });
  document.addEventListener("shelf:search", render);
  search.addEventListener("keydown", (event) => { if (event.key === "Escape") { search.value = ""; render(); } });

  // 서가 지도: 묶음을 읽는 순서대로 잇고, 책 사이 연결은 한 줄씩 적는다.
  const mapEl = document.getElementById("shelf-map");
  if (mapEl && shelfMap.groups.length) {
    const chip = (id) => { const b = byId.get(id); return b ? `<a data-book="${esc(b.id)}" href="${esc(b.url)}">${esc(titleOf(b))}</a>` : ""; };
    mapEl.innerHTML = `<ol class="map-groups${shelfMap.groups.length > 4 ? " wide" : ""}">${shelfMap.groups.map((g, i) => { const n = books.filter((b) => (g.stages || [g.id]).includes(b.stage)).length; return `<li${n > 6 ? ' class="big"' : ""} style="--n:${n}"><small>${String(i + 1).padStart(2, "0")} · ${esc(g.en)}</small><b>${esc(g.name)}</b><p>${esc(g.desc)}</p><div class="path">${books.filter((b) => (g.stages || [g.id]).includes(b.stage)).map((b) => chip(b.id)).join("")}</div></li>`; }).join("")}</ol>`
      + (shelfMap.links.length ? (() => {
        // 연결이 많으면 접어 두어 첫 화면을 지도 묶음에 쓴다.
        const list = `<ul class="map-links">${shelfMap.links.map(([a, b, reason]) => `<li><span class="path">${chip(a)}<i aria-label="에서">→</i>${chip(b)}</span>${esc(reason)}</li>`).join("")}</ul>`;
        return shelfMap.links.length > 6 ? `<details class="map-more"><summary>책 사이 연결 ${shelfMap.links.length}개</summary>${list}</details>` : list;
      })() : "");
  }

  // 실험 카드와 읽는 순서 칩에 책 색과 코드를 입힌다.
  document.querySelectorAll(".experiment[data-book], .path a[data-book]").forEach((el) => {
    const book = byId.get(el.dataset.book);
    if (!book) return;
    el.style.setProperty("--c-light", book.color);
    el.style.setProperty("--c-dark", book.colorDark || book.color);
    if (el.closest(".path")) el.insertAdjacentHTML("afterbegin", `<span class="sq" aria-hidden="true">${esc(book.code)}</span>`);
  });

  // 실험 덱: 가리킨 카드는 앞으로 나오고 이웃 카드는 조금씩 비켜난다. 레이아웃 좌표 기준이라 움직이는 중에도 흔들리지 않는다.
  const deck = document.getElementById("experiments");
  const dockMedia = matchMedia("(min-width: 1001px) and (hover: hover) and (prefers-reduced-motion: no-preference)");
  const cards = [...deck.children];
  let active = null;
  function resetDock() {
    active = null;
    deck.classList.remove("dock-active");
    cards.forEach((item) => { item.classList.remove("dock-current"); item.style.removeProperty("--dock-x"); item.style.removeProperty("--dock-z"); });
  }
  function activate(item) {
    if (!dockMedia.matches || !cards.includes(item) || active === item) return;
    active = item;
    const index = cards.indexOf(item);
    deck.classList.add("dock-active");
    cards.forEach((other, i) => {
      const distance = Math.abs(i - index);
      other.style.setProperty("--dock-x", `${distance ? Math.sign(i - index) * 24 / distance : 0}px`);
      other.style.setProperty("--dock-z", cards.length - distance);
      other.classList.toggle("dock-current", other === item);
    });
  }
  deck.addEventListener("pointermove", (event) => { if (event.pointerType !== "touch") activate(event.target.closest(".experiment")); });
  deck.addEventListener("pointerleave", () => { resetDock(); if (deck.contains(document.activeElement)) activate(document.activeElement); });
  deck.addEventListener("focusin", (event) => activate(event.target.closest(".experiment")));
  deck.addEventListener("focusout", (event) => { if (!deck.contains(event.relatedTarget)) resetDock(); });
  dockMedia.addEventListener("change", resetDock);

  const moon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
  const sun = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1"/></svg>';
  // 테마 저장 키: 보통 서가 주소의 첫 이름(medical.euiyun.com → medical-theme), 다르면 book.json의 themeKey. index.html 첫 스크립트와 같아야 한다.
  const themeKey = shelf.themeKey || (shelf.url ? new URL(shelf.url).hostname.split(".")[0] : "shelf") + "-theme";
  const theme = document.getElementById("theme");
  const dark = () => document.documentElement.dataset.theme ? document.documentElement.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  function paintTheme() { theme.innerHTML = dark() ? sun : moon; theme.setAttribute("aria-label", dark() ? "라이트 모드로 전환" : "다크 모드로 전환"); }
  function setTheme(value) { document.documentElement.dataset.theme = value; try { localStorage.setItem(themeKey, value); } catch (e) {} paintTheme(); }
  theme.addEventListener("click", () => setTheme(dark() ? "light" : "dark"));
  // 서가 검사 도구가 테마를 바꿔 볼 수 있게 연다(art-books tools/check.py 등).
  window.ShelfHome = { setTheme };
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", paintTheme);
  paintTheme(); render();

  const structured = document.createElement("script"); structured.type = "application/ld+json";
  structured.textContent = JSON.stringify({ "@context": "https://schema.org", "@type": "BookSeries", name: shelf.title, url: shelf.url, inLanguage: "ko", hasPart: books.filter(b => b.status !== "planned").map((b) => ({ "@type": "Book", name: b.title + " · " + b.subtitle, url: new URL(b.url, shelf.url).href })) });
  document.head.append(structured);
})();
