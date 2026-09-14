#!/usr/bin/env node
/**
 * 整合測試：建立場次 → 逐題作答 → 名人榜送出，確認同一 sessionToken。
 */
import assert from "node:assert/strict";
import { QUESTION_BANK_VERSION } from "../lib/question-bank-version.ts";
import { buildPlayableRunPlan } from "../lib/run-plan.ts";
import {
  advanceAfterFeedback,
  buildClientRunState,
  createInitialProgress,
  getServerRunScore,
  submitAnswer,
} from "../lib/run-session-engine.ts";
import { issuedQuestionsFromPlan, validateIssuedRunPlayback } from "../lib/run-session.ts";
import {
  allowRunSessionMemoryFallback,
  createSessionExpiry,
  loadRunSession,
  saveRunSession,
  updateRunSession,
} from "../lib/run-session-store.ts";
import { validateRunSubmission } from "../lib/leaderboard-scoring.ts";

process.env.RUN_SESSION_MEMORY_FALLBACK = "true";
assert.equal(allowRunSessionMemoryFallback(), true);

const playable = buildPlayableRunPlan([], []);
assert.ok(playable.plan, "playable plan required for integration test");

const sessionToken = `integration-${Date.now()}`;
const createdAt = new Date().toISOString();
let session = {
  sessionToken,
  questionBankVersion: QUESTION_BANK_VERSION,
  issuedQuestions: issuedQuestionsFromPlan(playable.plan.questions, playable.plan.stageStarts),
  stageStarts: playable.plan.stageStarts,
  exhausted: playable.plan.exhausted,
  createdAt,
  expiresAt: createSessionExpiry(new Date(createdAt)),
  progress: createInitialProgress(),
};

await saveRunSession(session);
const loaded = await loadRunSession(sessionToken);
assert.ok(loaded);
assert.equal(loaded.sessionToken, sessionToken);

const stageOneEnd = session.stageStarts[1] ?? Math.min(3, session.issuedQuestions.length);
while (session.progress.currentIndex < stageOneEnd) {
  const issued = session.issuedQuestions[session.progress.currentIndex];
  const result = submitAnswer(session, issued.correctAnswer);
  session = result.session;
  await updateRunSession(session);
  const advanced = advanceAfterFeedback(session);
  session = { ...session, progress: { ...session.progress, lastFeedback: null } };
  await updateRunSession(session);
  assert.equal(advanced.sessionToken, sessionToken);
}

const reloaded = await loadRunSession(sessionToken);
assert.ok(reloaded);
assert.equal(reloaded.sessionToken, sessionToken);
assert.equal(reloaded.questionBankVersion, QUESTION_BANK_VERSION);

const serverRun = getServerRunScore(reloaded);
assert.equal(serverRun.answers.length, stageOneEnd);
assert.equal(
  validateIssuedRunPlayback(reloaded.issuedQuestions, serverRun.answers, true),
  null,
);

assert.equal(
  validateRunSubmission({
    sessionToken,
    playerName: "整合測試",
    questionBankVersion: QUESTION_BANK_VERSION,
  }),
  null,
);

const restartToken = `integration-restart-${Date.now()}`;
await saveRunSession({
  ...session,
  sessionToken: restartToken,
  progress: createInitialProgress(),
});
assert.equal((await loadRunSession(restartToken))?.sessionToken, restartToken);
assert.notEqual(restartToken, sessionToken);

console.log(
  `PASS: integration session ${sessionToken.slice(0, 8)}… kept through ${serverRun.answers.length} answers (score ${serverRun.score}).`,
);
