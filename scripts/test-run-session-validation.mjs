#!/usr/bin/env node
import assert from "node:assert/strict";
import { buildPlayableRunPlan } from "../lib/run-plan.ts";
import { createInitialProgress, submitAnswer } from "../lib/run-session-engine.ts";
import { issuedQuestionsFromPlan, validateIssuedRunPlayback } from "../lib/run-session.ts";
import { STARTING_LIVES } from "../lib/leaderboard-scoring.ts";

const playable = buildPlayableRunPlan([], []);
assert.ok(playable.plan);
const issued = issuedQuestionsFromPlan(playable.plan.questions, playable.plan.stageStarts);

let session = {
  sessionToken: "test-session",
  questionBankVersion: "test-version",
  issuedQuestions: issued,
  stageStarts: playable.plan.stageStarts,
  exhausted: playable.plan.exhausted,
  createdAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
  progress: createInitialProgress(),
};

const stageZeroEnd = session.stageStarts[1] ?? 3;
for (let index = 0; index < stageZeroEnd; index += 1) {
  const current = session.issuedQuestions[session.progress.currentIndex];
  const result = submitAnswer(session, current.correctAnswer);
  session = result.session;
  session = { ...session, progress: { ...session.progress, lastFeedback: null } };
}

const stageAnswers = session.progress.answers;
assert.equal(validateIssuedRunPlayback(issued.slice(0, stageAnswers.length), stageAnswers, true), null);

const forgedOrder = [...stageAnswers];
forgedOrder[1] = { ...forgedOrder[1], questionId: forgedOrder[0].questionId };
assert.match(validateIssuedRunPlayback(issued, forgedOrder, true), /order mismatch/);

let deathSession = {
  sessionToken: "death-session",
  questionBankVersion: session.questionBankVersion,
  issuedQuestions: issued,
  stageStarts: session.stageStarts,
  exhausted: session.exhausted,
  createdAt: session.createdAt,
  expiresAt: session.expiresAt,
  progress: createInitialProgress(),
};
const deathAnswers = [];
for (let index = 0; index < STARTING_LIVES; index += 1) {
  deathSession = {
    ...deathSession,
    progress: { ...deathSession.progress, lastFeedback: null },
  };
  const current = deathSession.issuedQuestions[deathSession.progress.currentIndex];
  const wrong = current.options.find((option) => option !== current.correctAnswer);
  assert.ok(wrong, `expected a wrong option for ${current.questionId}`);
  const result = submitAnswer(deathSession, wrong);
  deathSession = result.session;
  deathAnswers.push(deathSession.progress.answers[deathSession.progress.answers.length - 1]);
  if (deathSession.progress.endedEarly) break;
}
assert.equal(deathAnswers.length, STARTING_LIVES);
const nextIssued = issued[deathAnswers.length];
assert.ok(nextIssued, "expected another issued question after death");
const postDeathAnswer = {
  questionId: nextIssued.questionId,
  conceptId: nextIssued.conceptId,
  stageIndex: nextIssued.stageIndex,
  selected: 0,
  selectedOption: nextIssued.options[0],
  correct: false,
};
assert.match(
  validateIssuedRunPlayback(issued, [...deathAnswers, postDeathAnswer], true),
  /after lives exhausted/,
);

console.log("PASS: forged records and post-death answers are rejected.");
