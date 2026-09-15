#!/usr/bin/env node
/**
 * 題庫去重：每個知識點只保留一題 approved，其餘寫入 question-audit.json 為 disabled。
 *
 * 去重鍵：
 * - capital / reverse-capital / continent / travel / world-fact / tf → questionType + conceptId
 * - 其他題型 → questionType + 題幹（避免不同城市被誤併）
 *
 * 用法：
 *   npm run dedupe:question-bank
 *   npm run dedupe:question-bank -- --dry-run
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { allQuestions } from "../lib/questions.ts";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const auditPath = resolve(root, "data/question-audit.json");

const LEVEL_RANK = {
  旅行新手: 0,
  城市旅人: 1,
  國家達人: 2,
  洲際領隊: 3,
  環球旅行家: 4,
};

const SOURCE_RANK = {
  supplement: 6,
  hand: 5,
  heritage: 4,
  travel: 4,
  tour: 3,
  expanded: 2,
  warmup: 1,
};

function parseArgs(argv) {
  return { dryRun: argv.includes("--dry-run") };
}

function sourceRank(question) {
  const id = question.id;
  if (id.startsWith("supplement:")) return SOURCE_RANK.supplement;
  if (id.startsWith("hand:")) return SOURCE_RANK.hand;
  if (id.startsWith("heritage")) return SOURCE_RANK.heritage;
  if (id.startsWith("travel:")) return SOURCE_RANK.travel;
  if (id.startsWith("tour:")) return SOURCE_RANK.tour;
  if (id.startsWith("warmup:")) return SOURCE_RANK.warmup;
  return SOURCE_RANK.expanded;
}

function dedupeKey(question) {
  if (
    ["capital", "reverse-capital", "continent", "travel", "world-fact", "tf"].includes(
      question.questionType,
    )
  ) {
    return `${question.questionType}|${question.conceptId}`;
  }
  return `${question.questionType}|${question.q.trim()}`;
}

function scoreKeeper(question) {
  let score = sourceRank(question) * 100;
  score += (LEVEL_RANK[question.level] ?? 0) * 5;
  if (question.visual?.type === "photo") score += 20;
  if (question.visual) score += 5;
  if (question.auditStatus === "approved") score += 3;
  score += Math.min(question.q.length, 80) / 80;
  return score;
}

function pickKeeper(questions) {
  return [...questions].sort((left, right) => scoreKeeper(right) - scoreKeeper(left))[0];
}

function loadAuditFile() {
  if (!existsSync(auditPath)) {
    return { version: 1, updatedAt: new Date().toISOString(), description: "", overrides: {} };
  }
  return JSON.parse(readFileSync(auditPath, "utf8"));
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const approved = allQuestions.filter((item) => item.auditStatus === "approved");
  const byKey = new Map();

  for (const question of approved) {
    const key = dedupeKey(question);
    const list = byKey.get(key) ?? [];
    list.push(question);
    byKey.set(key, list);
  }

  const duplicateGroups = [...byKey.entries()].filter(([, questions]) => questions.length > 1);
  const audit = loadAuditFile();
  const overrides = { ...audit.overrides };
  const disabled = [];
  const kept = [];

  for (const [key, questions] of duplicateGroups) {
    const keeper = pickKeeper(questions);
    kept.push({ key, keeperId: keeper.id, dropped: questions.length - 1 });
    for (const question of questions) {
      if (question.id === keeper.id) continue;
      disabled.push({
        id: question.id,
        conceptId: question.conceptId,
        questionType: question.questionType,
        q: question.q,
        keeperId: keeper.id,
      });
      overrides[question.id] = {
        auditStatus: "disabled",
        reviewedAt: new Date().toISOString().slice(0, 10),
        reviewer: "dedupe-question-bank",
        note: `與 ${keeper.id} 重複（${key}）`,
      };
    }
  }

  const summary = {
    dryRun: options.dryRun,
    approvedBefore: approved.length,
    duplicateGroups: duplicateGroups.length,
    disabledCount: disabled.length,
    approvedAfterEstimate: approved.length - disabled.length,
    topDropped: [...duplicateGroups]
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 8)
      .map(([key, questions]) => ({
        key,
        count: questions.length,
        keeperId: pickKeeper(questions).id,
      })),
  };

  console.log(JSON.stringify(summary, null, 2));

  if (!options.dryRun) {
    audit.updatedAt = new Date().toISOString();
    audit.description =
      "Per-question audit overrides. Hand/travel/tour default pending until validated here.";
    audit.overrides = overrides;
    writeFileSync(auditPath, `${JSON.stringify(audit, null, 2)}\n`, "utf8");
    console.log(`Updated ${auditPath}`);
  }
}

main();
