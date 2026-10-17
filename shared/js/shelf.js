/* Copyright (c) 2026 geniuskey and SemiBooks contributors. MIT. */
(function () {
  "use strict";
  const books = window.SEMI_BOOKS || [];
  const groups = [
    { id: "all", label: "전체", stages: [] },
    { id: "physics", label: "소자·광학", stages: ["physics"] },
    { id: "design", label: "회로·설계", stages: ["design"] },
    { id: "process", label: "제조·인프라", stages: ["process", "infra"] },
    { id: "packaging", label: "패키징·테스트", stages: ["packaging"] },
    { id: "device", label: "메모리·센서", stages: ["device"] },
    { id: "industry", label: "산업", stages: ["industry"] },
  ];
  const esc = (value) => String(value || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const count = (group) => books.filter((b) => group.id === "all" || group.stages.includes(b.stage)).length;
  const grid = document.getElementById("book-grid"), search = document.getElementById("book-search");
  let selected = "all";
  document.getElementById("stats").innerHTML = `<span>${books.length}권의 교과서</span><span>${books.reduce((n, b) => n + (b.chapters || 0), 0)}개 장</span><span>회로 · 공정 · 구조 시뮬레이터</span>`;
  document.querySelector(".journey-art").innerHTML = coverArt("layers") + coverArt("package");
  document.getElementById("filters").innerHTML = groups.map((g) => `<button data-filter="${g.id}" aria-pressed="${g.id === selected}">${g.label}<span>${count(g)}</span></button>`).join("");
  function card(book) {
    const title = (book.subtitle || book.title).replace(/ 교과서$/, "");
    return `<article class="book-card card" data-book="${esc(book.id)}" style="--c-light:${esc(book.color || '#2f5f96')};--c-dark:${esc(book.colorDark || '#8db8ea')}">
      <a class="book-main" href="${esc(book.url)}" aria-label="${esc(title)} · ${esc(book.title)} 읽기">
        <div class="cover"><span class="cover-code">${esc(book.code)}</span><span class="cover-state ${book.status === 'writing' ? 'writing' : ''}">${book.status === 'writing' ? '집필 중' : '읽기'}</span>${coverArt(book.motif)}</div>
        <div class="book-copy"><div class="book-name">${esc(book.title)}</div><h3>${esc(title)}</h3><p>${esc(book.headline || book.description)}</p><div class="book-topics">${(book.topics || []).slice(0, 3).map((t) => `<span>${esc(t)}</span>`).join('')}</div></div>
      </a>
      <div class="book-bottom"><span>${book.chapters || 0}장${book.status === 'writing' ? ' · 집필 중' : ''}</span>${book.legacyUrl ? `<a href="${esc(book.legacyUrl)}" target="_blank" rel="noopener" aria-label="${esc(book.title)} 기존 사이트에서 읽기">기존 사이트 ↗</a>` : '<a class="read" href="infra/">책 열기 →</a>'}</div>
    </article>`;
  }
  function render() {
    const group = groups.find((g) => g.id === selected);
    const words = search.value.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    const hits = books.filter((b) => (selected === 'all' || group.stages.includes(b.stage)) && words.every((word) =>
      [b.title, b.subtitle, b.headline, b.description, ...(b.topics || [])].join(' ').toLocaleLowerCase().includes(word)));
    grid.innerHTML = hits.map(card).join('');
    document.getElementById("book-count").textContent = `${hits.length} / ${books.length}권`;
    document.getElementById("empty").hidden = hits.length !== 0;
    document.querySelectorAll("#filters button").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.filter === selected)));
  }
  document.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-filter]");
    if (!button) return;
    selected = button.dataset.filter;
    render();
    if (button.closest('.journey')) document.getElementById('shelf').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  });
  search.addEventListener("input", render);
  search.addEventListener("keydown", (event) => { if (event.key === 'Escape') { search.value = ''; render(); } });
  const moon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
  const sun = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1"/></svg>';
  const theme = document.getElementById('theme');
  const dark = () => document.documentElement.dataset.theme ? document.documentElement.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  function paintTheme() { theme.innerHTML = dark() ? sun : moon; theme.setAttribute('aria-label', dark() ? '라이트 모드로 전환' : '다크 모드로 전환'); }
  theme.addEventListener('click', () => { const value = dark() ? 'light' : 'dark'; document.documentElement.dataset.theme = value; try { localStorage.setItem('semi-theme', value); } catch (e) {} paintTheme(); });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', paintTheme);
  paintTheme(); render();
  const structured = document.createElement('script'); structured.type = 'application/ld+json';
  structured.textContent = JSON.stringify({ '@context': 'https://schema.org', '@type': 'BookSeries', name: 'SemiBooks', url: 'https://semi.euiyun.com/', inLanguage: 'ko', hasPart: books.map((b) => ({ '@type': 'Book', name: b.title + ' · ' + b.subtitle, url: new URL(b.url, 'https://semi.euiyun.com/').href })) });
  document.head.append(structured);
})();
