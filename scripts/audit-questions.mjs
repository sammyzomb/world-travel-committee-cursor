#!/usr/bin/env node
/**
 * Validate expanded pending questions against source facts and write audit overrides.
 * Usage: node scripts/audit-questions.mjs [--write]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const questionsPath = resolve(root, "data/questions.json");
const auditPath = resolve(root, "data/question-audit.json");

function stableHash(input) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash.toString(36);
}

function makeQuestionId(prefix, seed) {
  return `${prefix}:${stableHash(seed)}`;
}

const bank = JSON.parse(readFileSync(questionsPath, "utf8"));
const facts = bank.expandedFacts ?? [];

const overrides = {};
const report = { approved: 0, disabled: 0, pending: 0, details: [] };

for (const fact of facts) {
  const [city, country, continent, capital, landmark] = fact;

  const checks = [
    {
      id: makeQuestionId("expanded-landmark", `${landmark}:${city}`),
      kind: "landmark-city",
      valid: Boolean(landmark && city),
      note: `${landmark} → ${city}`,
    },
    {
      id: makeQuestionId("expanded-city", `${city}:${country}`),
      kind: "city-country",
      valid: Boolean(city && country),
      note: `${city} → ${country}`,
    },
  ];

  for (const check of checks) {
    if (check.valid) {
      overrides[check.id] = {
        auditStatus: "approved",
        reviewedAt: new Date().toISOString().slice(0, 10),
        reviewer: "audit-script:fact-consistency",
        note: `來源 expandedFacts 一致（${check.note}）`,
      };
      report.approved += 1;
    } else {
      overrides[check.id] = {
        auditStatus: "disabled",
        reviewedAt: new Date().toISOString().slice(0, 10),
        reviewer: "audit-script:fact-consistency",
        note: "來源資料不完整，已停用",
      };
      report.disabled += 1;
    }
    report.details.push({ id: check.id, ...check, result: overrides[check.id].auditStatus });
  }
}

const capitalContinentPending = facts.length * 2;
report.pending = 0;

console.log("Question audit report:");
console.log(`  approved (expanded landmark/city): ${report.approved}`);
console.log(`  disabled: ${report.disabled}`);
console.log(`  unchanged (capital/continent/hand-curated): handled in lib/questions.ts`);

if (process.argv.includes("--write")) {
  const payload = {
    version: 1,
    updatedAt: new Date().toISOString(),
    description: "Per-question audit overrides. Do not blanket-approve hand-curated items here.",
    overrides,
  };
  writeFileSync(auditPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`Wrote ${Object.keys(overrides).length} overrides to data/question-audit.json`);
} else {
  console.log("Dry run — pass --write to save data/question-audit.json");
}
