import assert from 'node:assert/strict';
import {writeFileSync,existsSync} from 'node:fs';
import {puzzleQuestions,learningQuestions} from '../lib/questions.ts';
import {buildPlayableRunPlan} from '../lib/run-plan.ts';
import {setGameRandomSeed,resetGameRandom} from '../lib/game-random.ts';
import {questionMatchesStageRules} from '../lib/stage-eligibility.ts';
import {toIssuedQuestion,toPublicQuestion} from '../lib/run-session-engine.ts';
import {issuedQuestionsFromPlan} from '../lib/run-session.ts';
import {QUESTION_BANK_VERSION} from '../lib/question-bank-version.ts';
import catalog from '../data/travel-puzzle-catalog.json';
const longestRate=qs=>qs.reduce((sum,q)=>{
 const max=Math.max(...q.options.map(o=>o.length)),ties=q.options.filter(o=>o.length===max).length;
 return sum+(q.options[q.answer].length===max?1/ties:0);
},0)/qs.length;
assert.equal(puzzleQuestions.length,catalog.total);
assert.ok(longestRate(puzzleQuestions)<.3,'longest-answer strategy should not beat random guessing materially');
// Independently read each logic question's written conditions and check all four choices.
let solved=0;
for(const q of puzzleQuestions) {
 assert.equal(new Set(q.options).size,4);
 assert.ok(Array.from({length:18},(_,i)=>questionMatchesStageRules(q,i)).some(Boolean),q.id);
 let valid;
 if(q.puzzleType==='行程排序') {
  const pairs=[...q.q.matchAll(/「([^」]+)」須在「([^」]+)」之前/g)].map(m=>[m[1],m[2]]);
  valid=q.options.map(o=>{const stops=o.split(' → ');return new Set(stops).size===4&&pairs.every(([a,b])=>stops.indexOf(a)<stops.indexOf(b));});
 } else if(q.puzzleType==='路線推理') {
  const edges=q.q.split('路線為 ')[1].split('。')[0].split('、');
  valid=q.options.map(o=>{const stops=o.split(' → ');return new Set(stops).size===4&&stops.slice(0,3).every((s,j)=>edges.includes(s+'→'+stops[j+1]));});
 } else if(q.puzzleType==='旅伴配對') {
  const clues=[...q.q.matchAll(/(小安|小樂|小米|小禾)(沒選|選)([^；。]+)/g)];
  valid=q.options.map(o=>{const assignments=Object.fromEntries(o.split('／').map(x=>x.split('：')));return new Set(Object.values(assignments)).size===4&&clues.every(([,p,verb,act])=>verb==='選'?assignments[p]===act:assignments[p]!==act);});
 } else if(q.puzzleType==='線索解謎') {
  const descriptions=Object.fromEntries([...q.q.matchAll(/([甲乙丙丁]館)：([^；。]+)/g)].map(m=>[m[1],m[2].split('、')]));
  const needs=q.q.split('想找')[1].split('的體驗')[0].split('、');
  valid=q.options.map(o=>needs.every(n=>descriptions[o.replace('參訪','')].includes(n)));
 }
 if(valid){assert.equal(valid.filter(Boolean).length,1,q.id);assert.equal(valid[q.answer],true,q.id);solved++;}
 if(q.visualClue) {
  assert.equal(q.visual?.type,'photo',q.id);
  assert.ok(existsSync('public'+q.visual.image),q.id);
  for(const issued of [toIssuedQuestion(q,2),issuedQuestionsFromPlan([q],[0])[0]]) {
   const publicQ=toPublicQuestion(issued);
   assert.equal(publicQ.visual.image,q.visual.image);
   assert.equal(publicQ.visual.label,'旅行明信片');
   assert.equal(publicQ.visual.sourceUrl,undefined);
   assert.equal(publicQ.references,undefined);
   for(const option of q.options) assert.ok(!JSON.stringify({...publicQ.visual,image:undefined}).includes(option),q.id);
   assert.equal(toPublicQuestion(issued,true).visual.label,q.options[q.answer]);
  }
 }
}
const stageRates=Array.from({length:18},()=>[]);
let runs=0;
try {
 for(let seed=1;seed<=50;seed++) {
  setGameRandomSeed(seed);
  const first=buildPlayableRunPlan();assert.ok(first.completeThroughFinal,JSON.stringify(first.gaps));
  const ids=first.plan.questions.map(q=>q.id);
  const second=buildPlayableRunPlan(ids,first.plan.questions.map(q=>q.conceptId));
  assert.ok(second.completeThroughFinal,JSON.stringify(second.gaps));
  assert.ok(second.plan.questions.every(q=>!ids.includes(q.id)));
  for(const result of [first,second]) {
   assert.equal(result.totalQuestions,142);
   for(let s=0;s<18;s++) {
    const qs=result.plan.questions.slice(result.plan.stageStarts[s],result.plan.stageStarts[s+1]).filter(q=>q.kind!=='tf');
    assert.ok(qs.every(q=>q.puzzleType&&questionMatchesStageRules(q,s)));
    stageRates[s].push(longestRate(qs));
   }
   runs++;
  }
 }
} finally {resetGameRandom();}
const oldUniqueLongest=learningQuestions.filter(q=>q.options[q.answer].length>Math.max(...q.options.filter((_,i)=>i!==q.answer).map(o=>o.length))).length;
const report={date:'2026-10-05',questionBankVersion:QUESTION_BANK_VERSION,catalog,independentlySolvedLogicQuestions:solved,runs,old:{questions:learningQuestions.length,uniqueLongestCorrect:oldUniqueLongest,longestStrategyExpected:longestRate(learningQuestions)},new:{questions:puzzleQuestions.length,longestStrategyExpected:longestRate(puzzleQuestions)},stages:stageRates.map((rates,index)=>({stage:index+1,longestStrategyExpected:rates.reduce((a,b)=>a+b,0)/rates.length}))};
assert.ok(report.stages.every(s=>s.longestStrategyExpected<.33));
writeFileSync('docs/TRAVEL-PUZZLE-QA-2026-10-05.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
