/* Copyright (c) 2026 geniuskey and SemiBooks contributors. MIT. */
/* Monorepo navigation adapter. Imported books keep their own simulation engines. */
(function () {
  "use strict";
  const shelf = new URL("../../index.html", document.currentScript.src).href;
  function connectShelf() {
    const bar = document.querySelector('[class$="-topbar"]');
    if (bar) {
      let link = bar.querySelector(".series-link");
      if (link) {
        link.href = shelf;
        const label = link.querySelector("span");
        if (label) label.textContent = "반도체 서가";
      } else {
        link = document.createElement("a");
        const theme = bar.querySelector('[id$="-theme"]');
        link.className = (theme ? theme.className : "") + " semi-shelf-link";
        link.href = shelf;
        link.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 5h5v14H4zM9 5h5v14H9zM17 6l3-1 3 14-3 1z"/></svg>';
        if (theme) theme.before(link); else bar.append(link);
      }
      link.classList.add("semi-shelf-link");
      link.title = "SemiBooks · 반도체 서가";
      link.setAttribute("aria-label", "반도체 서가로 돌아가기");
    }
    const drawer = document.querySelector('[class$="-drawer"]');
    if (drawer && !drawer.querySelector(".semi-shelf-return")) {
      const link = document.createElement("a");
      link.className = "semi-shelf-return";
      link.href = shelf;
      link.textContent = "← 반도체 서가로";
      drawer.append(link);
    }
  }
  if (document.readyState === "complete") connectShelf();
  else document.addEventListener("DOMContentLoaded", connectShelf, { once: true });
})();
