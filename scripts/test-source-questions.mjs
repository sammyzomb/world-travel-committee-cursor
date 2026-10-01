import assert from 'node:assert/strict';
import { sourceQuestions } from '../lib/questions.ts';
import { toIssuedQuestion, toPublicQuestion } from '../lib/run-session-engine.ts';
import { issuedQuestionsFromPlan } from '../lib/run-session.ts';
import { buildPlayableRunPlan } from '../lib/run-plan.ts';
import { setGameRandomSeed, resetGameRandom } from '../lib/game-random.ts';
const domains=new Set(['education.nationalgeographic.org','whc.unesco.org','databank.worldbank.org','geoolympiad.org','www.geoguessr.com']);
const groups=new Set(), regions=new Set(), ids=new Set();
for(const q of sourceQuestions){
  assert.ok(!ids.has(q.id));ids.add(q.id);
  assert.equal(q.auditStatus,'approved');
  assert.equal(new Set(q.options).size,4,q.id);
  assert.ok(q.fact.length>25,q.id);
  assert.equal(q.classification.reviewRequired,false,q.id);
  assert.ok(q.references.length>=1,q.id);
  groups.add(q.source);regions.add(q.region);
  for(const ref of q.references){
    const url=new URL(ref.url);assert.equal(url.protocol,'https:');assert.ok(domains.has(url.hostname),q.id);
    assert.equal(ref.role,q.source==='iGeo'||q.source==='Seterra'?'design':'fact');
  }
  const issued=toIssuedQuestion(q,14);
  assert.equal(toPublicQuestion(issued).references,undefined,'source title must not hint before answering');
  assert.deepEqual(toPublicQuestion(issued,true).references,q.references);
  assert.deepEqual(issuedQuestionsFromPlan([q],[0])[0].references,q.references,'persisted run must retain references');
}
assert.equal(groups.size,5);
assert.equal(sourceQuestions.length,25);
for(const region of ['亞洲','歐洲','非洲','北美洲','南美洲','大洋洲','南極洲'])assert.ok(regions.has(region),region);
const answers=new Map(sourceQuestions.map(q=>[q.id,q.options[q.answer]]));
assert.equal(answers.get('source:weighted-water'),`${(1000000*1000+9000000*100)/(1000000+9000000)} 立方公尺；不能推定服務相同`);
assert.equal(answers.get('source:population-balance'),`減少 ${Math.abs(8000-5000+2000-6000).toLocaleString('en-US')} 人；自然增加被淨移出抵銷`);
assert.equal(answers.get('source:map-path-comparison'),`經 C，短 ${(3+8)-(6+2)} 公里`);
try{
  for(let seed=1;seed<=10;seed++){
    setGameRandomSeed(seed);
    const run=buildPlayableRunPlan();assert.equal(run.completeThroughFinal,true);
    const sourced=run.plan.questions.filter(q=>q.references?.length);
    assert.ok(sourced.length>=15,'source questions must actually reach playable rounds');
    assert.equal(new Set(sourced.map(q=>q.source)).size,5,'all five groups should contribute');
    const replay=buildPlayableRunPlan(run.plan.questions.map(q=>q.id),run.plan.questions.map(q=>q.conceptId));
    assert.equal(replay.completeThroughFinal,true,'priority must not exhaust replay');
  }
}finally{resetGameRandom();}
console.log('PASS: five sources, seven regions, original calculations, hidden references, actual round inclusion and replay.');
