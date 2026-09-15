#!/usr/bin/env node
/**
 * 將 data/stage-11-17-supplement-batch*.json 轉換並合併至 questions.json 的 supplementQuestions。
 *
 * 用法：
 *   npm run import:supplement-batch
 *   npm run import:supplement-batch -- --dry-run
 *   npm run import:supplement-batch -- --file data/stage-11-17-supplement-batch1.json
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const questionsPath = resolve(root, "data/questions.json");
const defaultBatchPath = resolve(root, "data/stage-11-17-supplement-batch1.json");

function parseArgs(argv) {
  const options = { dryRun: false, file: defaultBatchPath };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--file") options.file = resolve(root, argv[++index]);
  }
  return options;
}

function resolveQuestionType(batchType, q) {
  switch (batchType) {
    case "地標定位":
      if (q.includes("哪一座城市")) return "landmark-city";
      return "world-fact";
    case "首都定位":
      return "reverse-capital";
    case "首都記憶":
      return "capital";
    case "自然地理":
      return "world-fact";
    case "交通航運":
    case "旅行知識":
    case "旅遊安全":
      return "travel";
    default:
      return "world-fact";
  }
}

function landmarkFromConceptId(conceptId) {
  const match = conceptId.match(/^fact:(?:city|country):(.+)$/);
  return match?.[1] ?? null;
}

function landmarkDetailFromQuestion(item) {
  const landmark = landmarkFromConceptId(item.conceptId);
  if (!landmark) return undefined;
  const countryMatch = item.q.match(/位於(?:哪一個|哪一個|哪一個)?(.+?)(?:的|哪)/);
  if (countryMatch) {
    const hint = countryMatch[1].replace(/主要|著名|知名的?/g, "").trim();
    if (hint.length <= 12) return `${hint}・${landmark}`;
  }
  return `${item.region}・${landmark}`;
}

function convertBatchQuestion(item) {
  const answer =
    typeof item.answerIndex === "number"
      ? item.answerIndex
      : item.options.findIndex((option) => option === item.correctAnswer);
  if (answer < 0) {
    throw new Error(`${item.id}: unable to resolve answer index`);
  }

  const questionType = resolveQuestionType(item.questionType, item.q);
  const landmark = landmarkFromConceptId(item.conceptId);
  const raw = {
    level: item.level ?? "環球旅行家",
    region: item.region,
    category: item.category ?? "世界遺產",
    q: item.q,
    options: item.options,
    answer,
    fact: item.fact,
    conceptId: item.conceptId,
    questionType,
    batchId: item.id,
    sourceUrl: item.sourceUrl ?? null,
    ...(Array.isArray(item.grades) ? { grades: item.grades } : {}),
  };
  if (landmark && (questionType === "landmark-city" || item.category === "世界遺產")) {
    raw.landmark = landmark;
    raw.landmarkDetail = landmarkDetailFromQuestion(item);
  }
  return raw;
}

function loadExistingQuestions() {
  return JSON.parse(readFileSync(questionsPath, "utf8"));
}

function mergeSupplementQuestions(bank, incoming) {
  const existing = Array.isArray(bank.supplementQuestions) ? bank.supplementQuestions : [];
  const existingConcepts = new Set(existing.map((item) => item.conceptId));
  const existingQuestions = new Set(existing.map((item) => item.q));
  const added = [];
  const skipped = [];

  for (const item of incoming) {
    if (existingConcepts.has(item.conceptId) || existingQuestions.has(item.q)) {
      skipped.push(item.conceptId);
      continue;
    }
    added.push(item);
    existingConcepts.add(item.conceptId);
    existingQuestions.add(item.q);
  }

  return {
    nextBank: { ...bank, supplementQuestions: [...existing, ...added] },
    added,
    skipped,
  };
}

const options = parseArgs(process.argv.slice(2));
if (!existsSync(options.file)) {
  console.error(`Batch file not found: ${options.file}`);
  process.exit(1);
}

const batch = JSON.parse(readFileSync(options.file, "utf8"));
if (!Array.isArray(batch.questions) || batch.questions.length === 0) {
  console.error(`No questions in batch: ${options.file}`);
  process.exit(1);
}

const converted = batch.questions.map(convertBatchQuestion);
const bank = loadExistingQuestions();
const { nextBank, added, skipped } = mergeSupplementQuestions(bank, converted);

console.log(`Batch: ${basename(options.file)} (${batch.questions.length} items)`);
console.log(`Added: ${added.length}, skipped duplicates: ${skipped.length}`);

if (added.length > 0) {
  const typeCounts = added.reduce((counts, item) => {
    counts[item.questionType] = (counts[item.questionType] ?? 0) + 1;
    return counts;
  }, {});
  console.log("Question types:", typeCounts);
}

if (!options.dryRun && added.length > 0) {
  writeFileSync(questionsPath, `${JSON.stringify(nextBank, null, 2)}\n`, "utf8");
  console.log(`Updated ${questionsPath}`);
} else if (options.dryRun) {
  console.log("[dry-run] No files written.");
} else {
  console.log("Nothing to import.");
}
