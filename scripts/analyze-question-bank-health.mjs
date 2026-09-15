#!/usr/bin/env node
/**
 * 題庫健康度：各學級池深度、重玩消耗、待審題分布。
 */
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { educationStages } from "../lib/game-config.ts";
import { resetGameRandom, setGameRandomSeed } from "../lib/game-random.ts";
import { buildPlayableRunPlan } from "../lib/run-plan.ts";
import {
  allQuestions,
  approvedQuestions,
  tourQuestions,
  travelKnowledgeQuestions,
} from "../lib/questions.ts";
import { questionMatchesStageRules } from "../lib/stage-eligibility.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = resolve(root, "data/question-bank-health-report.json");

function stageInventory() {
  return educationStages.map((stage, stageIndex) => {
    const pool = approvedQuestions.filter((question) =>
      questionMatchesStageRules(question, stageIndex),
    );
    const uniqueConcepts = new Set(pool.map((question) => question.conceptId));
    return {
      stageIndex,
      grade: stage.name,
      poolSize: pool.length,
      uniqueConcepts: uniqueConcepts.size,
      headroom: uniqueConcepts.size - pool.length,
    };
  });
}

function replayStress(seed, avoidConceptCount) {
  setGameRandomSeed(seed);
  const baseline = buildPlayableRunPlan();
  resetGameRandom();
  const avoidConceptIds = [
    ...new Set(baseline.plan?.questions.map((question) => question.conceptId) ?? []),
  ].slice(0, avoidConceptCount);
  setGameRandomSeed(seed);
  const replay = buildPlayableRunPlan([], avoidConceptIds);
  resetGameRandom();
  return {
    seed,
    avoidConceptCount,
    playableStageCount: replay.playableStageCount,
    totalQuestions: replay.totalQuestions,
    completeThroughFinal: replay.completeThroughFinal,
    firstGap: replay.gaps.find((gap) => gap.kind === "confirmed_gap") ?? null,
  };
}

const pendingBySource = {};
for (const question of allQuestions.filter((item) => item.auditStatus === "pending")) {
  const source = question.source.replace(/（.+）$/, "");
  pendingBySource[source] = (pendingBySource[source] ?? 0) + 1;
}

const report = {
  generatedAt: new Date().toISOString(),
  totals: {
    approved: approvedQuestions.length,
    pending: allQuestions.filter((item) => item.auditStatus === "pending").length,
    disabled: allQuestions.filter((item) => item.auditStatus === "disabled").length,
    travelApproved: travelKnowledgeQuestions.filter((item) => item.auditStatus === "approved").length,
    travelTotal: travelKnowledgeQuestions.length,
    tourApproved: tourQuestions.filter((item) => item.auditStatus === "approved").length,
    tourTotal: tourQuestions.length,
    supplement: approvedQuestions.filter((item) => item.id.startsWith("supplement:")).length,
    withPhotoVisual: approvedQuestions.filter((item) => item.visual?.type === "photo").length,
    withoutVisual: approvedQuestions.filter((item) => !item.visual).length,
  },
  pendingBySource,
  thinStages: stageInventory().filter((item) => item.uniqueConcepts < 20),
  stageInventory: stageInventory(),
  replayStress: [1, 42, 2026].flatMap((seed) =>
    [20, 40, 60].map((avoidConceptCount) => replayStress(seed, avoidConceptCount)),
  ),
};

writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report.totals, null, 2));
console.log("thinStages", report.thinStages);
console.log(
  "replayStress worst",
  report.replayStress.reduce((worst, item) =>
    item.playableStageCount < worst.playableStageCount ? item : worst,
  ),
);
