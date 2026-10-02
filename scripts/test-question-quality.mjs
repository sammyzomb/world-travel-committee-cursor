import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { approvedQuestions, learningQuestions } from '../lib/questions.ts';
import { buildPlayableRunPlan } from '../lib/run-plan.ts';
import { setGameRandomSeed, resetGameRandom } from '../lib/game-random.ts';
import { isLocationRecall, questionDemand, questionFamily, minDemandForStage } from '../lib/question-demand.ts';
import { toIssuedQuestion, toPublicQuestion, createInitialProgress, submitAnswer } from '../lib/run-session-engine.ts';

const mexico = approvedQuestions.find(q => q.q === '墨西哥位於哪一洲？');
assert.ok(mexico);
assert.equal(mexico.options[mexico.answer], '北美洲');
const issued = toIssuedQuestion(mexico, 2);
assert.equal(toPublicQuestion(issued).visual, undefined);
assert.equal(toPublicQuestion(issued).region, mexico.category);
assert.deepEqual(toPublicQuestion(issued, true).visual, mexico.visual);
for (const choice of issued.options) {
  const session = { sessionToken: 'fixture', questionBankVersion: 'fixture', issuedQuestions: [issued], stageStarts: [0], exhausted: false, createdAt: new Date().toISOString(), expiresAt: '2099-01-01', progress: createInitialProgress() };
  const result = submitAnswer(session, {questionId: issued.questionId, selectedOption: choice, progressRevision: 0});
  assert.equal(result.session.progress.lastFeedback.isCorrect, choice === '北美洲');
}
assert.ok(!approvedQuestions.some(q => /鄉野旅行社|鄉野行程/.test(q.q)));
assert.ok(!approvedQuestions.some(q => /^(expanded|heritage)-landmark:/.test(q.id)));

const positions = new Set();
try {
  for (let seed = 1; seed <= 50; seed++) {
    setGameRandomSeed(seed);
    const run = buildPlayableRunPlan();
    assert.equal(run.completeThroughFinal, true, `seed ${seed}`);
    assert.equal(run.totalQuestions, 142);
    const plan = run.plan;
    for (let stage = 0; stage < 18; stage++) {
      const qs = plan.questions.slice(plan.stageStarts[stage], plan.stageStarts[stage + 1]);
      const families = new Map();
      assert.ok(qs.filter(q => isLocationRecall(q.q)).length <= (stage >= 5 ? 0 : 1));
      for (const q of qs) {
        assert.ok(questionDemand(q) >= minDemandForStage(stage), q.id);
        assert.ok(q.kind === 'tf' || !q.q.includes(q.options[q.answer]) || q.options[q.answer].length < 2, q.id);
        if (q.kind !== 'tf') { assert.equal(q.options.length, 4, q.id); positions.add(q.answer); }
        const family = questionFamily(q);
        families.set(family, (families.get(family) ?? 0) + 1);
        assert.ok(families.get(family) <= (family === 'location-recall' || stage >= 9 ? 1 : 2), q.id);
      }
    }
  }
} finally { resetGameRandom(); }
assert.equal(positions.size, 4, 'correct answers must not stay in a fixed slot');

// Regression: geography context must not disguise arithmetic, and primary eligibility is reviewed.
const arithmetic = /平均每.{0,8}(?:多少|幾)|總票價|總費用.*(?:多少|最低)|換算.*距離|最晚何時|至少.*幾批|差多少|合併後.*每人|人口淨變化/;
for (const q of learningQuestions) {
  assert.equal(new Set(q.options).size, 4, q.id);
  assert.ok(q.grades.length > 0, q.id + ' needs an explicit grade review');
  assert.ok(!arithmetic.test(q.q), q.q);
  assert.ok(!/^learning:(?:apply-|scenario-)/.test(q.id), 'old arithmetic IDs must be retired');
}
for (const q of approvedQuestions) assert.ok(!arithmetic.test(q.q), q.q);
const raw = JSON.parse(readFileSync(new URL('../data/learning-questions.json', import.meta.url)));
assert.equal(raw.length, learningQuestions.length);
console.log('PASS: 50 complete runs, demand/family limits, answer shuffling, Mexico scoring, hidden hints and no arithmetic substitution.');
