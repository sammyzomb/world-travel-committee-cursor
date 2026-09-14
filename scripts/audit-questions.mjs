#!/usr/bin/env node
/**
 * Structural checks only. Never grants factual approval or changes question-audit.json.
 * Usage: node scripts/audit-questions.mjs [--write]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const bank = JSON.parse(readFileSync(resolve(root, "data/questions.json"), "utf8"));
const findings = [];
let checked = 0;
function issue(path, severity, message) {
  findings.push({ path, severity, message });
}
for (const group of ["warmupQuestions", "questions", "travelKnowledgeQuestions", "tourQuestions", "heritageQuestions"]) {
  for (const [index, raw] of (bank[group] ?? []).entries()) {
    checked++;
    const path = `${group}[${index}]`;
    if (!raw || typeof raw.q !== "string" || !raw.q.trim() || typeof raw.fact !== "string" || !raw.fact.trim()) {
      issue(path, "error", "Missing question or explanation");
    }
    if (!Array.isArray(raw?.options) || raw.options.length < 2 ||
        raw.options.some(value => typeof value !== "string" || !value.trim())) {
      issue(path, "error", "At least two nonempty string options required");
      continue;
    }
    if (!Number.isInteger(raw.answer) || raw.answer < 0 || raw.answer >= raw.options.length) {
      issue(path, "error", "Invalid answer index");
    }
    if (new Set(raw.options.map(value => value.trim())).size !== raw.options.length) {
      issue(path, "error", "Duplicate options");
    }
    if (raw.kind === "tf" && raw.options.length !== 2) {
      issue(path, "error", "True/false questions require two options");
    }
    if (raw.kind !== "tf" && typeof raw.fact === "string" &&
        !raw.fact.includes(raw.options[raw.answer])) {
      issue(path, "warning", "Explanation needs human review; text matching cannot verify facts");
    }
  }
}
for (const group of ["expandedFacts", "heritageFacts"]) {
  for (const [index, row] of (bank[group] ?? []).entries()) {
    checked++;
    if (!Array.isArray(row) || row.length !== 5 ||
        row.some(value => typeof value !== "string" || !value.trim())) {
      issue(`${group}[${index}]`, "error", "Expected five nonempty fact fields");
    }
  }
}
const report = {
  version: 1,
  scope: "Source structure only; no factual, generated-option, image, or gameplay approval",
  checked,
  errors: findings.filter(item => item.severity === "error").length,
  warnings: findings.filter(item => item.severity === "warning").length,
  findings,
};
console.log(JSON.stringify(report, null, 2));
if (process.argv.includes("--write")) {
  writeFileSync(resolve(root, "data/question-structure-report.json"), JSON.stringify(report, null, 2) + "\n");
}
if (report.errors > 0) process.exitCode = 1;
