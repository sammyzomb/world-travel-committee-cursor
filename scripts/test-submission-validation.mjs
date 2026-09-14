#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  QUESTION_BANK_VERSION,
  validateRunProgress,
  validateRunSubmission,
  verifyRunAnswers,
} from "../lib/leaderboard-scoring.ts";
import { questionsPerStage, FINAL_STAGE_INDEX } from "../lib/game-config.ts";
import { warmupQuestions, approvedQuestions } from "../lib/questions.ts";

function makeAnswer(question, stageIndex, pickCorrect = true) {
  const selected = pickCorrect ? question.answer : (question.answer + 1) % question.options.length;
  return {
    questionId: question.id,
    conceptId: question.conceptId,
    stageIndex,
    selected,
    selectedOption: question.options[selected] ?? "",
    correct: selected === question.answer,
  };
}

const stageZeroPool = [
  ...warmupQuestions.filter((item) => item.kind === "tf").slice(0, 2),
  ...approvedQuestions.filter((item) => item.level === "旅行新手" && item.kind !== "tf").slice(0, 3),
];

const validAnswers = stageZeroPool.map((question, index) =>
  makeAnswer(question, 0, index < 4),
);

const payload = {
  sessionToken: "test-session-token-001",
  playerName: "測試玩家",
  questionBankVersion: QUESTION_BANK_VERSION,
  answers: validAnswers,
  endedEarly: true,
};

assert.equal(validateRunSubmission(payload), null);
const verified = verifyRunAnswers(validAnswers);
assert.equal(verified.ok, true);
assert.equal(validateRunProgress(verified.verified, true), null);

assert.match(
  validateRunSubmission({ ...payload, questionBankVersion: "stale-version" }),
  /題庫已更新/,
);

const duplicatePayload = {
  ...payload,
  answers: [validAnswers[0], { ...validAnswers[0], stageIndex: 0 }],
};
assert.equal(validateRunSubmission(duplicatePayload), "duplicate questionId in run");

const badConcept = {
  ...validAnswers[0],
  conceptId: "forged:concept",
};
const conceptCheck = verifyRunAnswers([badConcept]);
assert.equal(conceptCheck.ok, false);

const skipStage = validAnswers.map((item) => ({ ...item, stageIndex: 1 }));
assert.equal(validateRunProgress(skipStage, true), "run must start at stage 0");

// Full completion shape for final stage (minimal smoke)
const finalCount = questionsPerStage(FINAL_STAGE_INDEX);
const finalPool = approvedQuestions.slice(0, finalCount);
const finalAnswers = finalPool.map((question) => makeAnswer(question, FINAL_STAGE_INDEX, true));
// Pretend prior stages - only test progress validator accepts well-formed final-only if endedEarly
assert.equal(validateRunProgress(finalAnswers, false), "run must start at stage 0");

console.log("PASS: submission version binding, duplicate guard, concept check, progress validation.");
