import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {buildPlayableRunPlan} from '../lib/run-plan.ts';
import {setGameRandomSeed,resetGameRandom} from '../lib/game-random.ts';
import {educationStages} from '../lib/game-config.ts';
import {isTravelFocused,isPlayableTravelContent} from '../lib/travel-focus.ts';
import {learningQuestions,sourceQuestions} from '../lib/questions.ts';
import {getLandmarkImageSrc} from '../lib/landmark-images.ts';
import {landmarkStaticManifest} from '../lib/landmark-manifest.ts';
import {QUESTION_BANK_VERSION} from '../lib/question-bank-version.ts';
import {GET} from '../app/api/landmark-image/route.ts';
const stages=educationStages.map(s=>({grade:s.name,minTravelShare:1}));
let runs=0;
try {
 for(let seed=1;seed<=50;seed++) {
  setGameRandomSeed(seed);
  const first=buildPlayableRunPlan();assert.ok(first.completeThroughFinal,`seed ${seed}`);
  const ids=first.plan.questions.map(q=>q.id);
  const replay=buildPlayableRunPlan(ids,first.plan.questions.map(q=>q.conceptId));
  assert.ok(replay.completeThroughFinal,`replay ${seed}`);
  assert.ok(!replay.plan.questions.some(q=>ids.includes(q.id)),'fresh replay');
  for(const run of [first,replay]) {
   for(let stage=0;stage<18;stage++) {
    const questions=run.plan.questions.slice(run.plan.stageStarts[stage],run.plan.stageStarts[stage+1]).filter(q=>q.kind!=='tf');
    assert.ok(questions.every(isPlayableTravelContent));
    const share=questions.filter(isTravelFocused).length/questions.length;
    assert.ok(share>=0.8,`${seed}/${stage}: travel ${share}`);
    stages[stage].minTravelShare=Math.min(stages[stage].minTravelShare,share);
   }
   runs++;
  }
 }
}finally{resetGameRandom();}
assert.ok(learningQuestions.every(q=>q.travelFocus));
assert.ok(!learningQuestions.some(q=>/網站|題庫|旅行問答|旅遊問答|蓄熱|曾有冰川/.test(q.q)));
for(const [name,entry] of Object.entries(landmarkStaticManifest.entries)) {
 if(entry.imageRejected || (entry.provider&&!entry.imageReviewedAt)){
  assert.equal(getLandmarkImageSrc(name),undefined,name);
  assert.equal((await GET(new Request('http://local/api/landmark-image?name='+encodeURIComponent(name)))).status,404,name);
 }
}
const tower=landmarkStaticManifest.entries['雙子星塔'];
assert.ok(tower.imageReviewedAt&&!tower.imageRejected);
assert.match(tower.sourceUrl,/Petronas_Panorama_II/);
assert.match(tower.path,/petronas-/);
assert.ok(!isPlayableTravelContent(sourceQuestions.find(q=>q.id==='source:urban-ratio')));
writeFileSync('docs/TRAVEL-FOCUS-QA-2026-10-02.json',JSON.stringify({questionBankVersion:QUESTION_BANK_VERSION,runs,stages,travelQuestions:learningQuestions.length,rejectedImages:Object.entries(landmarkStaticManifest.entries).filter(([,e])=>e.imageRejected).map(([name])=>name)},null,2)+'\n');
console.log(JSON.stringify({runs,stages},null,2));
