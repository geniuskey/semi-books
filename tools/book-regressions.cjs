#!/usr/bin/env node
/* Copyright (c) 2026 geniuskey and SemiBooks contributors. SPDX-License-Identifier: MIT */
// 각 책의 Node 회귀 스크립트(<책>/tools/factcheck-regression.cjs, <책>/scripts/*.cjs)를 모두 실행한다.
// 브라우저(Playwright) 검사인 <책>/tools/check.* 는 CI에서 풀리지 않으므로 넣지 않는다.
"use strict";
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const BOOKS = JSON.parse(fs.readFileSync(path.join(ROOT, "book.json"), "utf8")).books.map((p) => path.dirname(p));
const scripts = [];
for (const book of BOOKS) {
  const tool = path.join(book, "tools", "factcheck-regression.cjs");
  if (fs.existsSync(path.join(ROOT, tool))) scripts.push(tool);
  const dir = path.join(ROOT, book, "scripts");
  if (fs.existsSync(dir)) for (const f of fs.readdirSync(dir).sort()) if (f.endsWith(".cjs")) scripts.push(path.join(book, "scripts", f));
}
let failed = 0;
for (const rel of scripts) {
  const r = spawnSync(process.execPath, [rel], { cwd: ROOT, encoding: "utf8" });
  if (r.status === 0) console.log(`ok   ${rel}`);
  else { failed++; console.log(`FAIL ${rel}\n${(r.stderr || r.stdout).trim().split("\n").slice(0, 12).join("\n")}`); }
}
console.log(`${scripts.length - failed}/${scripts.length} book regressions passed`);
process.exit(failed ? 1 : 0);
