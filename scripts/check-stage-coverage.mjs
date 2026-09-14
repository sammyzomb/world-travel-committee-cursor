#!/usr/bin/env node
/**
 * 嚴格抽題覆蓋率：多種子、重玩情境、規則符合性與缺口範圍。
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
import { resetGameRandom, setGameRandomSeed } from "../lib/game-random.ts";
import { buildPlayableRunPlan } from "../lib/run-plan.ts";
import { getStageIndex, isGraduationStage } from "../lib/game-round.ts";
import {
  auditQuestionForStage,
  questionMatchesStageRules,
} from "../lib/stage-eligibility.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SEEDS = [1, 7, 42, 99, 2026];

function analyzePlan(plan) {
  const ruleViolations = [];
  for (let index = 0; index < plan.questions.length; index += 1) {
    const stageIndex = getStageIndex(plan.stageStarts, index);
    const violation = auditQuestionForStage(plan.questions[index], stageIndex);
    if (violation) ruleViolations.push(violation);
  }
  return ruleViolations;
}

function simulateSeed(seed, avoidQuestionIds = [], avoidConceptIds = []) {
  setGameRandomSeed(seed);
  const playable = buildPlayableRunPlan(avoidQuestionIds, avoidConceptIds);
  resetGameRandom();
  const confirmedGaps = playable.gaps.filter((gap) => gap.kind === "confirmed_gap");
  const notSimulated = playable.gaps.filter((gap) => gap.kind === "not_simulated");
  const ruleViolations = playable.plan ? analyzePlan(playable.plan) : [];
  return {
    seed,
    playableStageCount: playable.playableStageCount,
    totalQuestions: playable.totalQuestions,
    completeThroughFinal: playable.completeThroughFinal,
    confirmedGaps,
    notSimulated,
    ruleViolations,
    firstConfirmedGapStage: confirmedGaps[0]?.stageIndex ?? null,
  };
}

const seedResults = SEEDS.map((seed) => simulateSeed(seed));
const replay = simulateSeed(42, ["hand:ybriou"], ["fact:富士山"]);

const gapRange = {
  minPlayableStages: Math.min(...seedResults.map((item) => item.playableStageCount)),
  maxPlayableStages: Math.max(...seedResults.map((item) => item.playableStageCount)),
  minQuestions: Math.min(...seedResults.map((item) => item.totalQuestions)),
  maxQuestions: Math.max(...seedResults.map((item) => item.totalQuestions)),
  firstGapStages: [...new Set(seedResults.map((item) => item.firstConfirmedGapStage).filter((item) => item !== null))],
};

const representative = seedResults[0];
const report = {
  version: 3,
  generatedAt: new Date().toISOString(),
  seeds: SEEDS,
  summary: {
    seedRuns: seedResults.length,
    gapRange,
    replayPlayableStages: replay.playableStageCount,
    ruleViolations: seedResults.every((item) => item.ruleViolations.length === 0),
    allComplete: seedResults.every((item) => item.completeThroughFinal),
    fallbackBypassCount: 0,
  },
  seedResults,
  replayAvoidance: replay,
  inventory: educationStages.map((stage, stageIndex) => ({
    stageIndex,
    grade: stage.name,
    questionsRequired: questionsPerStage(stageIndex),
    graduation: isGraduationStage(stageIndex),
  })),
};

writeFileSync(resolve(root, "data/stage-coverage-report.json"), JSON.stringify(report, null, 2) + "\n");

console.log(JSON.stringify(report.summary, null, 2));
if (!report.summary.allComplete) {
  console.log("\n缺口範圍（多種子）：");
  console.log(
    `  可玩學級 ${gapRange.minPlayableStages}～${gapRange.maxPlayableStages}；首個確認缺口出現在 stage ${gapRange.firstGapStages.join(", ") || "無"}`,
  );
  for (const result of seedResults) {
    if (result.confirmedGaps.length === 0) continue;
    const gap = result.confirmedGaps[0];
    console.log(
      `  seed ${result.seed}: ${gap.grade} 缺 ${gap.shortfall} 題（${gap.drawn}/${gap.required}）`,
    );
  }
}

assert.equal(
  seedResults.every((item) => item.ruleViolations.length === 0),
  true,
  "drawn questions must match stage rules",
);

if (!report.summary.allComplete) {
  console.error("\nStage coverage reports confirmed gaps (not masked).");
  process.exitCode = 1;
} else {
  console.log("\nStage coverage check passed.");
}
