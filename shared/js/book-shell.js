/* Copyright (c) 2026 geniuskey and SemiBooks contributors. MIT. */
/* SemiBooks series settings for the @euiyun/book top bar (book-topbar.js): the shelf link goes to the
   semi.euiyun.com shelf, and the chapter drawer gets the same link for phones, where the bar hides it. */
(function () {
  "use strict";
  const shelf = new URL("../../index.html", document.currentScript.src).href;
  (window.EuiyunBook = window.EuiyunBook || {}).shelf = { href: shelf, label: "반도체 서가", title: "SemiBooks · 반도체 서가" };
  function connectDrawer() {
    const drawer = document.querySelector('[class$="-drawer"]');
    if (drawer && !drawer.querySelector(".semi-shelf-return")) {
      const link = document.createElement("a");
      link.className = "semi-shelf-return";
      link.href = shelf;
      link.textContent = "← 반도체 서가로";
      drawer.append(link);
    }
  }
  if (document.readyState === "complete") connectDrawer();
  else document.addEventListener("DOMContentLoaded", connectDrawer, { once: true });
})();
