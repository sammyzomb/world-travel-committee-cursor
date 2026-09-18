#!/usr/bin/env node
/**
 * 匯出遊戲實際使用的題庫（暖身題 + 已核准題）至 exports/。
 *
 * Usage:
 *   npm run export:question-bank
 *   npm run export:question-bank -- --format=csv
 *   npm run export:question-bank -- --format=both
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { QUESTION_BANK_VERSION } from "../lib/question-bank-version.ts";
import { approvedQuestions, questionBankStats, warmupQuestions } from "../lib/questions.ts";

const root = resolve(import.meta.dirname, "..");
const exportsDir = resolve(root, "exports");
const formatArg = process.argv.find((arg) => arg.startsWith("--format="));
const format = formatArg?.split("=")[1] ?? "json";

function serializeQuestion(item) {
  return {
    id: item.id,
    conceptId: item.conceptId,
    auditStatus: item.auditStatus,
    source: item.source,
    grades: item.grades,
    level: item.level,
    region: item.region,
    category: item.category ?? null,
    questionType: item.questionType,
    kind: item.kind ?? null,
    q: item.q,
    options: item.options,
    answer: item.answer,
    correctAnswer: item.options[item.answer] ?? "",
    fact: item.fact,
    landmark: item.visual?.label ?? null,
    landmarkDetail: item.visual?.detail ?? null,
    imageSrc: item.visual?.src ?? null,
  };
}

function toCsvRow(values) {
  return values
    .map((value) => {
      const text = value == null ? "" : String(value);
      if (/[",\n\r]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`;
      }
      return text;
    })
    .join(",");
}

function exportJson() {
  const payload = {
    exportedAt: new Date().toISOString(),
    questionBankVersion: QUESTION_BANK_VERSION,
    stats: questionBankStats,
    warmupQuestions: warmupQuestions.map(serializeQuestion),
    approvedQuestions: approvedQuestions.map(serializeQuestion),
  };
  const path = resolve(exportsDir, "question-bank-approved.json");
  writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return path;
}

function exportCsv() {
  const rows = [...warmupQuestions, ...approvedQuestions].map(serializeQuestion);
  const headers = [
    "id",
    "conceptId",
    "auditStatus",
    "source",
    "grades",
    "level",
    "region",
    "category",
    "questionType",
    "kind",
    "q",
    "option1",
    "option2",
    "option3",
    "option4",
    "answerIndex",
    "correctAnswer",
    "fact",
    "landmark",
    "landmarkDetail",
    "imageSrc",
  ];
  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      toCsvRow([
        row.id,
        row.conceptId,
        row.auditStatus,
        row.source,
        row.grades.join("|"),
        row.level,
        row.region,
        row.category,
        row.questionType,
        row.kind,
        row.q,
        row.options[0] ?? "",
        row.options[1] ?? "",
        row.options[2] ?? "",
        row.options[3] ?? "",
        row.answer,
        row.correctAnswer,
        row.fact,
        row.landmark,
        row.landmarkDetail,
        row.imageSrc,
      ]),
    ),
  ];
  const path = resolve(exportsDir, "question-bank-approved.csv");
  writeFileSync(path, `${lines.join("\n")}\n`, "utf8");
  return path;
}

mkdirSync(exportsDir, { recursive: true });

const written = [];
if (format === "csv") {
  written.push(exportCsv());
} else if (format === "both") {
  written.push(exportJson(), exportCsv());
} else {
  written.push(exportJson());
}

console.log(
  `Exported ${warmupQuestions.length} warmup + ${approvedQuestions.length} approved questions.`,
);
console.log(`Question bank version: ${QUESTION_BANK_VERSION}`);
for (const path of written) {
  console.log(path);
}
