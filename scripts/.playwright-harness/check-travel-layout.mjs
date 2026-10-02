import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';
const base='http://127.0.0.1:8787';
const bank=JSON.parse(readFileSync('exports/question-bank-approved.json','utf8'));
const seed=await(await fetch(base+'/api/run/start',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).json();
const high=bank.approvedQuestions.filter(q=>q.travelFocus&&q.demand===4).sort((a,b)=>(b.q.length+b.options.join('').length)-(a.q.length+a.options.join('').length))[0];
const tower=bank.approvedQuestions.filter(q=>q.imageSrc?.startsWith('/landmarks/petronas-')).sort((a,b)=>b.q.length-a.q.length)[0];
const checks=[];const browser=await chromium.launch({headless:true,channel:'msedge'});
try{
 for(const q of [high,tower])for(const viewport of [{width:1280,height:650},{width:820,height:1180},{width:390,height:844},{width:844,height:390}]){
  const page=await browser.newPage({viewport});
  // 本地版面 fixture；正常端到端计分流程另由 run-smoke 验证。
  const state={...seed.state,screen:'play',stage:{name:'大三',group:'大学'},stageIndex:14,question:{id:q.id,conceptId:q.conceptId,q:q.q,options:q.options,level:q.level,region:q.category,category:q.category,questionType:q.questionType},feedback:null};
  await page.route('**/api/run/start',r=>r.fulfill({json:{...seed,state}}));
  await page.route('**/api/run/answer',r=>r.fulfill({json:{state:{...state,progressRevision:1,question:{...state.question,references:q.references,...(q.imageSrc?{visual:{type:'photo',label:q.landmark,detail:q.landmarkDetail,image:q.imageSrc}}:{})},feedback:{isCorrect:true,correctAnswer:q.correctAnswer,correctIndex:q.answer,selectedIndex:q.answer,selectedOption:q.correctAnswer,fact:q.fact}}}}));
  await page.goto(base,{waitUntil:'networkidle'});await page.getByRole('button',{name:/主線闖關/}).click();
  await page.waitForSelector('.answer-button:not([disabled])');
  assert.equal(await page.locator('.play-visual-slot').count(),0);
  await page.locator('.answer-button').nth(q.answer).click();await page.waitForSelector('.play-next-button');
  await page.evaluate(()=>scrollTo(0,0));
  assert.ok(await page.locator('.play-next-button').evaluate(n=>{const r=n.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&n.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),`visible next ${q.id}/${viewport.width}`);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  if(q.imageSrc)await page.waitForFunction(()=>document.querySelector('.question-photo img')?.naturalWidth>0);
  await page.screenshot({path:`.ui-smoke/travel-${q===tower?'tower':'long'}-${viewport.width}.png`,fullPage:true});
  checks.push({id:q.id,viewport});await page.close();
 }
 writeFileSync('docs/TRAVEL-LAYOUT-QA-2026-10-02.json',JSON.stringify({ok:true,fixture:true,checks},null,2)+'\n');
 console.log('PASS: long travel questions and verified landmark feedback; four viewports; next button visible and unobstructed.');
}finally{await browser.close();}
