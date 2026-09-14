import assert from "node:assert/strict";
import {
  FINAL_STAGE_INDEX,
  graduationStageIndexes,
  optionCountForStage,
  passRequiredForStage,
  QUESTIONS_PER_STAGE,
  WARMUP_QUESTIONS_FIRST_STAGE,
} from "../lib/game-config.ts";
import {
  appendNextStage,
  canDrawNextStage,
  createRound,
  getStageLength,
  isGraduationStage,
} from "../lib/game-round.ts";
import {
  computeRunScore,
  isFullCompletion,
  validateRunSubmission,
} from "../lib/leaderboard-scoring.ts";
import { approvedQuestions, questionBankStats } from "../lib/questions.ts";

function run() {
  assert.equal(QUESTIONS_PER_STAGE, 5);
  assert.equal(WARMUP_QUESTIONS_FIRST_STAGE, 3);
  assert.equal(passRequiredForStage(), 3);
  assert.equal(FINAL_STAGE_INDEX, 17);
  assert.equal(optionCountForStage(0), 2);
  assert.equal(optionCountForStage(2), 2);
  assert.equal(optionCountForStage(3), 3);
  assert.equal(optionCountForStage(6), 4);

  const round = createRound([]);
  assert.equal(getStageLength(round.stageStarts, round.questions.length, 0), 5);
  const warmupIds = round.questions.slice(0, 3).map((item) => item.id);
  assert.equal(new Set(warmupIds).size, 3);
  assert.ok(round.questions.every((item) => item.auditStatus === "approved"));

  const conceptIds = new Set(round.questions.map((item) => item.conceptId));
  assert.equal(conceptIds.size, round.questions.length);

  let plan = round;
  for (let stageIndex = 1; stageIndex <= FINAL_STAGE_INDEX; stageIndex += 1) {
    assert.ok(canDrawNextStage(plan, stageIndex), `stage ${stageIndex} should be drawable`);
    const nextPlan = appendNextStage(plan, stageIndex);
    assert.ok(nextPlan, `stage ${stageIndex} should append`);
    plan = nextPlan;
  }
  assert.equal(plan.stageStarts.length, 18);
  assert.ok(!canDrawNextStage(plan, FINAL_STAGE_INDEX + 1));

  const allConceptIds = new Set(plan.questions.map((item) => item.conceptId));
  assert.equal(allConceptIds.size, plan.questions.length);

  const sampleAnswers = plan.questions.map((item, index) => ({
    questionId: item.id,
    conceptId: item.conceptId,
    stageIndex: plan.stageStarts.findIndex((start, idx) => {
      const end = plan.stageStarts[idx + 1] ?? plan.questions.length;
      return index >= start && index < end;
    }),
    selected: item.answer,
    correct: true,
  }));
  const score = computeRunScore(sampleAnswers);
  assert.equal(score.correctCount, sampleAnswers.length);
  assert.ok(isFullCompletion(sampleAnswers, false));

  const validationError = validateRunSubmission({
    sessionToken: "test-session-token",
    playerName: "Tester",
    answers: sampleAnswers,
    endedEarly: false,
  });
  assert.equal(validationError, null);

  for (const idx of [5, 8, 11, 15, 17]) {
    assert.ok(graduationStageIndexes.has(idx), `graduation index ${idx}`);
    assert.ok(isGraduationStage(idx), `isGraduationStage(${idx})`);
  }

  const tampered = validateRunSubmission({
    sessionToken: "tamper-test",
    playerName: "Hacker",
    answers: [
      {
        questionId: sampleAnswers[0].questionId,
        conceptId: sampleAnswers[0].conceptId,
        stageIndex: 0,
        selected: 0,
        correct: true,
      },
      {
        questionId: sampleAnswers[0].questionId,
        conceptId: "duplicate-concept",
        stageIndex: 0,
        selected: 0,
        correct: true,
      },
    ],
    endedEarly: true,
  });
  assert.ok(tampered?.includes("duplicate"), "should reject duplicate questionId");

  const restartRound = createRound(plan.questions.map((item) => item.id));
  assert.ok(restartRound.questions.length > 0, "restart with avoid list");

  console.log("Phase 1 verification passed.");
  console.log(
    JSON.stringify(
      {
        approvedQuestions: approvedQuestions.length,
        questionBankStats,
        fullRunQuestions: plan.questions.length,
      },
      null,
      2,
    ),
  );
}

run();
