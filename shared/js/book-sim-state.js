/* Copyright (c) 2026 geniuskey. MIT. */
/* @euiyun/book simulator state links: a reader copies a link that reopens a simulator with the same settings.
   A book opts in with <script defer src=".../sim-state.js" data-book="<book id>"></script> and styles from runtime/ui.css.
   Each `.sim[id]` with a `.sim-head` gets a 「설정 링크」 button. The link is <page>#<sim id>?<control id>=<value>&…
   and holds only the controls that differ from the page's own starting values:
     input[type=range|number|checkbox|radio][id], select[id], and segmented buttons `.seg[id] > button[data-value]` (`.on` is chosen).
   A simulator may declare data-model="<version>"; the link then carries it as `_v`, and a link made for another
   version still opens but says that the model has changed since.
   Opening such a link applies the values as if the reader had set them (input/change events, button clicks), scrolls to the
   simulator and offers 「처음 값으로」. GA4 gets experiment_share and experiment_shared_open (experiment_id as in experiments.js). */
(function () {
  "use strict";
  const script = document.currentScript;
  const book = script && script.dataset.book;
  if (!book) return;
  const page = (location.pathname.split("/").pop() || "index.html").replace(/\.html?$/, "") || "index";
  const INPUT = 'input[id][type="range"], input[id][type="number"], input[id][type="checkbox"], input[id][type="radio"], select[id]';

  function send(name, sim) {
    if (typeof window.gtag === "function") window.gtag("event", name, { experiment_id: `${book}/${page}/${sim.id}`, book_id: book });
  }

  // Controls of this simulator only: a nested simulator keeps its own.
  function controls(sim) {
    const own = (node) => node.closest(".sim[id]") === sim;
    const inputs = Array.prototype.filter.call(sim.querySelectorAll(INPUT), (n) => own(n) && !(n.type === "radio" && !n.name));
    const segs = Array.prototype.filter.call(sim.querySelectorAll(".seg[id]"), own);
    return { inputs, segs };
  }
  function read(sim) {
    const { inputs, segs } = controls(sim);
    const state = {};
    for (const n of inputs) {
      if (n.type === "radio") { if (n.checked) state[n.name] = n.value; }
      else state[n.id] = n.type === "checkbox" ? (n.checked ? "1" : "0") : n.value;
    }
    for (const s of segs) { const on = s.querySelector("button.on[data-value]"); if (on) state[s.id] = on.dataset.value; }
    return state;
  }
  function fire(node, ...types) { for (const type of types) node.dispatchEvent(new Event(type, { bubbles: true })); }
  // Values are applied in page order, so a mode button that shows other controls comes before them.
  function apply(sim, state) {
    const { inputs, segs } = controls(sim);
    const nodes = [...inputs, ...segs].sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
    for (const n of nodes) {
      if (n.classList.contains("seg")) {
        if (!(n.id in state)) continue;
        const button = Array.prototype.find.call(n.querySelectorAll("button[data-value]"), (b) => b.dataset.value === state[n.id]);
        if (button && !button.classList.contains("on")) button.click();
      } else if (n.type === "radio") {
        if (state[n.name] === n.value && !n.checked) n.click();
      } else if (n.type === "checkbox") {
        if (n.id in state && (state[n.id] === "1") !== n.checked) n.click();
      } else if (n.id in state && n.value !== state[n.id]) {
        n.value = state[n.id];
        fire(n, "input", "change");
      }
    }
  }
  function diff(state, base) {
    const out = {};
    for (const key of Object.keys(state)) if (state[key] !== base[key]) out[key] = state[key];
    return out;
  }
  function linkFor(sim, base) {
    const params = new URLSearchParams(diff(read(sim), base));
    if (sim.dataset.model) params.set("_v", sim.dataset.model);
    const query = params.toString();
    return location.href.split("#")[0] + "#" + sim.id + (query ? "?" + query : "");
  }

  function copy(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.cssText = "position:fixed;top:0;left:0;opacity:0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand && document.execCommand("copy");
    area.remove();
    return ok ? Promise.resolve() : Promise.reject(new Error("copy"));
  }
  function button(label, title) {
    const node = document.createElement("button");
    node.type = "button";
    node.className = "bk-sim-share";
    node.textContent = label;
    node.title = title;
    return node;
  }
  function place(head, node) {
    const anchor = head.querySelector(".sim-link");
    if (anchor) head.insertBefore(node, anchor);
    else { node.classList.add("bk-push"); head.appendChild(node); }
  }

  function start() {
    const sims = Array.prototype.filter.call(document.querySelectorAll(".sim[id]"), (sim) => sim.querySelector(":scope > .sim-head"));
    const bases = new Map(sims.map((sim) => [sim, read(sim)]));
    for (const sim of sims) {
      const base = bases.get(sim);
      if (!Object.keys(base).length) continue;
      const share = button("설정 링크", "지금 설정 그대로 이 시뮬레이터를 여는 링크를 복사합니다");
      share.addEventListener("click", () => {
        const url = linkFor(sim, base);
        copy(url).then(() => { share.textContent = "복사했습니다"; }, () => { window.prompt("이 링크를 복사하세요", url); })
          .finally(() => setTimeout(() => { share.textContent = "설정 링크"; }, 1800));
        send("experiment_share", sim);
      });
      place(sim.querySelector(":scope > .sim-head"), share);
    }

    const match = location.hash.match(/^#([^?]+)\?(.+)$/);
    if (!match) return;
    const sim = document.getElementById(decodeURIComponent(match[1]));
    if (!sim || !bases.has(sim)) return;
    const state = Object.fromEntries(new URLSearchParams(match[2]));
    const version = state._v;
    delete state._v;
    apply(sim, state);
    send("experiment_shared_open", sim);
    const head = sim.querySelector(":scope > .sim-head");
    let note = null;
    const reset = button("처음 값으로", "공유받은 설정을 지우고 이 시뮬레이터의 처음 값으로 돌립니다");
    reset.addEventListener("click", () => {
      apply(sim, bases.get(sim));
      reset.remove();
      if (note) note.remove();
      history.replaceState(null, "", location.href.split("#")[0] + "#" + sim.id);
    });
    place(head, reset);
    if (sim.dataset.model && version && version !== sim.dataset.model) {
      note = document.createElement("p");
      note.className = "bk-sim-note";
      note.textContent = "이 링크를 만든 뒤 실험 모델이 바뀌었습니다. 같은 설정이어도 결과가 다를 수 있습니다.";
      head.after(note);
    }
    sim.scrollIntoView({ block: "start" });
  }

  // Simulators read their controls once they are built, so values are applied after the page has loaded.
  if (document.readyState === "complete") setTimeout(start);
  else window.addEventListener("load", () => setTimeout(start), { once: true });
})();
