#!/usr/bin/env node
import assert from "node:assert/strict";
import { buildFullRunPlan } from "../lib/run-plan.ts";
import {
  issuedQuestionsFromPlan,
  validateIssuedRunPlayback,
  verifyAnswersAgainstIssued,
} from "../lib/run-session.ts";
import { STARTING_LIVES } from "../lib/leaderboard-scoring.ts";
import { getStageIndex } from "../lib/game-round.ts";

function answerForQuestion(plan, index, pickCorrect) {
  const question = plan.questions[index];
  const selected = pickCorrect ? question.answer : (question.answer + 1) % question.options.length;
  return {
    questionId: question.id,
    conceptId: question.conceptId,
    stageIndex: getStageIndex(plan.stageStarts, index),
    selected,
    selectedOption: question.options[selected] ?? "",
    correct: selected === question.answer,
  };
}

function makeAnswersFromPlan(plan, pickCorrectForIndex) {
  return plan.questions.map((question, index) => {
    const pickCorrect =
      typeof pickCorrectForIndex === "function" ? pickCorrectForIndex(index) : pickCorrectForIndex;
    return answerForQuestion(plan, index, pickCorrect);
  });
}

function buildDeathAnswers(plan) {
  const answers = [];
  let wrong = 0;
  for (let index = 0; index < plan.questions.length; index += 1) {
    answers.push(answerForQuestion(plan, index, false));
    wrong += 1;
    if (wrong >= STARTING_LIVES) break;
  }
  return answers;
}

const plan = buildFullRunPlan([], []);
const issued = issuedQuestionsFromPlan(plan.questions, plan.stageStarts);

const stageZeroCount = plan.stageStarts[1] ?? plan.questions.length;
const stageZeroPlan = { ...plan, questions: plan.questions.slice(0, stageZeroCount) };
const stageZeroCorrect = makeAnswersFromPlan(stageZeroPlan, true);
const stageZeroIssued = issued.slice(0, stageZeroCount);
assert.equal(validateIssuedRunPlayback(stageZeroIssued, stageZeroCorrect, true), null);

const forgedOrder = [...stageZeroCorrect];
forgedOrder[1] = { ...forgedOrder[1], questionId: forgedOrder[0].questionId };
assert.match(validateIssuedRunPlayback(stageZeroIssued, forgedOrder, true), /order mismatch/);

const forgedComplete = [...stageZeroCorrect];
const wrongOption = plan.questions[0].options.find((_, index) => index !== plan.questions[0].answer);
forgedComplete[0] = {
  ...forgedComplete[0],
  selectedOption: wrongOption ?? "x",
  correct: true,
};
const forgedVerify = verifyAnswersAgainstIssued(stageZeroIssued, forgedComplete);
assert.equal(forgedVerify.ok, true);
assert.equal(forgedVerify.verified[0].correct, false);

const deathAnswers = buildDeathAnswers(plan);
assert.equal(deathAnswers.length, STARTING_LIVES);
assert.equal(validateIssuedRunPlayback(issued.slice(0, deathAnswers.length), deathAnswers, true), null);

const afterDeath = [
  ...deathAnswers,
  answerForQuestion(plan, deathAnswers.length, true),
];
assert.match(
  validateIssuedRunPlayback(issued, afterDeath, true),
  /after lives exhausted/,
);

const continueAfterDeath = [...deathAnswers];
assert.match(
  validateIssuedRunPlayback(issued.slice(0, continueAfterDeath.length), continueAfterDeath, false),
  /endedEarly required/,
);

const forgedFullRecord = stageZeroCorrect;
assert.match(
  validateIssuedRunPlayback(stageZeroIssued, forgedFullRecord, false),
  /incomplete run marked as not ended early/,
);

console.log("PASS: forged records and post-death answers are rejected.");
