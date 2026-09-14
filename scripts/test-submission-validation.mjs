#!/usr/bin/env node
import assert from "node:assert/strict";
import { QUESTION_BANK_VERSION, validateRunSubmission } from "../lib/leaderboard-scoring.ts";

const payload = {
  sessionToken: "test-session-token-001",
  playerName: "測試玩家",
  questionBankVersion: QUESTION_BANK_VERSION,
};

assert.equal(validateRunSubmission(payload), null);

assert.match(
  validateRunSubmission({ ...payload, questionBankVersion: "stale-version" }),
  /題庫已更新/,
);

assert.equal(validateRunSubmission({ ...payload, sessionToken: "" }), "sessionToken is required");
assert.equal(validateRunSubmission({ ...payload, playerName: " " }), "playerName is required");

console.log("PASS: leaderboard submission requires session token, player name, and bank version.");
