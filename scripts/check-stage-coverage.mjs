#!/usr/bin/env node
/**
 * 檢查各年級可抽取的不重複知識點、嚴格抽題缺口，以及實際場次中每題是否符合當級規則。
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
import { buildFullRunPlan } from "../lib/run-plan.ts";
import { getStageIndex, isGraduationStage } from "../lib/game-round.ts";
import {
  auditQuestionForStage,
  questionMatchesStageRules,
} from "../lib/stage-eligibility.ts";

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
    return new Set([...warmupConcepts, ...poolConcepts]);
  }

  const stage = educationStages[stageIndex];
  const levelPool = approvedQuestions.filter((item) => stage.pool.includes(item.level));
  const travelPool = includesTravelKnowledge(stageIndex)
    ? travelKnowledgeQuestions.filter((item) => item.auditStatus === "approved")
    : [];
  const stagePool = travelPool.length > 0 ? [...levelPool, ...travelPool] : levelPool;
  const filtered = filterPoolForStage(stagePool, stageIndex);
  return new Set(filtered.map((item) => item.conceptId));
}

function stageQuestionCount(plan, stageIndex) {
  const start = plan.stageStarts[stageIndex];
  if (start === undefined) return 0;
  const end = plan.stageStarts[stageIndex + 1] ?? plan.questions.length;
  return end - start;
}

function analyzeRunPlan(plan) {
  const stageAudits = [];
  const ruleViolations = [];
  let fallbackCount = 0;

  for (let stageIndex = 0; stageIndex <= FINAL_STAGE_INDEX; stageIndex += 1) {
    const expected = questionsPerStage(stageIndex);
    const actual = stageQuestionCount(plan, stageIndex);
    const stageQuestions = plan.questions.filter(
      (_, index) => getStageIndex(plan.stageStarts, index) === stageIndex,
    );
    const violations = stageQuestions
      .map((question) => auditQuestionForStage(question, stageIndex))
      .filter(Boolean);
    ruleViolations.push(...violations);
    fallbackCount += violations.length;

    stageAudits.push({
      stageIndex,
      grade: educationStages[stageIndex].name,
      group: educationStages[stageIndex].group,
      questionsRequired: expected,
      questionsDrawn: actual,
      sufficient: actual >= expected,
      shortfall: actual < expected ? expected - actual : 0,
      distinctConceptsEligible: eligibleConceptsForStage(stageIndex).size,
      graduation: isGraduationStage(stageIndex),
      ruleViolations: violations,
      nonCompliantQuestionIds: violations.map((item) => item.questionId),
    });
  }

  return { stageAudits, ruleViolations, fallbackCount };
}

const inventory = [];
const conceptGaps = [];

for (let stageIndex = 0; stageIndex <= FINAL_STAGE_INDEX; stageIndex += 1) {
  const expected = questionsPerStage(stageIndex);
  const available = eligibleConceptsForStage(stageIndex).size;
  const sufficient = available >= expected;
  const row = {
    stageIndex,
    grade: educationStages[stageIndex].name,
    questionsRequired: expected,
    distinctConcepts: available,
    sufficient,
    graduation: isGraduationStage(stageIndex),
  };
  inventory.push(row);
  if (!sufficient) {
    conceptGaps.push({
      ...row,
      shortfall: expected - available,
      note: "嚴格 pool 內不重複知識點不足（未使用備援放寬）",
    });
  }
}

const plan = buildFullRunPlan([], []);
const { stageAudits, ruleViolations, fallbackCount } = analyzeRunPlan(plan);
const drawGaps = stageAudits.filter((item) => !item.sufficient);
const compliantQuestions = plan.questions.filter((question, index) =>
  questionMatchesStageRules(question, getStageIndex(plan.stageStarts, index)),
);

const report = {
  version: 2,
  generatedAt: new Date().toISOString(),
  summary: {
    stages: educationStages.length,
    maxRunQuestions: plan.questions.length,
    conceptInventoryGaps: conceptGaps.length,
    strictDrawGaps: drawGaps.length,
    ruleViolations: ruleViolations.length,
    fallbackBypassCount: fallbackCount,
    canCompleteFullRun:
      drawGaps.length === 0 &&
      ruleViolations.length === 0 &&
      plan.questions.length >= plan.stageStarts.length,
    compliantQuestionRatio: `${compliantQuestions.length}/${plan.questions.length}`,
  },
  inventory,
  conceptGaps,
  drawGaps,
  stageAudits,
  ruleViolations,
};

writeFileSync(resolve(root, "data/stage-coverage-report.json"), JSON.stringify(report, null, 2) + "\n");

console.log(JSON.stringify(report.summary, null, 2));
if (conceptGaps.length > 0) {
  console.log("\n知識點缺口（嚴格 pool）：");
  for (const gap of conceptGaps) {
    console.log(`  ${gap.grade}: 需要 ${gap.questionsRequired}，可用 ${gap.distinctConcepts}（缺 ${gap.shortfall}）`);
  }
}
if (drawGaps.length > 0) {
  console.log("\n抽題缺口（未放寬難度）：");
  for (const gap of drawGaps) {
    console.log(`  ${gap.grade}: 需要 ${gap.questionsRequired}，實際 ${gap.questionsDrawn}（缺 ${gap.shortfall}）`);
  }
}
if (ruleViolations.length > 0) {
  console.log("\n不符合當級規則的題目：");
  for (const violation of ruleViolations.slice(0, 10)) {
    console.log(`  ${violation.grade} / ${violation.questionId}: ${violation.reason}`);
  }
}

const expectedTotal = educationStages.reduce((sum, _, index) => sum + questionsPerStage(index), 0);
if (conceptGaps.length > 0 || drawGaps.length > 0 || ruleViolations.length > 0) {
  console.error("\nStage coverage check failed. See data/stage-coverage-report.json for details.");
  process.exitCode = 1;
} else {
  assert.equal(plan.questions.length, expectedTotal);
  console.log("\nStage coverage check passed.");
}
