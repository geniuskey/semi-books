/* Copyright (c) 2026 geniuskey. MIT. */
/* @euiyun/book experiment events: tells GA4 which simulators readers see and actually use.
   A book opts in with <script defer src=".../experiments.js" data-book="<book id>"></script>.
   Each `.sim[id]` sends at most one of each event per page load:
     experiment_view    — half of it was on screen for a second
     experiment_start   — the reader first moved a control, pressed a button or touched the canvas
     experiment_explore — the reader has used three different controls
   Parameters: experiment_id `<book id>/<chapter>/<sim id>` (the hub's data/experiment-catalog.json id), book_id.
   Nothing is sent without gtag (local previews); every event is also dispatched on window as `euiyun:experiment`. */
(function () {
  "use strict";
  const script = document.currentScript;
  const book = script && script.dataset.book;
  if (!book) return;
  const EXPLORE = 3;
  const page = (location.pathname.split("/").pop() || "index.html").replace(/\.html?$/, "") || "index";

  function send(name, sim) {
    const params = { experiment_id: `${book}/${page}/${sim.id}`, book_id: book };
    if (typeof window.gtag === "function") window.gtag("event", name, params);
    window.dispatchEvent(new CustomEvent("euiyun:experiment", { detail: Object.assign({ event: name }, params) }));
  }

  // A control is named by its id, else its position among the simulator's controls; the canvas counts as one control.
  function controlOf(sim, target) {
    const node = target.closest && target.closest("input, select, textarea, button, canvas, svg, [data-value]");
    if (!node || !sim.contains(node)) return null;
    if (node.id) return node.id;
    const all = sim.querySelectorAll("input, select, textarea, button, canvas, svg, [data-value]");
    return node.tagName.toLowerCase() + ":" + Array.prototype.indexOf.call(all, node);
  }

  function watch(sim) {
    const used = new Set();
    let started = false, explored = false;
    const onUse = (event) => {
      if (explored) return;
      const control = controlOf(sim, event.target);
      if (!control) return;
      if (!started) { started = true; send("experiment_start", sim); }
      used.add(control);
      if (used.size >= EXPLORE) {
        explored = true;
        send("experiment_explore", sim);
        for (const type of ["input", "change", "click", "pointerdown"]) sim.removeEventListener(type, onUse, true);
      }
    };
    for (const type of ["input", "change", "click", "pointerdown"]) sim.addEventListener(type, onUse, true);
  }

  function start() {
    const sims = Array.prototype.filter.call(document.querySelectorAll(".sim[id]"), (sim) => !sim.parentElement.closest(".sim[id]"));
    sims.forEach(watch);
    if (!("IntersectionObserver" in window)) return;
    const timers = new Map();
    const seen = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const sim = entry.target;
        // A simulator taller than two screens never shows half of itself, so half a screen of it also counts.
        if (entry.isIntersecting && (entry.intersectionRatio >= 0.5 || entry.intersectionRect.height >= window.innerHeight / 2)) {
          if (!timers.has(sim)) timers.set(sim, setTimeout(() => { seen.unobserve(sim); send("experiment_view", sim); }, 1000));
        } else if (timers.has(sim)) {
          clearTimeout(timers.get(sim));
          timers.delete(sim);
        }
      }
    }, { threshold: [0, 0.1, 0.25, 0.5, 0.75] });
    sims.forEach((sim) => seen.observe(sim));
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
