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

// Recalculate numeric answers from the displayed stem, independently of the authoring parameters.
let numericChecks = 0;
for (const q of learningQuestions) {
  assert.equal(new Set(q.options).size, 4, q.id);
  const answer = q.options[q.answer];
  if (q.family === 'timezone-calculation') {
    const dest = Number(q.q.match(/目的地使用 UTC([+-]\d+)/)[1]);
    const [,h,m] = q.q.match(/當地 (\d+):(\d+) 起飛/).map(Number);
    const flight = Number(q.q.match(/飛行 (\d+) 分鐘/)[1]);
    const total = h * 60 + m + flight + (dest - 8) * 60 + (q.q.includes('車站') ? 65 : 0);
    const clock = ((total % 1440) + 1440) % 1440;
    const date = total < 0 ? '前一日 ' : total >= 1440 ? '次日 ' : '同日 ';
    assert.equal(answer, date + String(Math.floor(clock / 60)).padStart(2,'0') + ':' + String(clock % 60).padStart(2,'0'), q.id);
    numericChecks++;
  }
  if (q.family === 'transport-cost' && q.q.includes('包車')) {
    const people = Number(q.q.match(/^(\d+) 人/)[1]);
    const capacity = Number(q.q.match(/可載 (\d+) 人/)[1]);
    const fee = Number(q.q.match(/每輛 (\d+) 元/)[1]);
    const price = Number(q.q.match(/鐵路每人 (\d+) 元/)[1]);
    const coach = Math.ceil(people/capacity)*fee;
    const rail = people*price - (q.q.includes('整團總費用折') ? Math.floor(people/10)*90 : 0);
    assert.notEqual(coach, rail, q.id);
    assert.equal(answer, `${coach < rail ? '包車' : '鐵路'}，${Math.min(coach,rail)} 元`, q.id);
    numericChecks++;
  }
  if (q.family === 'site-capacity' && q.q.includes('每批停留')) {
    const dwell = Number(q.q.match(/停留 (\d+) 分鐘/)[1]);
    const interval = Number(q.q.match(/每 (\d+) 分鐘/)[1]);
    const limit = Number(q.q.match(/超過 (\d+) 人/)[1]);
    const requested = Number(q.q.match(/(\d+) 人申請/)[1]);
    assert.equal(answer, `${Math.min(requested, Math.floor(limit/Math.ceil(dwell/interval))*3)} 人`, q.id);
    numericChecks++;
  }
  if (q.family === 'map-scale' && q.q.includes('假設')) {
    const scale = Number(q.q.match(/1:(\d+)/)[1]);
    const cm = Number(q.q.match(/量得 (\d+) 公分/)[1]);
    const km = scale*cm/100000;
    const minutes = q.q.includes('前半段') ? km/2/3*60 + km/2/6*60 + 18 : km/5*60;
    assert.equal(answer, `${Math.round(minutes*10)/10} 分鐘`, q.id);
    numericChecks++;
  }
  if (q.family === 'climate-comparison' && q.q.includes('題定指標')) {
    const a = Number(q.q.match(/甲降雨 (\d+) 毫米/)[1]);
    const b = Number(q.q.match(/乙 (\d+) 毫米/)[1]);
    const weight = Number(q.q.match(/月雨量＋(\d+)×/)[1]);
    const sa=a+weight*10, sb=b+weight*2;
    assert.notEqual(sa,sb);
    assert.equal(answer, `${sa<sb?'甲':'乙'}，${Math.min(sa,sb)}`, q.id);
    numericChecks++;
  }
  if (q.family === 'environment-indicators') {
    const nums = [...q.q.matchAll(/(?:甲團|乙團) (\d+) 人、每人每小時 (\d+) 單位、停留 (\d+) 小時/g)].map(m=>m.slice(1).map(Number));
    assert.equal(nums.length,2,q.id);
    const [a,b] = nums.map(xs=>xs.reduce((n,x)=>n*x,1));
    assert.notEqual(a,b,q.id);
    assert.equal(answer, `${a<b?'甲':'乙'}，總量 ${Math.min(a,b)}`, q.id);
    numericChecks++;
  }
  if (q.family === 'schedule-backward' && q.q.includes('參觀需')) {
    const visit = Number(q.q.match(/參觀需 (\d+) 分鐘/)[1]);
    const walk = Number(q.q.match(/步行 (\d+) 分鐘/)[1]);
    const buffer = Number(q.q.match(/提早 (\d+) 分鐘/)[1]);
    const [,h,m] = q.q.match(/火車 (\d+):(\d+)/).map(Number);
    const start=h*60+m-visit-walk-buffer;
    assert.equal(answer, String(Math.floor(start/60)).padStart(2,'0')+':'+String(start%60).padStart(2,'0'),q.id);
    numericChecks++;
  }
}
const raw = JSON.parse(readFileSync(new URL('../data/learning-questions.json', import.meta.url)));
assert.equal(raw.length, learningQuestions.length);
assert.equal(numericChecks, 156);
console.log('PASS: 50 complete runs, demand/family limits, answer shuffling, Mexico scoring, hidden hints and 156 independent numerical checks.');
