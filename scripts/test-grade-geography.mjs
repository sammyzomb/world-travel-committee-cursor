import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {approvedQuestions, learningQuestions, sourceQuestions, questionBankStats} from '../lib/questions.ts';
import {educationStages} from '../lib/game-config.ts';
import {questionMatchesStageRules, isReviewedForPrimary} from '../lib/stage-eligibility.ts';
import {buildPlayableRunPlan} from '../lib/run-plan.ts';
import {setGameRandomSeed, resetGameRandom} from '../lib/game-random.ts';
import {QUESTION_BANK_VERSION} from '../lib/question-bank-version.ts';

// Validate all eligible primary questions, not just the subset one seed happens to draw.
const grades=[];
for(let stage=0;stage<18;stage++){
  const eligible=approvedQuestions.filter(q=>questionMatchesStageRules(q,stage));
  assert.ok(eligible.length>0,educationStages[stage].name);
  if(stage<=5)for(const q of eligible){
    assert.ok(isReviewedForPrimary(q,stage),q.id);
    if(q.id.startsWith('learning:')||q.id.startsWith('source:')){
      assert.ok(q.grades.includes(educationStages[stage].name),q.id);
      assert.ok(q.demand<=2,q.id);
    }
  }
  if(stage<=2)for(const q of eligible){
    assert.ok(!/萬人|都市人口比例|可再生淡水|觀察努力|UTC|分母|岩層|侵蝕|歷史脈絡/.test(q.q),q.q);
  }
  grades.push({grade:educationStages[stage].name,eligible:eligible.length,questions:eligible.map(q=>({id:q.id,q:q.q,answer:q.options[q.answer],grades:q.grades,demand:q.demand}))});
}
const unreviewed={...learningQuestions[0],grades:[]};
assert.equal(questionMatchesStageRules(unreviewed,3),false,'unreviewed primary content must stay out');
const advanced={...learningQuestions.find(q=>q.demand===4),level:'城市旅人',grades:['小三']};
assert.equal(questionMatchesStageRules(advanced,2),false,'a level/grade tag cannot let advanced reasoning into primary');
const oldNumericIds=['learning:apply-4','source:urban-ratio'];
assert.ok(!approvedQuestions.some(q=>q.id===oldNumericIds[0]));
assert.ok(!sourceQuestions.find(q=>q.id===oldNumericIds[1]).q.includes('1,000'));
let runs=0;
try{
 for(let seed=1;seed<=50;seed++){
  setGameRandomSeed(seed);
  const first=buildPlayableRunPlan();assert.ok(first.completeThroughFinal,`seed ${seed}`);
  const ids=first.plan.questions.map(q=>q.id),concepts=first.plan.questions.map(q=>q.conceptId);
  const replay=buildPlayableRunPlan(ids,concepts);assert.ok(replay.completeThroughFinal,`replay ${seed}`);
  assert.ok(!replay.plan.questions.some(q=>ids.includes(q.id)),`replay ${seed} must use fresh questions`);
  runs+=2;
 }
}finally{resetGameRandom();}
writeFileSync('docs/GRADE-GEOGRAPHY-REVIEW-2026-10-02.json',JSON.stringify({date:'2026-10-02',questionBankVersion:QUESTION_BANK_VERSION,stats:questionBankStats,runs,grades},null,2)+'\n');
console.log(`PASS: all primary candidates reviewed; ${runs} complete fresh runs and replay; screenshots' arithmetic questions retired.`);
