#!/usr/bin/env node
/**
 * API + 資料庫整合測試：涵蓋開始、作答、下一題、升級、結束、名人榜。
 */
import assert from "node:assert/strict";
import { resetIntegrationTestDb } from "../db/integration-test-db.ts";
import { POST as startRun } from "../app/api/run/start/route.ts";
import { POST as answerRun } from "../app/api/run/answer/route.ts";
import { POST as advanceRun } from "../app/api/run/advance/route.ts";
import { POST as continueRun } from "../app/api/run/continue/route.ts";
import { GET as getLeaderboard, POST as postLeaderboard } from "../app/api/leaderboard/route.ts";
import { QUESTION_BANK_VERSION } from "../lib/question-bank-version.ts";
import { buildPlayableRunPlan } from "../lib/run-plan.ts";
import { createInitialProgress } from "../lib/run-session-engine.ts";
import { issuedQuestionsFromPlan } from "../lib/run-session.ts";
import {
  createSessionExpiry,
  loadRunSession,
  saveRunSession,
} from "../lib/run-session-store.ts";

process.env.INTEGRATION_TEST_DB = "true";
delete process.env.RUN_SESSION_MEMORY_FALLBACK;

function jsonRequest(body) {
  return new Request("http://localhost/api", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function callPost(handler, body) {
  const response = await handler(jsonRequest(body));
  const payload = await response.json();
  return { status: response.status, payload };
}

async function answerCurrent(state, sessionToken, selectedOption) {
  assert.ok(state.question, "expected a question to answer");
  return callPost(answerRun, {
    sessionToken,
    questionId: state.question.id,
    selectedOption,
    progressRevision: state.progressRevision,
  });
}

async function advanceCurrent(state, sessionToken) {
  return callPost(advanceRun, {
    sessionToken,
    progressRevision: state.progressRevision,
  });
}

async function continueCurrent(state, sessionToken) {
  return callPost(continueRun, {
    sessionToken,
    progressRevision: state.progressRevision,
  });
}

resetIntegrationTestDb();

// --- 開始遊戲 ---
const started = await callPost(startRun, { avoidQuestionIds: [], avoidConceptIds: [] });
assert.equal(started.status, 200);
const sessionToken = started.payload.sessionToken;
assert.ok(sessionToken);
let state = started.payload.state;
assert.equal(state.screen, "enroll");
assert.equal(state.progressRevision, 0);

// --- 作答 + 下一題（第一題）---
const firstQuestion = state.question ?? started.payload.state.question;
state = { ...state, screen: "play", question: firstQuestion };
assert.ok(state.question);

const firstIssued = (await loadRunSession(sessionToken))?.issuedQuestions[0];
assert.ok(firstIssued);
const correctOption = firstIssued.correctAnswer;

const answered = await answerCurrent(state, sessionToken, correctOption);
assert.equal(answered.status, 200);
state = answered.payload.state;
assert.ok(state.feedback);
assert.equal(state.screen, "play");
assert.equal(state.question?.id, firstQuestion.id, "feedback must retain the answered question for PlayScreen");
assert.deepEqual(state.question.options, firstQuestion.options);
assert.equal("answer" in state.question, false);
assert.equal("fact" in state.question, false);
assert.equal(state.progressRevision, 1);

const duplicateAnswer = await answerCurrent(
  { ...state, progressRevision: 0, question: state.question ?? firstQuestion },
  sessionToken,
  correctOption,
);
assert.equal(duplicateAnswer.status, 200);
assert.equal(duplicateAnswer.payload.idempotent, true);
assert.equal(duplicateAnswer.payload.state.score, state.score);

const blockedWhileFeedback = await callPost(answerRun, {
  sessionToken,
  questionId: firstIssued.questionId,
  selectedOption: firstIssued.options.find((item) => item !== correctOption) ?? "x",
  progressRevision: state.progressRevision,
});
assert.equal(blockedWhileFeedback.status, 400);
assert.match(blockedWhileFeedback.payload.error, /確認上一題/);

const advanced = await advanceCurrent(state, sessionToken);
assert.equal(advanced.status, 200);
state = advanced.payload.state;
assert.equal(state.feedback, null);
assert.ok(state.question || state.screen !== "play");

// --- 並行請求：同 revision 只計分一次 ---
if (state.question) {
  const parallelRevision = state.progressRevision;
  const parallelQuestion = state.question;
  const parallelOption =
    (await loadRunSession(sessionToken))?.issuedQuestions[state.questionIndex]?.correctAnswer ??
    parallelQuestion.options[0];
  const [left, right] = await Promise.all([
    callPost(answerRun, {
      sessionToken,
      questionId: parallelQuestion.id,
      selectedOption: parallelOption,
      progressRevision: parallelRevision,
    }),
    callPost(answerRun, {
      sessionToken,
      questionId: parallelQuestion.id,
      selectedOption: parallelOption,
      progressRevision: parallelRevision,
    }),
  ]);
  assert.ok(left.status === 200 || right.status === 200);
  const reloaded = await loadRunSession(sessionToken, { bypassCache: true });
  assert.ok(reloaded);
  const answersForQuestion = reloaded.progress.answers.filter(
    (item) => item.questionId === parallelQuestion.id,
  );
  assert.equal(answersForQuestion.length, 1);
  state =
    left.status === 200
      ? left.payload.state
      : right.status === 200
        ? right.payload.state
        : state;
  if (state.feedback) {
    const afterParallelAdvance = await advanceCurrent(state, sessionToken);
    state = afterParallelAdvance.payload.state;
  }
}

// --- 正常死亡 ---
const deathStart = await callPost(startRun, { avoidQuestionIds: [], avoidConceptIds: [] });
assert.equal(deathStart.status, 200);
const deathToken = deathStart.payload.sessionToken;
let deathState = { ...deathStart.payload.state, screen: "play", question: deathStart.payload.state.question };
const deathSession = await loadRunSession(deathToken);
assert.ok(deathSession);

for (let attempt = 0; attempt < 3; attempt += 1) {
  const liveDeath = await loadRunSession(deathToken, { bypassCache: true });
  assert.ok(liveDeath);
  const current = liveDeath.issuedQuestions[liveDeath.progress.currentIndex];
  const wrong = current.options.find((item) => item !== current.correctAnswer);
  assert.ok(wrong);
  const wrongAnswer = await callPost(answerRun, {
    sessionToken: deathToken,
    questionId: current.questionId,
    selectedOption: wrong,
    progressRevision: liveDeath.progress.revision,
  });
  assert.equal(wrongAnswer.status, 200);
  deathState = wrongAnswer.payload.state;
  if (deathState.screen === "result") break;
  if (deathState.feedback) {
    const deathAdvance = await advanceCurrent(deathState, deathToken);
    deathState = deathAdvance.payload.state;
  }
}

assert.equal(deathState.screen, "result");
assert.equal(deathState.endReason, "lives_exhausted");
assert.equal(deathState.endedEarly, true);

const deathSubmit = await callPost(postLeaderboard, {
  sessionToken: deathToken,
  playerName: "死亡測試",
  questionBankVersion: QUESTION_BANK_VERSION,
});
assert.ok([200, 201].includes(deathSubmit.status));

// --- 題庫耗盡 ---
const playable = buildPlayableRunPlan([], []);
assert.ok(playable.plan);
const stageEnd = playable.plan.stageStarts[1] ?? playable.plan.questions.length;
const exhaustedToken = `exhausted-${Date.now()}`;
const createdAt = new Date().toISOString();
await saveRunSession({
  sessionToken: exhaustedToken,
  questionBankVersion: QUESTION_BANK_VERSION,
  issuedQuestions: issuedQuestionsFromPlan(
    playable.plan.questions.slice(0, stageEnd),
    [0],
  ),
  stageStarts: [0],
  exhausted: true,
  createdAt,
  expiresAt: createSessionExpiry(new Date(createdAt)),
  progress: createInitialProgress(),
});

let exhaustedState = {
  sessionToken: exhaustedToken,
  questionBankVersion: QUESTION_BANK_VERSION,
  progressRevision: 0,
  screen: "play",
  question: null,
  feedback: null,
};
const exhaustedLoaded = await loadRunSession(exhaustedToken);
assert.ok(exhaustedLoaded);
for (let index = 0; index < stageEnd; index += 1) {
  const issued = exhaustedLoaded.issuedQuestions[index];
  const result = await callPost(answerRun, {
    sessionToken: exhaustedToken,
    questionId: issued.questionId,
    selectedOption: issued.correctAnswer,
    progressRevision: exhaustedState.progressRevision,
  });
  assert.equal(result.status, 200);
  exhaustedState = result.payload.state;
  if (exhaustedState.feedback && exhaustedState.screen === "play") {
    const next = await advanceCurrent(exhaustedState, exhaustedToken);
    exhaustedState = next.payload.state;
  }
}

assert.equal(exhaustedState.screen, "result");
assert.equal(exhaustedState.endReason, "question_pool_exhausted");
assert.equal(exhaustedState.fullCompletion, false);
assert.equal(exhaustedState.endedEarly, false);

const exhaustedSubmit = await callPost(postLeaderboard, {
  sessionToken: exhaustedToken,
  playerName: "耗盡測試",
  questionBankVersion: QUESTION_BANK_VERSION,
});
assert.ok([200, 201].includes(exhaustedSubmit.status));
assert.equal(exhaustedSubmit.status, 201);
assert.equal(exhaustedSubmit.payload.entry.completed, false);
assert.equal("sessionToken" in exhaustedSubmit.payload.entry, false);
const repeatedSubmit = await callPost(postLeaderboard, {
  sessionToken: exhaustedToken,
  playerName: "耗盡測試",
  questionBankVersion: QUESTION_BANK_VERSION,
});
assert.equal(repeatedSubmit.status, 409);

// --- 升級獎勵後繼續 ---
const rewardStart = await callPost(startRun, { avoidQuestionIds: [], avoidConceptIds: [] });
const rewardToken = rewardStart.payload.sessionToken;
let rewardState = {
  ...rewardStart.payload.state,
  screen: "play",
  question: rewardStart.payload.state.question,
};
const rewardSession = await loadRunSession(rewardToken);
assert.ok(rewardSession);
const stageOneEnd = rewardSession.stageStarts[1] ?? stageEnd;

while (rewardState.screen === "play") {
  const liveReward = await loadRunSession(rewardToken, { bypassCache: true });
  assert.ok(liveReward);
  if (liveReward.progress.answers.length >= stageOneEnd) break;
  const issued = liveReward.issuedQuestions[liveReward.progress.currentIndex];
  const result = await callPost(answerRun, {
    sessionToken: rewardToken,
    questionId: issued.questionId,
    selectedOption: issued.correctAnswer,
    progressRevision: liveReward.progress.revision,
  });
  assert.equal(result.status, 200);
  rewardState = result.payload.state;
  if (rewardState.screen === "reward") break;
  if (rewardState.feedback) {
    const next = await advanceCurrent(rewardState, rewardToken);
    rewardState = next.payload.state;
  }
}

assert.equal(rewardState.screen, "reward");
const continued = await continueCurrent(rewardState, rewardToken);
assert.equal(continued.status, 200);
assert.equal(continued.payload.state.screen, "play");

// --- 名人榜寫入與讀回 ---
const boardStart = await callPost(startRun, { avoidQuestionIds: [], avoidConceptIds: [] });
const boardToken = boardStart.payload.sessionToken;
let boardState = {
  ...boardStart.payload.state,
  screen: "play",
  question: boardStart.payload.state.question,
};
const boardSession = await loadRunSession(boardToken);
const boardIssued = boardSession.issuedQuestions[0];
const boardAnswer = await callPost(answerRun, {
  sessionToken: boardToken,
  questionId: boardIssued.questionId,
  selectedOption: boardIssued.correctAnswer,
  progressRevision: boardState.progressRevision,
});
boardState = boardAnswer.payload.state;
if (boardState.feedback) {
  const boardAdvance = await advanceCurrent(boardState, boardToken);
  boardState = boardAdvance.payload.state;
}

const boardSubmit = await callPost(postLeaderboard, {
  sessionToken: boardToken,
  playerName: "榜單測試",
  questionBankVersion: QUESTION_BANK_VERSION,
});
assert.equal(boardSubmit.status, 409, "an active run must not publish a partial score");

const boardRead = await getLeaderboard();
assert.equal(boardRead.status, 200);
const boardPayload = await boardRead.json();
assert.ok(Array.isArray(boardPayload.entries));
assert.ok(boardPayload.entries.some((entry) => entry.id === exhaustedSubmit.payload.entry.id));
assert.ok(!boardPayload.entries.some((entry) => entry.playerName === "榜單測試"));
for (const entry of boardPayload.entries) {
  assert.deepEqual(Object.keys(entry).sort(), ["completed", "id", "playerName", "score", "stageReached"]);
}
assert.ok(!JSON.stringify(boardPayload).includes(exhaustedToken), "public board must not leak run credentials");

console.log(
  "PASS: API+DB integration covered start, answer, advance, continue, death, pool exhaustion, duplicate, parallel, and leaderboard.",
);
