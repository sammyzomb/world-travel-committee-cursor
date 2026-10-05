import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {chromium} from 'playwright';
const base=process.env.UI_BASE_URL??'http://127.0.0.1:8787';
const bank=JSON.parse(readFileSync('exports/question-bank-approved.json','utf8'));
const questions=new Map([...bank.warmupQuestions,...bank.approvedQuestions].map(q=>[q.id,q]));
const seed=await(await fetch(base+'/api/run/start',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).json();
assert.equal(seed.questionBankVersion,bank.questionBankVersion);
const browser=await chromium.launch({headless:true,channel:'msedge'});
mkdirSync('.ui-smoke',{recursive:true});
const checks=[];
async function ready(page,previous='') {
 await page.waitForFunction(old=>{const card=document.querySelector('.play-question-card');return card&&card.dataset.questionId!==old&&document.querySelector('.answer-button:not([disabled])');},previous);
}
const nextVisible=page=>page.locator('.play-next-button').evaluate(n=>{const r=n.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&n.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));});
try {
 for(const viewport of [{width:1280,height:650},{width:390,height:844}]) {
  const page=await browser.newPage({viewport});
  await page.goto(base,{waitUntil:'networkidle'});
  assert.match(await page.locator('.start-hero-subtitle').textContent(),/全年齡/);
  await page.locator('.puzzle-catalog summary').click();
  assert.match(await page.locator('.puzzle-catalog summary').textContent(),/516/);
  await page.getByRole('button',{name:/主線闖關/}).click();
  await page.getByRole('button',{name:/跳過動畫/}).click();
  let photos=0,sources=0;const ids=[];
  for(let index=0;index<36;index++) {
   if(await page.locator('.reward-section').count()) {
    assert.ok(await page.locator('.reward-actions .primary-button').evaluate(n=>{const r=n.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;}));
    await page.locator('.reward-actions .primary-button').click();
   }
   await ready(page,ids.at(-1));
   const id=await page.locator('.play-question-card').getAttribute('data-question-id');ids.push(id);
   const q=questions.get(id);assert.ok(q,id);
   assert.ok(q.kind==='tf'||q.puzzleType,id);
   assert.ok(!/小一|小二|小三|國小|研二/.test(await page.locator('.play-status').textContent()));
   assert.equal(await page.locator('.question-references').count(),0);
   if(q.visualClue) {
    assert.ok(await page.locator('.question-photo img').evaluate(n=>n.complete&&n.naturalWidth>0));
    assert.equal(await page.locator('.question-photo b').textContent(),'旅行明信片');photos++;
   }
   const options=await page.locator('.answer-button').allTextContents();
   const correct=options.findIndex(x=>x.slice(1).trim()===q.correctAnswer);assert.ok(correct>=0,id);
   await page.locator('.answer-button').nth(correct).click();
   await page.waitForSelector('.play-fact-box');
   assert.match(await page.locator('.play-fact-box b').textContent(),/答對/);
   assert.ok(await nextVisible(page),`${id}/${viewport.width}`);
   if(q.visualClue)assert.equal(await page.locator('.question-photo b').textContent(),q.correctAnswer);
   if(q.references?.length){sources++;assert.equal(await page.locator('.question-references a').first().getAttribute('href'),q.references[0].url);}
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   if(index===14)await page.screenshot({path:`.ui-smoke/puzzles-${viewport.width}.png`,fullPage:true});
   await page.locator('.play-next-button').click();
   await page.waitForFunction(old=>document.querySelector('.reward-section')||document.querySelector('.play-question-card')?.dataset.questionId!==old,id);
  }
  assert.ok(photos>=12);assert.ok(sources>=2);
  checks.push({viewport,questions:ids,photos,sources});await page.close();
 }
 if(base.includes('127.0.0.1')) {
  // 圖片失敗時不讓看圖題盲猜，重試成功後恢復作答。
  const q=bank.approvedQuestions.find(q=>q.visualClue);
  const state={...seed.state,screen:'play',question:{...q,visual:{type:'photo',image:q.imageSrc,label:'旅行明信片',detail:'看圖辨識'}},feedback:null};
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.route('**/api/run/start',r=>r.fulfill({json:{...seed,state}}));
  await page.route('**/landmarks/**',r=>r.abort());
  await page.goto(base,{waitUntil:'networkidle'});await page.getByRole('button',{name:/主線闖關/}).click();
  await page.waitForSelector('.photo-load-error');assert.equal(await page.locator('.answer-button:not([disabled])').count(),0);
  await page.unroute('**/landmarks/**');await page.getByRole('button',{name:'重新載入照片'}).click();await ready(page);
  checks.push({photoFailureBlocksAnswer:true,retryRestoresAnswer:true});await page.close();
  const high=bank.approvedQuestions.filter(q=>q.puzzleType&&q.demand===4).sort((a,b)=>(b.q.length+b.options.join('').length)-(a.q.length+a.options.join('').length))[0];
  for(const viewport of [{width:1280,height:650},{width:820,height:1180},{width:390,height:844},{width:844,height:390}]) {
   const page=await browser.newPage({viewport});
   const state={...seed.state,screen:'play',stage:{name:'研二',group:'研究所'},stageIndex:17,question:high,feedback:null};
   await page.route('**/api/run/start',r=>r.fulfill({json:{...seed,state}}));
   await page.route('**/api/run/answer',r=>r.fulfill({json:{state:{...state,feedback:{isCorrect:true,correctAnswer:high.correctAnswer,correctIndex:high.answer,selectedIndex:high.answer,fact:high.fact}}}}));
   await page.goto(base,{waitUntil:'networkidle'});await page.getByRole('button',{name:/主線闖關/}).click();await ready(page);
   await page.locator('.answer-button').nth(high.answer).click();await page.waitForSelector('.play-fact-box');
   await page.evaluate(()=>scrollTo(0,0));assert.ok(await nextVisible(page));
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   checks.push({longQuestionFixture:high.id,viewport});await page.close();
  }
 }
 const report={date:'2026-10-05',url:base,questionBankVersion:bank.questionBankVersion,ok:true,leaderboardSubmitted:false,checks};
 writeFileSync(`docs/${base.includes('127.0.0.1')?'LOCAL':'PRODUCTION'}-TRAVEL-PUZZLE-QA-2026-10-05.json`,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report));
} finally {await browser.close();}
