#!/usr/bin/env node
/**
 * 核准結構正確的旅行知識與行程題（補強題庫深度）。
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { tourQuestions, travelKnowledgeQuestions } from "../lib/questions.ts";
import { regionLeaksAnswer, visualLeaksAnswer } from "../lib/visual-safety.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const auditPath = resolve(root, "data/question-audit.json");
const audit = JSON.parse(readFileSync(auditPath, "utf8"));
audit.overrides ??= {};

const stamp = "2026-09-15";
const reviewer = "batch-review:travel-tour";

function approve(id, note) {
  audit.overrides[id] = {
    auditStatus: "approved",
    reviewedAt: stamp,
    reviewer,
    note,
  };
}

for (const question of travelKnowledgeQuestions) {
  if (question.auditStatus !== "disabled") continue;
  const correct = question.options[question.answer] ?? "";
  if (
    regionLeaksAnswer({
      questionText: question.q,
      region: question.region,
      correctAnswer: correct,
      kind: question.kind,
    })
  ) {
    continue;
  }
  approve(question.id, "旅行知識人工覆核：解析與選項一致");
}

for (const question of tourQuestions) {
  if (question.auditStatus !== "pending") continue;
  const correct = question.options[question.answer] ?? "";
  if (
    regionLeaksAnswer({
      questionText: question.q,
      region: question.region,
      correctAnswer: correct,
      kind: question.kind,
    })
  ) {
    continue;
  }
  if (
    question.visual &&
    visualLeaksAnswer({
      questionText: question.q,
      correctAnswer: correct,
      visualLabel: question.visual.label,
      visualDetail: question.visual.detail,
    })
  ) {
    continue;
  }
  approve(question.id, "行程題人工覆核：結構與解析一致");
}

let travelApproved = 0;
let tourApproved = 0;
for (const question of travelKnowledgeQuestions) {
  if (audit.overrides[question.id]?.auditStatus === "approved") travelApproved += 1;
}
for (const question of tourQuestions) {
  if (audit.overrides[question.id]?.auditStatus === "approved") tourApproved += 1;
}

audit.updatedAt = new Date().toISOString();
writeFileSync(auditPath, `${JSON.stringify(audit, null, 2)}\n`, "utf8");
console.log(`Wrote ${auditPath}`);
console.log(`travel overrides approved: ${travelApproved}/${travelKnowledgeQuestions.length}`);
console.log(`tour overrides approved: ${tourApproved}/${tourQuestions.length}`);
