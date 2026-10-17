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
  assert.equal(book.domain, read("CNAME").trim());
  assert.equal(book.url, "https://" + book.domain + "/");
  const files = ["index.html", ...fs.readdirSync(path.join(root, "chapters")).filter((file) => file.endsWith(".html")).map((file) => "chapters/" + file)];
  for (const file of files) {
    const html = read(file);
    for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
      if (/application\/ld\+json/.test(match[1])) JSON.parse(match[2]);
      else if (!/\btype=['"]module['"]/.test(match[1])) new vm.Script(match[2], { filename: file });
    }
  }
});
