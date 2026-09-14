#!/usr/bin/env node
// Run after installing dependencies: node scripts/test-question-integrity.mjs
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, copyFileSync, rmSync } from "node:fs";
import { resolve, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import ts from "typescript";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cache = new Map();
// Load pure question modules with TypeScript's compiler; no browser/framework needed.
function load(path) {
  if (!extname(path)) path += ".ts";
  if (cache.has(path)) return cache.get(path).exports;
  if (path.endsWith(".json")) return JSON.parse(readFileSync(path, "utf8"));
  const module = { exports: {} };
  cache.set(path, module);
  const code = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const nativeRequire = createRequire(path);
  new Function("require", "module", "exports", code)(
    name => name.startsWith(".") ? load(resolve(dirname(path), name)) : nativeRequire(name),
    module, module.exports,
  );
  return module.exports;
}
const { deterministicDistractors } = load(resolve(root, "lib/question-metadata.ts"));
const candidates = ["答案", "甲", "甲", "乙", "丙", "丁"];
const options = deterministicDistractors(candidates, "答案", "seed");
assert.equal(new Set(options).size, 3);
assert(!options.includes("答案"));
assert.deepEqual(options, deterministicDistractors([...candidates].reverse(), "答案", "seed"));
const bank = load(resolve(root, "lib/questions.ts"));
for (const question of [...bank.expandedQuestions, ...bank.heritageExpandedQuestions]) {
  assert.equal(question.options.length, 4, question.id);
  assert.equal(new Set(question.options).size, 4, question.id);
}
const quarantined = bank.heritageExpandedQuestions.filter(q =>
  q.questionType === "capital" || q.questionType === "reverse-capital");
assert(quarantined.length > 0);
assert(quarantined.every(q => q.auditStatus === "disabled"));
assert(!bank.approvedQuestions.some(q => quarantined.includes(q)));
const { getLandmarkImage } = load(resolve(root, "lib/landmark-images.ts"));
assert.equal(getLandmarkImage("黃金博物館"), undefined);

const fixture = mkdtempSync(resolve(tmpdir(), "question-integrity-"));
try {
  mkdirSync(resolve(fixture, "scripts"));
  mkdirSync(resolve(fixture, "data"));
  copyFileSync(resolve(root, "scripts/audit-questions.mjs"), resolve(fixture, "scripts/audit-questions.mjs"));
  const audit = '{"overrides":{"manual":{"auditStatus":"disabled"}}}\n';
  writeFileSync(resolve(fixture, "data/question-audit.json"), audit);
  for (const [options, expectedStatus] of [[["是", "否"], 0], [["是", "是"], 1]]) {
    writeFileSync(resolve(fixture, "data/questions.json"), JSON.stringify({
      warmupQuestions: [{ q: "test", fact: "test", kind: "tf", options, answer: 0 }],
    }));
    const result = spawnSync(process.execPath, [resolve(fixture, "scripts/audit-questions.mjs"), "--write"], { encoding: "utf8" });
    assert.equal(result.status, expectedStatus, result.stderr);
    assert.equal(readFileSync(resolve(fixture, "data/question-audit.json"), "utf8"), audit);
    const report = JSON.parse(readFileSync(resolve(fixture, "data/question-structure-report.json"), "utf8"));
    assert.equal("overrides" in report, false);
  }
} finally {
  rmSync(fixture, { recursive: true, force: true });
}
console.log(`PASS: unique generated options, ${quarantined.length} quarantined capital rows, wrong image removed, audit preservation and failure exit.`);
