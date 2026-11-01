/* Copyright (c) 2026 geniuskey and SemiBooks contributors. MIT. */
/* SemiBooks series setting for the @euiyun/book UI (book-ui.js): the shelf links in the top bar and the
   chapter drawer go to the semi.euiyun.com shelf instead of the books.euiyun.com portal. */
(function () {
  "use strict";
  const shelf = new URL("../../index.html", document.currentScript.src).href;
  (window.EuiyunBook = window.EuiyunBook || {}).shelf = { href: shelf, label: "반도체 서가", title: "SemiBooks · 반도체 서가", back: "← 반도체 서가로" };
})();
