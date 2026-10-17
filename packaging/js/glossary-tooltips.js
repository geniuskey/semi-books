/* Copyright (c) 2026 geniuskey and Book Series contributors.
   Code: MIT. Definitions remain CC-BY-4.0 in each book's glossary data. */
/* Shared implementation: keep copies identical across independently deployed books. */
(function () {
  "use strict";
  if (window.BookGlossary) return;
  const scriptBase = new URL(".", document.currentScript.src);
  const config = window.BOOK_GLOSSARY_CONFIG || {};
  const norm = (s) => String(s || "").normalize("NFC").replace(/\s+/g, " ").trim().toLowerCase();
  const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const unique = (names) => names.filter((name, i) => name && !names.slice(0, i).some((s) => norm(s) === norm(name)));

  // Split lists outside parentheses. Preserve units and names such as I/O, P/E and A/B.
  function names(text) {
    text = String(text || "").replace(/`/g, "").trim();
    const out = [];
    let depth = 0, start = 0;
    for (let i = 0; i < text.length; i++) {
      if (text[i] === "(") depth++;
      if (text[i] === ")") depth = Math.max(0, depth - 1);
      if (depth) continue;
      const slash = text[i] === "/" && /\s/.test(text[i - 1] || "") && /\s/.test(text[i + 1] || "");
      if (text[i] === "·" || slash) { out.push(text.slice(start, i).trim()); start = i + 1; }
    }
    out.push(text.slice(start).trim());
    return unique(out);
  }

  function indexTerms(terms, customAliases) {
    const index = new Map();
    function put(alias, entry) {
      alias = norm(alias);
      if (!alias) return;
      const entries = index.get(alias) || [];
      entries.push(entry);
      index.set(alias, entries);
    }
    terms.forEach((term) => {
      const ko = names(term.ko), en = names(term.en), abbr = names(term.abbr);
      const titleFor = (parts, i, alias) => {
        const name = ko.length === parts.length ? ko[i] : (ko.length === 1 ? ko[0] : alias);
        const abbreviation = abbr.length === parts.length ? abbr[i] : (abbr.length === 1 ? abbr[0] : "");
        return unique([name, abbreviation]).join(" · ");
      };
      [term.ko, term.en, term.abbr].filter(Boolean).forEach((alias) => {
        put(alias, { term, title: unique([term.ko, names(term.abbr).length === 1 ? term.abbr : ""]).join(" · "), exact: true });
      });
      [ko, en, abbr].forEach((parts) => parts.forEach((alias, i) => {
        const title = titleFor(parts, i, alias);
        put(alias, { term, title, exact: parts.length === 1 });
        const bare = alias.replace(/\s*\([^()]*\)/g, "").trim();
        if (bare !== alias) put(bare, { term, title, exact: false });
        // Parenthesized short forms are useful names, but prose qualifications are not.
        for (const match of alias.matchAll(/\(([^()]+)\)/g)) {
          if (match[1].length <= 40 && !/[=;:]/.test(match[1])) {
            names(match[1]).forEach((short) => put(short, { term, title, exact: false }));
          }
        }
      }));
    });
    Object.entries(customAliases || {}).forEach(([alias, canonical]) => {
      (index.get(norm(canonical)) || []).forEach((entry) => put(alias, entry));
    });
    const chapter = document.body.dataset.chapter || location.pathname.split("/").pop().replace(/\.html$/, "");
    const best = new Map();
    index.forEach((entries, alias) => {
      entries.sort((a, b) => Number(b.exact) - Number(a.exact) ||
        Number((b.term.chapters || []).some((ch) => ch.split("#")[0] === chapter)) -
        Number((a.term.chapters || []).some((ch) => ch.split("#")[0] === chapter)));
      best.set(alias, entries[0]);
    });
    return best;
  }

  function formatDefinition(definition) {
    if (config.format === "tax" && window.TX) {
      return definition.replace(/\{([\w.]+)\|?(\w*)\}/g, (_, path, format) => {
        const value = TX.v(path);
        format = format || (typeof value === "number" ? (Math.abs(value) < 1 && value !== 0 ? "pct" : "won") : "raw");
        return value == null ? "확인 필요" : (TX.fmt[format] || TX.fmt.raw)(value);
      });
    }
    if (window.BOOK_GLOSSARY.formatDefinition) return window.BOOK_GLOSSARY.formatDefinition(definition);
    return definition;
  }

  function annotate(main, index) {
    const aliases = [...index.keys()].filter((alias) => alias.length >= 2 || /[가-힣]/.test(alias));
    aliases.sort((a, b) => b.length - a.length);
    if (!aliases.length) return { count: 0 };
    const pattern = new RegExp(aliases.map(escape).join("|"), "gi");
    const excluded = "a, button, input, select, textarea, label, output, script, style, pre, code, svg, canvas, math, .katex, .formula, .equation, .quiz, .quiz-q, .fq, .problem, .sim-controls, .sim-readout, .sim-view, .gl-item, .gl-list, [contenteditable], [data-no-glossary], [role=button], .gl-term";
    const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        return node.parentElement.closest(excluded) || /\$\$|\\[([]/.test(node.data)
          ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      },
    });
    const nodes = [], bindings = new WeakMap();
    while (walker.nextNode()) nodes.push(walker.currentNode);
    const word = (c) => /[a-z0-9_]/i.test(c || "");
    let count = 0;
    nodes.forEach((node) => {
      const text = node.data, fragment = document.createDocumentFragment();
      let end = 0;
      for (const match of text.matchAll(pattern)) {
        const label = match[0], start = match.index;
        if ((word(label[0]) && word(text[start - 1])) ||
            (word(label.at(-1)) && word(text[start + label.length])) ||
            (/[가-힣]/.test(label[0]) && /[가-힣]/.test(text[start - 1] || ""))) continue;
        const entry = index.get(norm(label));
        if (!entry) continue;
        fragment.append(text.slice(end, start));
        const span = document.createElement("span");
        span.className = "gl-term";
        span.tabIndex = 0;
        span.textContent = label;
        bindings.set(span, entry);
        fragment.append(span);
        end = start + label.length;
        count++;
      }
      if (end) { fragment.append(text.slice(end)); node.replaceWith(fragment); }
    });
    // Existing explicit .term markers can include short symbols or spelling aliases.
    main.querySelectorAll(".term:not(:has(.gl-term))").forEach((span) => {
      if (span.closest(excluded)) return;
      const entry = index.get(norm(span.textContent));
      if (!entry) return;
      span.classList.add("gl-term"); span.tabIndex = 0;
      bindings.set(span, entry); count++;
    });
    const tooltip = document.createElement("div");
    tooltip.id = "book-glossary-tooltip";
    tooltip.className = "gl-tooltip no-math";
    tooltip.setAttribute("role", "tooltip");
    tooltip.hidden = true;
    document.body.append(tooltip);
    let active, timer, anchorRect;
    function hide() {
      clearTimeout(timer);
      if (active) active.removeAttribute("aria-describedby");
      active = null; tooltip.hidden = true;
    }
    function show(target) {
      clearTimeout(timer);
      const entry = bindings.get(target);
      if (!entry) return;
      if (active) active.removeAttribute("aria-describedby");
      active = target;
      const title = document.createElement("strong"), definition = document.createElement("p");
      title.textContent = entry.title;
      definition.textContent = formatDefinition(entry.term.def);
      tooltip.replaceChildren(title, definition);
      tooltip.hidden = false;
      target.setAttribute("aria-describedby", tooltip.id);
      if (window.renderMathInElement) window.renderMathInElement(tooltip, {
        delimiters: [{ left: "$$", right: "$$", display: true }, { left: "\\(", right: "\\)", display: false }, { left: "\\[", right: "\\]", display: true }],
        throwOnError: false,
      });
      const rect = target.getBoundingClientRect(), gap = 8;
      anchorRect = { left: rect.left, top: rect.top };
      const width = tooltip.offsetWidth, height = tooltip.offsetHeight;
      tooltip.style.left = Math.max(gap, Math.min(rect.left, innerWidth - width - gap)) + "px";
      tooltip.style.top = (rect.bottom + gap + height <= innerHeight - gap
        ? rect.bottom + gap : Math.max(gap, rect.top - height - gap)) + "px";
    }
    function closeSoon() {
      clearTimeout(timer);
      timer = setTimeout(() => { if (document.activeElement !== active) hide(); }, 150);
    }
    main.addEventListener("pointerover", (event) => { if (event.pointerType !== "touch") show(event.target.closest(".gl-term")); });
    main.addEventListener("pointerout", (event) => { if (event.target.closest(".gl-term")) closeSoon(); });
    main.addEventListener("focusin", (event) => show(event.target.closest(".gl-term")));
    main.addEventListener("focusout", (event) => { if (event.target.closest(".gl-term")) closeSoon(); });
    main.addEventListener("click", (event) => show(event.target.closest(".gl-term")));
    tooltip.addEventListener("pointerenter", () => clearTimeout(timer));
    tooltip.addEventListener("pointerleave", closeSoon);
    document.addEventListener("pointerdown", (event) => { if (!event.target.closest(".gl-term, .gl-tooltip")) hide(); });
    document.addEventListener("keydown", (event) => { if (event.key === "Escape") hide(); });
    window.addEventListener("scroll", (event) => {
      if (!active || tooltip.contains(event.target)) return;
      const rect = active.getBoundingClientRect();
      // A queued scroll event from bringing a word into view must not close its new tooltip.
      if (Math.abs(rect.left - anchorRect.left) > 1 || Math.abs(rect.top - anchorRect.top) > 1) hide();
    }, true);
    window.addEventListener("resize", hide);
    return { count };
  }

  async function init() {
    if (document.readyState === "loading") await new Promise((resolve) => document.addEventListener("DOMContentLoaded", resolve, { once: true }));
    const main = document.querySelector("main.chapter");
    if (!main) return { count: 0 };
    if (!window.BOOK_GLOSSARY && config.dataUrl) await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = config.dataUrl; script.onload = resolve; script.onerror = () => reject(new Error("Could not load glossary: " + config.dataUrl));
      document.head.append(script);
    });
    const data = window.BOOK_GLOSSARY || (window.SB && SB.course && SB.course.glossary);
    if (!data || data.version !== 1 || !Array.isArray(data.terms)) return { count: 0 };
    window.BOOK_GLOSSARY = data;
    const css = document.createElement("link"); css.rel = "stylesheet";
    css.href = new URL("../css/glossary-tooltips.css", scriptBase).href;
    document.head.append(css);
    if (config.format === "tax" && window.TX) await new Promise((resolve) => TX.ready(resolve));
    const index = indexTerms(data.terms, config.aliases ? window[config.aliases] : null);
    return annotate(main, index);
  }
  window.BookGlossary = { ready: init() };
  window.BookGlossary.ready.catch((error) => console.warn("Glossary tooltips:", error));
})();
