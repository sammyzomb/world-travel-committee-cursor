#!/usr/bin/env node
import assert from "node:assert/strict";
import { computeQuestionBankVersion } from "../lib/question-bank-version.ts";

const baseline = computeQuestionBankVersion();
assert.equal(baseline.length, 16);

// 模擬「只改 answer」：透過重新計算時替換 payload 中的 ans= 欄位來驗證函式敏感度。
import { approvedQuestions, warmupQuestions } from "../lib/questions.ts";
import {
  educationStages,
  optionCountForStage,
  passRequiredForStage,
  POINTS_PER_CORRECT,
  questionsPerStage,
  STAGE_QUESTION_COUNTS,
  STARTING_LIVES,
} from "../lib/game-config.ts";

function fnv1a(input) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function versionFromQuestions(questions, rules) {
  const payload = `${questions}\n---RULES---\n${rules}`;
  return `${fnv1a(payload)}${fnv1a([...payload].reverse().join(""))}`;
}

const sample = warmupQuestions[0];
const baseQuestions = [...warmupQuestions, ...approvedQuestions]
  .map(
    (item) =>
      `${item.id}|${item.conceptId}|${item.auditStatus}|${item.q}|ans=${item.answer}|${item.options.join("\u001f")}`,
  )
  .sort()
  .join("\n");

const rules = [
  `lives:${STARTING_LIVES}`,
  `points:${POINTS_PER_CORRECT}`,
  `stageCounts:${STAGE_QUESTION_COUNTS.join(",")}`,
  ...educationStages.map((stage, stageIndex) => {
    const count = questionsPerStage(stageIndex);
    return [
      stage.name,
      `pool=${stage.pool.join("+")}`,
      `opts=${optionCountForStage(stageIndex)}`,
      `count=${count}`,
      `pass=${passRequiredForStage(count)}`,
    ].join("|");
  }),
].join("\n");

const before = versionFromQuestions(baseQuestions, rules);
const mutatedQuestions = baseQuestions.replace(
  `${sample.id}|${sample.conceptId}|${sample.auditStatus}|${sample.q}|ans=${sample.answer}|`,
  `${sample.id}|${sample.conceptId}|${sample.auditStatus}|${sample.q}|ans=${(sample.answer + 1) % sample.options.length}|`,
);
const after = versionFromQuestions(mutatedQuestions, rules);

assert.notEqual(before, after, "changing only answer index must change question bank version");
assert.equal(before, baseline, "helper matches production version function");

console.log("PASS: question bank version changes when only answer changes.");
