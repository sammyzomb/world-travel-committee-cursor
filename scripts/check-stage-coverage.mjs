#!/usr/bin/env node
/**
 * 檢查各年級可抽取的不重複知識點是否足夠，並模擬整局抽題能否破關。
 */
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  educationStages,
  FINAL_STAGE_INDEX,
  questionsPerStage,
} from "../lib/game-config.ts";
import {
  allowedTypesForStage,
  includesTravelKnowledge,
  minQuestionLevelRankForStage,
  minTypeRankForStage,
  QUESTION_TYPE_RANK,
  difficultyRankForLevel,
} from "../lib/question-types.ts";
import {
  approvedQuestions,
  travelKnowledgeQuestions,
  warmupQuestions,
} from "../lib/questions.ts";
import {
  appendNextStage,
  canDrawNextStage,
  createRound,
  isGraduationStage,
} from "../lib/game-round.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function filterPoolForStage(pool, stageIndex) {
  const allowedTypes = new Set(allowedTypesForStage(stageIndex));
  const minTypeRank = minTypeRankForStage(stageIndex);
  const minLevelRank = minQuestionLevelRankForStage(stageIndex);
  return pool.filter((item) => {
    if (!allowedTypes.has(item.questionType)) return false;
    const typeRank = QUESTION_TYPE_RANK[item.questionType];
    const levelRank = difficultyRankForLevel(item.level);
    if (levelRank < minLevelRank) return false;
    if (typeRank + levelRank * 0.3 < minTypeRank - 0.5) return false;
    return true;
  });
}

function eligibleConceptsForStage(stageIndex) {
  if (stageIndex === 0) {
    const warmupConcepts = new Set(
      warmupQuestions
        .filter((item) => item.auditStatus === "approved" && item.kind === "tf")
        .map((item) => item.conceptId),
    );
    const elementary = approvedQuestions.filter(
      (item) => item.level === "旅行新手" && item.kind !== "tf",
    );
    const poolConcepts = new Set(elementary.map((item) => item.conceptId));
    return { warmupConcepts, poolConcepts, combined: new Set([...warmupConcepts, ...poolConcepts]) };
  }

  const stage = educationStages[stageIndex];
  const levelPool = approvedQuestions.filter((item) => stage.pool.includes(item.level));
  const travelPool = includesTravelKnowledge(stageIndex)
    ? travelKnowledgeQuestions.filter((item) => item.auditStatus === "approved")
    : [];
  const stagePool = travelPool.length > 0 ? [...levelPool, ...travelPool] : levelPool;
  const filtered = filterPoolForStage(stagePool, stageIndex);
  const concepts = new Set(filtered.map((item) => item.conceptId));
  return { warmupConcepts: new Set(), poolConcepts: concepts, combined: concepts };
}

function stageQuestionCount(plan, stageIndex) {
  const start = plan.stageStarts[stageIndex];
  if (start === undefined) return 0;
  const end = plan.stageStarts[stageIndex + 1] ?? plan.questions.length;
  return end - start;
}

function simulateFullRun() {
  let plan = createRound([], []);
  const stages = [];
  for (let stageIndex = 0; stageIndex <= FINAL_STAGE_INDEX; stageIndex += 1) {
    const expected = questionsPerStage(stageIndex);
    const actual = stageQuestionCount(plan, stageIndex);
    if (stageIndex > 0 && actual === 0) {
      stages.push({
        stageIndex,
        name: educationStages[stageIndex].name,
        expected,
        actual: 0,
        ok: false,
        graduation: isGraduationStage(stageIndex),
      });
      break;
    }
    stages.push({
      stageIndex,
      name: educationStages[stageIndex].name,
      expected,
      actual,
      ok: (stageIndex === 0 ? plan.questions.length : actual) >= expected,
      graduation: isGraduationStage(stageIndex),
      canContinue:
        stageIndex < FINAL_STAGE_INDEX
          ? canDrawNextStage(plan, stageIndex + 1)
          : false,
    });
    if (stageIndex >= FINAL_STAGE_INDEX) break;
    const next = appendNextStage(plan, stageIndex + 1);
    if (!next || next.exhausted) break;
    plan = next;
  }
  return { plan, stages };
}

const inventory = [];
const gaps = [];

for (let stageIndex = 0; stageIndex <= FINAL_STAGE_INDEX; stageIndex += 1) {
  const expected = questionsPerStage(stageIndex);
  const { combined } = eligibleConceptsForStage(stageIndex);
  const available = combined.size;
  const warmupNeeded = stageIndex === 0 ? 2 : 0;
  const formalNeeded = expected - warmupNeeded;
  const ok = available >= expected;
  const row = {
    stageIndex,
    grade: educationStages[stageIndex].name,
    group: educationStages[stageIndex].group,
    questionsRequired: expected,
    distinctConcepts: available,
    sufficient: ok,
    graduation: isGraduationStage(stageIndex),
  };
  inventory.push(row);
  if (!ok) {
    gaps.push({
      ...row,
      shortfall: expected - available,
      note: stageIndex === 0
        ? "暖身＋正式題知識點不足"
        : "該年級 pool 內不重複知識點不足",
    });
  }
}

const simulation = simulateFullRun();
const runGaps = simulation.stages.filter((item) => !item.ok);

const report = {
  version: 1,
  generatedAt: new Date().toISOString(),
  summary: {
    stages: educationStages.length,
    maxRunQuestions: simulation.plan.questions.length,
    inventoryGaps: gaps.length,
    simulationGaps: runGaps.length,
    canCompleteFullRun: runGaps.length === 0 && simulation.stages.length === educationStages.length,
  },
  inventory,
  gaps,
  simulation: simulation.stages,
};

writeFileSync(resolve(root, "data/stage-coverage-report.json"), JSON.stringify(report, null, 2) + "\n");

console.log(JSON.stringify(report.summary, null, 2));
if (gaps.length > 0) {
  console.log("\n知識點缺口：");
  for (const gap of gaps) {
    console.log(`  ${gap.grade}: 需要 ${gap.questionsRequired}，可用 ${gap.distinctConcepts}（缺 ${gap.shortfall}）`);
  }
}
if (runGaps.length > 0) {
  console.log("\n抽題模擬缺口：");
  for (const gap of runGaps) {
    console.log(`  ${gap.name}: 需要 ${gap.expected}，實際 ${gap.actual}`);
  }
}

assert.equal(gaps.length, 0, "each stage must have enough distinct concepts");
assert.equal(runGaps.length, 0, "full run simulation must draw every stage");
assert.equal(simulation.stages.length, educationStages.length, "simulation must reach all grades");
console.log("\nStage coverage check passed.");
