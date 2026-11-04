/* Copyright (c) 2026 geniuskey and SemiBooks contributors. MIT. */
/* 찾아보기 거르기: 친 글자가 용어(한글·영어·약어)에 들어 있는 줄만 남긴다. 띄어쓰기·기호는 무시, 초성(ㄱㅍㅊ)도 된다. ?q=로 열 수 있다.
   시리즈 찾아보기(루트 terms.html)는 #tx-multi로 두 권 이상에 나오는 용어(data-n ≥ 2)만 남길 수 있다(?multi=1). */
(function () {
  "use strict";
  const input = document.getElementById("tx-q");
  const list = document.getElementById("tx-list");
  if (!input || !list) return;
  const count = document.getElementById("tx-count"), empty = document.getElementById("tx-empty");
  const total = count.textContent;
  const norm = (s) => String(s || "").normalize("NFKC").toLowerCase().replace(/[\s·\-–—_/.,()]+/g, "");
  const CHO = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
  const cho = (s) => s.replace(/[가-힣]/g, (c) => CHO[Math.floor((c.charCodeAt(0) - 0xac00) / 588)]);
  const multi = document.getElementById("tx-multi");
  const items = [...list.querySelectorAll("li")].map((li) => ({ li, n: +li.dataset.n || 1, k: norm(li.dataset.k), c: cho(li.dataset.k.replace(/\s+/g, "")) }));
  const jump = new Map([...document.querySelectorAll(".tx-jump a")].map((a) => [a.getAttribute("href").slice(1), a]));
  function run() {
    const raw = input.value.trim(), bare = raw.replace(/\s+/g, ""), q = norm(raw);
    const byCho = /^[ㄱ-ㅎ]+$/.test(bare), few = multi?.checked;
    let n = 0;
    for (const it of items) { const on = (!few || it.n > 1) && (!raw || (byCho ? it.c.includes(bare) : it.k.includes(q))); it.li.hidden = !on; if (on) n++; }
    for (const g of list.querySelectorAll(".tx-group")) {
      const on = !!g.querySelector("li:not([hidden])");
      g.hidden = !on;
      jump.get(g.id)?.classList.toggle("off", !on);
    }
    count.textContent = raw || few ? `${n}개 / ${total}` : total;
    empty.hidden = n > 0;
  }
  let timer = 0;
  input.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(run, 60); });
  input.addEventListener("keydown", (e) => { if (e.key === "Escape") { input.value = ""; run(); } });
  multi?.addEventListener("change", run);
  const params = new URLSearchParams(location.search), q = params.get("q");
  if (multi && params.get("multi") === "1") multi.checked = true;
  if (q) input.value = q;
  if (q || multi?.checked) run();
})();
