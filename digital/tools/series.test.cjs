// Copyright (c) 2026 geniuskey and DigitalBook contributors. MIT.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { execFileSync } = require("node:child_process");
const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("generated glossary and quiz bank retain all authored content and chapter links", () => {
  execFileSync(process.env.PYTHON || "python3", ["tools/glossary.py", "--check"], { cwd: root });
  const chapters = [...read("js/common.js").matchAll(/slug: "([\w-]+)"/g)].map((match) => match[1]);
  const expected = [], questions = [];
  for (const slug of chapters) {
    const file = path.join(root, "tools/glossary", slug + ".json");
    if (!fs.existsSync(file)) continue;
    const source = JSON.parse(fs.readFileSync(file, "utf8"));
    expected.push(...(source.terms || []).map((term) => ({ ko: term.ko, en: term.en || "", abbr: term.abbr || "", def: term.def, chapters: [slug] })));
    questions.push(...(source.bank || []).map((question) => ({ ch: slug, q: question.q, o: question.opts, a: question.ans, e: question.exp })));
  }
  const context = { window: {} };
  vm.runInNewContext(read("js/glossary-data.js"), context);
  assert.equal(context.window.BOOK_GLOSSARY.version, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(context.window.BOOK_GLOSSARY.terms)), expected);
  const block = read("chapters/glossary.html").match(/\/\*DATA:start\*\/([\s\S]*?)\/\*DATA:end\*\//)[1];
  vm.runInNewContext(block, context);
  assert.deepEqual(JSON.parse(JSON.stringify(context.QUIZ)), questions);
  for (const term of expected) assert.ok(fs.existsSync(path.join(root, "chapters", term.chapters[0] + ".html")), term.ko);
});

test("the series build manifest and all chapter scripts are valid", () => {
  const book = JSON.parse(read("book.json"));
  assert.equal(book.domain, fs.readFileSync(path.join(root, "..", "CNAME"), "utf8").trim());
  assert.equal(book.url, "https://" + book.domain + "/" + book.path);
  const files = ["index.html", ...fs.readdirSync(path.join(root, "chapters")).filter((file) => file.endsWith(".html")).map((file) => "chapters/" + file)];
  for (const file of files) {
    const html = read(file);
    for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
      if (/application\/ld\+json/.test(match[1])) JSON.parse(match[2]);
      else if (!/\btype=['"]module['"]/.test(match[1])) new vm.Script(match[2], { filename: file });
    }
  }
});

function chapterFunction(chapter, name, context = {}) {
  const html = read(`chapters/${chapter}.html`);
  const start = html.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, name);
  const open = html.indexOf("{", start);
  let depth = 1, end = open + 1;
  while (depth && end < html.length) {
    if (html[end] === "{") depth++;
    if (html[end] === "}") depth--;
    end++;
  }
  return vm.runInNewContext(`(${html.slice(start, end)})`, context);
}

test("sense latch has no finite resolution time at zero effective differential", () => {
  const senseDecision = chapterFunction("memory", "senseDecision");
  assert.equal(senseDecision(0, .75, 3).direction, 0);
  assert.equal(senseDecision(0, .75, 3).time, null);
  const weak = senseDecision(1e-6, .75, 3);
  assert.equal(weak.direction, 1);
  assert.ok(weak.time > senseDecision(1e-4, .75, 3).time);
  assert.equal(weak.time, senseDecision(-1e-6, .75, 3).time);
  assert.equal(senseDecision(-1e-6, .75, 3).direction, -1);
});

test("independent SRAM array yield uses the binomial probability", () => {
  const arrayYield = chapterFunction("memory", "arrayYield");
  assert.equal(arrayYield(.5, 2), .25);
  assert.equal(arrayYield(0, 2 ** 30), 1);
  assert.equal(arrayYield(1, 2 ** 30), 0);
  assert.ok(Math.abs(arrayYield(1e-9, 2 ** 20) - .998951973576) < 1e-10);
});

test("SECDED decoder guarantees only single correction and double detection", () => {
  const decodeWord = chapterFunction("robust", "decodeWord");
  const counts = Array.from({ length: 9 }, () => ({}));
  for (let mask = 0; mask < 256; mask++) {
    const bits = Array.from({ length: 8 }, (_, i) => (mask >> i) & 1);
    const weight = bits.reduce((sum, b) => sum + b, 0);
    const d = decodeWord(bits, true);
    counts[weight][d.kind] = (counts[weight][d.kind] || 0) + 1;
    if (weight === 1) assert.deepEqual(Array.from(d.corrected), Array(8).fill(0));
    if (weight === 3) assert.ok(d.corrected.some(Boolean));
  }
  assert.deepEqual(counts.slice(0, 5), [{ clean: 1 }, { correct: 8 }, { detect: 28 }, { correct: 56 }, { clean: 14, detect: 56 }]);
  for (let mask = 1; mask < 128; mask++) {
    const bits = Array.from({ length: 8 }, (_, i) => i ? (mask >> (i - 1)) & 1 : 0);
    if (bits.reduce((sum, b) => sum + b, 0) !== 2) continue;
    const d = decodeWord(bits, false);
    assert.equal(d.kind, "correct");
    assert.equal(d.corrected.reduce((sum, b) => sum + b, 0), 3);
  }
});

test("a rail-restoring noise chain is wrong after an odd number of flips", () => {
  const chainError = chapterFunction("overview", "chainError");
  assert.equal(chainError(0, 40), 0);
  assert.equal(chainError(.5, 40), .5);
  assert.ok(Math.abs(chainError(.1, 2) - .18) < 1e-14);
  assert.ok(Math.abs(chainError(1e-16, 40) / 4e-15 - 1) < 1e-14);
});
