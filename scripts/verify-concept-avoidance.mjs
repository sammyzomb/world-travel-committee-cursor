#!/usr/bin/env node
import { buildPlayableRunPlan } from "../lib/run-plan.ts";

const run1 = buildPlayableRunPlan([], []);
const ids = run1.plan.questions.map((q) => q.id);
const concepts = run1.plan.questions.map((q) => q.conceptId);
const run2 = buildPlayableRunPlan(ids, concepts);

const conceptOverlap = run2.plan.questions.filter((q) => concepts.includes(q.conceptId)).length;
const idOverlap = run2.plan.questions.filter((q) => ids.includes(q.id)).length;

if (conceptOverlap > 0) {
  console.error(`FAIL: ${conceptOverlap} repeated concepts after full-run avoidance`);
  process.exit(1);
}

console.log(
  JSON.stringify({
    ok: true,
    conceptOverlap,
    idOverlap,
    note: "question-id reuse may still occur when the concept pool is exhausted",
  }),
);
