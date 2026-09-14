#!/usr/bin/env node
// Run: node scripts/test-client-run-state.mjs
// Exercise the real hook with a minimal state/ref harness; effects and HTTP are controlled.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const slots = [];
let cursor = 0;
const react = {
  useState(initial) {
    const index = cursor++;
    if (!(index in slots)) slots[index] = typeof initial === "function" ? initial() : initial;
    return [slots[index], value => { slots[index] = typeof value === "function" ? value(slots[index]) : value; }];
  },
  useRef(initial) {
    const index = cursor++;
    if (!(index in slots)) slots[index] = { current: initial };
    return slots[index];
  },
  useCallback: callback => callback,
  useEffect() {},
};
const module = { exports: {} };
const compiled = ts.transpileModule(readFileSync(resolve(root, "hooks/use-game-state.ts"), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
new Function("require", "module", "exports", compiled)(
  name => {
    if (name === "react") return react;
    if (name === "../lib/player-progress") return {};
    throw new Error("Unexpected runtime dependency: " + name);
  }, module, module.exports,
);
function render() {
  cursor = 0;
  return module.exports.useGameState();
}
const question = {
  id: "question:answered", conceptId: "concept:answered", q: "test",
  options: ["A", "B"], level: "旅行新手", region: "test",
};
const initialState = {
  sessionToken: "server-session-1", questionBankVersion: "server-version-1",
  progressRevision: 0, screen: "enroll", question, feedback: null,
  questionIndex: 0, stage: { name: "小一", group: "國小" },
};
const calls = [];
const originalFetch = globalThis.fetch;
let starts = 0;
globalThis.fetch = async (url, init) => {
  const body = init?.body ? JSON.parse(init.body) : null;
  calls.push({ url, body });
  let payload;
  if (url === "/api/run/start") {
    starts++;
    const state = { ...initialState, sessionToken: "server-session-" + starts };
    payload = { sessionToken: state.sessionToken, questionBankVersion: state.questionBankVersion, state };
  } else if (url === "/api/run/answer") {
    payload = { state: {
      ...initialState, screen: "play", progressRevision: 1,
      feedback: { isCorrect: true, selectedIndex: 0, selectedOption: "A", correctIndex: 0, correctAnswer: "A", fact: "explanation" },
    }};
  } else if (url === "/api/run/advance") {
    payload = { state: { ...initialState, screen: "play", progressRevision: 2,
      question: { ...question, id: "question:unanswered", conceptId: "concept:unanswered" },
    }};
  } else if (url === "/api/leaderboard") {
    payload = { qualified: false };
  } else throw new Error("Unexpected request: " + url);
  return Response.json(payload);
};
try {
  let game = render();
  await game.beginFromFirstGrade();
  game = render();
  await game.choose(0);
  game = render();
  assert.equal(game.current.id, question.id);
  assert.ok(game.feedback);
  await game.next();
  game = render();
  await game.restart();
  const restart = calls.filter(call => call.url === "/api/run/start").at(-1);
  assert.deepEqual(restart.body.avoidQuestionIds, [question.id]);
  assert.deepEqual(restart.body.avoidConceptIds, [question.conceptId]);
  game = render();
  game.setPlayerName("test player");
  game = render();
  await game.submitScore();
  const submitted = calls.find(call => call.url === "/api/leaderboard");
  assert.equal(submitted.body.sessionToken, "server-session-2");
  assert.equal(submitted.body.questionBankVersion, initialState.questionBankVersion);
  console.log("PASS: feedback retains question, restart avoids answered concepts only, submission preserves server session/version.");
} finally {
  globalThis.fetch = originalFetch;
}
