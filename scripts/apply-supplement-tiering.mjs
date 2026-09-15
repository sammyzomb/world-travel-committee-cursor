#!/usr/bin/env node
/**
 * 依方法 C 分層策略，為 supplementQuestions 設定 grades 與 level。
 *
 * 用法：
 *   npm run apply:supplement-tiering
 *   npm run apply:supplement-tiering -- --dry-run
 *   npm run apply:supplement-tiering -- --sync-batches
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const questionsPath = resolve(root, "data/questions.json");
const dataDir = resolve(root, "data");

const LEVELS = ["旅行新手", "城市旅人", "國家達人", "洲際領隊", "環球旅行家"];
const LEVEL_RANK = Object.fromEntries(LEVELS.map((level, index) => [level, index]));

const HIGH_SCHOOL_PLUS = ["高三", "大一", "大二", "大三", "大四", "研一", "研二"];
const JUNIOR_HIGH_PLUS = ["國三", "高一", "高二", "高三", "大一", "大二", "大三", "大四", "研一", "研二"];
const ALL_GRADES = [
  "小一", "小二", "小三", "小四", "小五", "小六",
  "國一", "國二", "國三", "高一", "高二", "高三",
  "大一", "大二", "大三", "大四", "研一", "研二",
];

function parseArgs(argv) {
  return {
    dryRun: argv.includes("--dry-run"),
    syncBatches: argv.includes("--sync-batches"),
  };
}

function batchNumber(batchId) {
  const match = batchId?.match(/supplement-batch(\d+)/);
  return match ? Number(match[1]) : null;
}

function isHighSchoolOnlyBatch(batchNum) {
  return batchNum !== null && batchNum >= 1 && batchNum <= 3;
}

function isTravelSafetyConcept(conceptId) {
  return conceptId?.startsWith("fact:safety:");
}

function tierForQuestion(item) {
  const batchNum = batchNumber(item.batchId);
  const type = item.questionType;

  if (isHighSchoolOnlyBatch(batchNum)) {
    return {
      tier: "high-school-only",
      grades: HIGH_SCHOOL_PLUS,
      minLevel: "環球旅行家",
      maxLevel: "環球旅行家",
    };
  }

  if (type === "world-fact" || batchNum === 12 || batchNum === 13) {
    return {
      tier: "natural-geo",
      grades: JUNIOR_HIGH_PLUS,
      minLevel: "洲際領隊",
      maxLevel: "環球旅行家",
    };
  }

  if (
    type === "travel" ||
    isTravelSafetyConcept(item.conceptId) ||
    batchNum === 14
  ) {
    return {
      tier: "travel-practical",
      grades: JUNIOR_HIGH_PLUS,
      minLevel: "洲際領隊",
      maxLevel: "洲際領隊",
    };
  }

  if (type === "capital" || type === "reverse-capital" || type === "landmark-city") {
    return {
      tier: "landmark-capital",
      grades: [],
      minLevel: "國家達人",
      maxLevel: "環球旅行家",
    };
  }

  return {
    tier: "general",
    grades: [],
    minLevel: "國家達人",
    maxLevel: "環球旅行家",
  };
}

function clampLevel(level, minLevel, maxLevel) {
  const rank = LEVEL_RANK[level] ?? LEVEL_RANK["國家達人"];
  const minRank = LEVEL_RANK[minLevel];
  const maxRank = LEVEL_RANK[maxLevel];
  const clamped = Math.min(Math.max(rank, minRank), maxRank);
  return LEVELS[clamped];
}

function gradesEqual(a, b) {
  if (a.length !== b.length) return false;
  return a.every((grade, index) => grade === b[index]);
}

function applyTier(item) {
  const { tier, grades, minLevel, maxLevel } = tierForQuestion(item);
  const nextLevel = clampLevel(item.level ?? "環球旅行家", minLevel, maxLevel);
  return {
    tier,
    grades,
    level: nextLevel,
    changed: !gradesEqual(item.grades ?? [], grades) || item.level !== nextLevel,
  };
}

function loadBatchFiles() {
  return readdirSync(dataDir)
    .filter((name) => name.includes("supplement-batch") && name.endsWith(".json"))
    .map((name) => resolve(dataDir, name));
}

function syncBatchFile(filePath, tierByBatchItemId, dryRun) {
  const batch = JSON.parse(readFileSync(filePath, "utf8"));
  if (!Array.isArray(batch.questions)) return { filePath, updated: 0 };

  let updated = 0;
  for (const question of batch.questions) {
    const tier = tierByBatchItemId.get(question.id);
    if (!tier) continue;
    const gradesChanged = !gradesEqual(question.grades ?? [], tier.grades);
    const levelChanged = question.level !== tier.level;
    if (!gradesChanged && !levelChanged) continue;
    question.grades = tier.grades;
    question.level = tier.level;
    updated += 1;
  }

  if (updated > 0 && !dryRun) {
    writeFileSync(filePath, `${JSON.stringify(batch, null, 2)}\n`, "utf8");
  }
  return { filePath, updated };
}

const options = parseArgs(process.argv.slice(2));
if (!existsSync(questionsPath)) {
  console.error(`Not found: ${questionsPath}`);
  process.exit(1);
}

const bank = JSON.parse(readFileSync(questionsPath, "utf8"));
const supplements = bank.supplementQuestions ?? [];
const tierByBatchItemId = new Map();
const summary = {
  total: supplements.length,
  changed: 0,
  byTier: {},
};

for (const item of supplements) {
  const applied = applyTier(item);
  summary.byTier[applied.tier] = (summary.byTier[applied.tier] ?? 0) + 1;

  if (item.batchId) {
    tierByBatchItemId.set(item.batchId, {
      grades: applied.grades,
      level: applied.level,
    });
  }

  if (applied.changed) {
    summary.changed += 1;
    item.grades = applied.grades;
    item.level = applied.level;
  }
}

if (!options.dryRun && summary.changed > 0) {
  writeFileSync(questionsPath, `${JSON.stringify(bank, null, 2)}\n`, "utf8");
}

console.log(
  JSON.stringify(
    {
      dryRun: options.dryRun,
      changed: summary.changed,
      total: summary.total,
      byTier: summary.byTier,
      gradesPolicy: {
        "high-school-only": "高三～研二",
        "natural-geo": "國三～研二",
        "travel-practical": "國三～研二",
        "landmark-capital": "全年級（依題型門檻）",
      },
      levelPolicy: {
        "high-school-only": "環球旅行家",
        "natural-geo": "洲際領隊～環球旅行家",
        "travel-practical": "洲際領隊（國三主戰場；高一+仍用環球旅行家原題）",
        "landmark-capital": "國家達人起",
      },
    },
    null,
    2,
  ),
);

if (options.syncBatches) {
  const batchResults = loadBatchFiles().map((filePath) =>
    syncBatchFile(filePath, tierByBatchItemId, options.dryRun),
  );
  const batchUpdated = batchResults.reduce((sum, item) => sum + item.updated, 0);
  console.log(
    JSON.stringify(
      {
        syncBatches: true,
        batchFilesUpdated: batchUpdated,
        details: batchResults.filter((item) => item.updated > 0),
      },
      null,
      2,
    ),
  );
}

if (options.dryRun) {
  console.log("[dry-run] No files written.");
} else if (summary.changed > 0) {
  console.log(`Updated ${questionsPath}`);
}
