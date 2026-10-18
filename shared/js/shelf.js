/* Copyright (c) 2026 geniuskey and SemiBooks contributors. MIT. */
/* 서가 홈: 분야·검색으로 고르는 책장, 대표 실험 덱, 읽는 순서 칩, 테마 전환 */
(function () {
  "use strict";
  const books = window.SEMI_BOOKS || [];
  const byId = new Map(books.map((b) => [b.id, b]));
  const groups = [
    { id: "all", label: "전체", stages: [] },
    { id: "physics", label: "소자·광학", stages: ["physics"] },
    { id: "design", label: "회로·설계", stages: ["design"] },
    { id: "process", label: "제조·인프라", stages: ["process", "infra"] },
    { id: "packaging", label: "패키징·테스트", stages: ["packaging"] },
    { id: "device", label: "메모리·센서", stages: ["device"] },
    { id: "industry", label: "산업", stages: ["industry"] },
  ];
  // 세로 표지에는 books 포털처럼 짧은 이름을 쓴다.
  const coverTitles = {
    devicebook: "반도체 소자", digitalbook: "디지털 회로", designbook: "반도체 설계", socbook: "시스템 온 칩", analogbook: "아날로그 회로",
    processbook: "제조 공정", lithobook: "노광", etchbook: "식각", cmpbook: "CMP·세정", dopingbook: "도핑", yieldbook: "수율 분석", failurebook: "불량 분석",
    tcadbook: "소자 시뮬레이션", infrabook: "반도체 인프라", packagingbook: "패키징", testbook: "반도체 테스트", memorybook: "메모리",
    opticsbook: "센서 광학", sensorbook: "이미지 센서", displaybook: "디스플레이", chipindustrybook: "반도체 산업",
  };
  const esc = (value) => String(value || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const count = (group) => books.filter((b) => group.id === "all" || group.stages.includes(b.stage)).length;
  const groupOf = (book) => groups.find((g) => g.stages.includes(book.stage)) || groups[0];
  const titleOf = (book) => coverTitles[book.id] || (book.subtitle || book.title).replace(/ 교과서$/, "");
  const grid = document.getElementById("book-grid"), search = document.getElementById("book-search");
  let selected = "all";

  const chapters = books.reduce((n, b) => n + (b.chapters || 0), 0);
  const simulators = books.reduce((n, b) => n + (b.simulators || 0), 0);
  document.getElementById("stats").innerHTML = `<span><b>${books.length}</b>권의 교과서</span><span><b>${chapters}</b>개 장</span>${simulators >= 100 ? `<span><b>${(Math.floor(simulators / 100) * 100).toLocaleString("ko-KR")}+</b> 시뮬레이터</span>` : ""}`;
  // 분야 버튼은 소자에서 산업까지 가치 사슬 순서로 화살표를 잇는다.
  document.getElementById("filters").innerHTML = groups.map((g, i) => (i === 1 ? '<span class="sep" aria-hidden="true"></span>' : i > 1 ? '<span class="chain" aria-hidden="true">→</span>' : "")
    + `<button type="button" data-filter="${g.id}" aria-pressed="${g.id === selected}">${g.label}<span>${count(g)}</span></button>`).join("");

  function card(book) {
    const title = titleOf(book), writing = book.status === "writing";
    const meta = `<span>${book.chapters || 0}장</span>${writing ? '<span class="writing">집필 중</span>' : ""}<a href="${esc(book.url)}" aria-label="${esc(book.title)} 읽기">읽기 →</a>`;
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
    const hits = books.filter((b) => (selected === "all" || group.stages.includes(b.stage)) && words.every((word) =>
      [b.title, b.subtitle, titleOf(b), b.headline, b.description, ...(b.topics || [])].join(" ").toLocaleLowerCase().includes(word)));
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
  search.addEventListener("input", render);
  search.addEventListener("keydown", (event) => { if (event.key === "Escape") { search.value = ""; render(); } });

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
  const theme = document.getElementById("theme");
  const dark = () => document.documentElement.dataset.theme ? document.documentElement.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  function paintTheme() { theme.innerHTML = dark() ? sun : moon; theme.setAttribute("aria-label", dark() ? "라이트 모드로 전환" : "다크 모드로 전환"); }
  theme.addEventListener("click", () => { const value = dark() ? "light" : "dark"; document.documentElement.dataset.theme = value; try { localStorage.setItem("semi-theme", value); } catch (e) {} paintTheme(); });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", paintTheme);
  paintTheme(); render();

  const structured = document.createElement("script"); structured.type = "application/ld+json";
  structured.textContent = JSON.stringify({ "@context": "https://schema.org", "@type": "BookSeries", name: "SemiBooks", url: "https://semi.euiyun.com/", inLanguage: "ko", hasPart: books.map((b) => ({ "@type": "Book", name: b.title + " · " + b.subtitle, url: new URL(b.url, "https://semi.euiyun.com/").href })) });
  document.head.append(structured);
})();
