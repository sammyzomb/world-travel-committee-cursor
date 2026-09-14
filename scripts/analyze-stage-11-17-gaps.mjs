#!/usr/bin/env node
/**
 * 高三～研二（stage 11-17）知識點缺口分析：整局去重後的可抽題量 vs 需求。
 */
import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { educationStages, FINAL_STAGE_INDEX, questionsPerStage } from "../lib/game-config.ts";
import { resetGameRandom, setGameRandomSeed } from "../lib/game-random.ts";
import { buildPlayableRunPlan } from "../lib/run-plan.ts";
import { appendNextStage, createRound } from "../lib/game-round.ts";
import { approvedQuestions } from "../lib/questions.ts";
import { questionMatchesStageRules } from "../lib/stage-eligibility.ts";

const STAGE_START = 11;
const STAGE_END = FINAL_STAGE_INDEX;
const SEEDS = [1, 7, 42, 99, 2026];
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function eligibleForStage(stageIndex) {
  const usedConcepts = new Set();
  return approvedQuestions.filter((question) => {
    if (!questionMatchesStageRules(question, stageIndex)) return false;
    if (usedConcepts.has(question.conceptId)) return false;
    usedConcepts.add(question.conceptId);
    return true;
  });
}

function simulateDrawConsumption(seed) {
  setGameRandomSeed(seed);
  let plan = createRound([], []);
  const consumedConcepts = new Set();
  for (const question of plan.questions) consumedConcepts.add(question.conceptId);

  const stageReports = [];
  for (let stageIndex = STAGE_START; stageIndex <= STAGE_END; stageIndex += 1) {
    const required = questionsPerStage(stageIndex);
    const eligibleUnique = eligibleForStage(stageIndex).length;
    const before = plan.questions.length;
    const next = appendNextStage(plan, stageIndex);
    if (!next) {
      stageReports.push({
        stageIndex,
        grade: educationStages[stageIndex]?.name,
        required,
        drawn: 0,
        shortfall: required,
        kind: "confirmed_gap",
        eligibleUniqueConcepts: eligibleUnique,
        consumedUniqueConceptsBefore: consumedConcepts.size,
      });
      for (let pending = stageIndex + 1; pending <= STAGE_END; pending += 1) {
        stageReports.push({
          stageIndex: pending,
          grade: educationStages[pending]?.name,
          required: questionsPerStage(pending),
          drawn: 0,
          shortfall: questionsPerStage(pending),
          kind: "not_simulated",
          note: `stage ${stageIndex} 無法抽題，後續未模擬`,
        });
      }
      break;
    }
    plan = next;
    const drawn = plan.questions.length - before;
    for (const question of plan.questions.slice(before)) consumedConcepts.add(question.conceptId);
    if (drawn < required) {
      stageReports.push({
        stageIndex,
        grade: educationStages[stageIndex]?.name,
        required,
        drawn,
        shortfall: required - drawn,
        kind: "confirmed_gap",
        eligibleUniqueConcepts: eligibleUnique,
        consumedUniqueConceptsBefore: consumedConcepts.size,
      });
      for (let pending = stageIndex + 1; pending <= STAGE_END; pending += 1) {
        stageReports.push({
          stageIndex: pending,
          grade: educationStages[pending]?.name,
          required: questionsPerStage(pending),
          drawn: 0,
          shortfall: questionsPerStage(pending),
          kind: "not_simulated",
          note: `stage ${stageIndex} 題量不足，後續未模擬`,
        });
      }
      break;
    }
    stageReports.push({
      stageIndex,
      grade: educationStages[stageIndex]?.name,
      required,
      drawn,
      shortfall: 0,
      kind: "ok",
      eligibleUniqueConcepts: eligibleUnique,
      consumedUniqueConceptsBefore: consumedConcepts.size,
    });
  }
  resetGameRandom();
  return { seed, consumedConcepts: consumedConcepts.size, stageReports };
}

const inventory = [];
for (let stageIndex = STAGE_START; stageIndex <= STAGE_END; stageIndex += 1) {
  const eligible = eligibleForStage(stageIndex);
  inventory.push({
    stageIndex,
    grade: educationStages[stageIndex]?.name,
    questionsRequired: questionsPerStage(stageIndex),
    eligibleUniqueConcepts: eligible.length,
    headroom: eligible.length - questionsPerStage(stageIndex),
  });
}

const seedRuns = SEEDS.map((seed) => simulateDrawConsumption(seed));
const playable = buildPlayableRunPlan([], []);
const report = {
  generatedAt: new Date().toISOString(),
  stageRange: { from: STAGE_START, to: STAGE_END, grades: "高三～研二" },
  inventory,
  seedRuns: seedRuns.map((run) => ({
    seed: run.seed,
    consumedUniqueConceptsThroughRange: run.consumedConcepts,
    stages: run.stageReports,
  })),
  playableRunSummary: {
    playableStageCount: playable.playableStageCount,
    totalQuestions: playable.totalQuestions,
    gaps: playable.gaps.filter((gap) => gap.stageIndex >= STAGE_START || gap.kind === "not_simulated"),
  },
};

const outPath = resolve(root, "data/stage-11-17-gap-report.json");
writeFileSync(outPath, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify({ inventory, firstGap: seedRuns[0].stageReports.find((s) => s.kind !== "ok") }, null, 2));
console.log(`Wrote ${outPath}`);
