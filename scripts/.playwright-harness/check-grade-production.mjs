import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {chromium} from 'playwright';
import {createHash} from 'node:crypto';

// Play real primary stages; never submit a test score to the production leaderboard.
const base=process.env.UI_BASE_URL ?? 'https://world-travel-committee.tcawg.workers.dev';
const bank=JSON.parse(readFileSync('exports/question-bank-approved.json','utf8'));
const questions=new Map([...bank.warmupQuestions,...bank.approvedQuestions].map(q=>[q.q,q]));
const response=await fetch(base+'/api/run/start',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
assert.equal(response.status,200);
assert.equal((await response.json()).questionBankVersion,bank.questionBankVersion);
const manifest=JSON.parse(readFileSync('data/landmark-static-manifest.json','utf8'));
const tower=manifest.entries['雙子星塔'];
const photo=await fetch(base+tower.path);assert.equal(photo.status,200);
assert.equal(createHash('sha256').update(Buffer.from(await photo.arrayBuffer())).digest('hex'),createHash('sha256').update(readFileSync('public'+tower.path)).digest('hex'),'production must serve verified tower photo');
assert.equal((await fetch(base+'/api/landmark-image?name='+encodeURIComponent('聖索菲亞大教堂'))).status,404,'rejected wrong photo cannot be requested through proxy');
mkdirSync('.ui-smoke',{recursive:true});
const browser=await chromium.launch({headless:true,channel:'msedge'});
const checks=[];
try{
 for(const viewport of [{width:1280,height:650},{width:390,height:844}]){
  const page=await browser.newPage({viewport});
  const observed=[],gradeCounts={};let sourceChecks=0;
  await page.goto(base,{waitUntil:'networkidle'});
  await page.getByRole('button',{name:/主線闖關/}).click();
  for(let index=0;index<36;index++){
   if(await page.locator('.reward-section').count()){
    assert.ok(await page.locator('.reward-actions .primary-button').evaluate(n=>{const r=n.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;}));
    await page.locator('.reward-actions .primary-button').click();
   }
   await page.waitForSelector('.answer-button:not([disabled])');
   const text=(await page.locator('.play-question-card h1').textContent()).trim();
   const grade=(await page.locator('.play-status .score-pill').first().textContent()).trim();
   const q=questions.get(text);assert.ok(q,text);
   assert.ok(q.kind==='tf'||q.travelFocus||q.category==='旅行知識'||q.category==='世界遺產',text);
   assert.ok(!/平均每|總票價|差多少|萬人|都市人口比例/.test(text),text);
   gradeCounts[grade]=(gradeCounts[grade]??0)+1;
   observed.push({grade,id:q.id,q:text});
   assert.equal(await page.locator('.question-references').count(),0);
   const options=await page.locator('.answer-button').allTextContents();
   if(options.length!==2){assert.equal(options.length,4);assert.equal(await page.locator('.play-visual-slot').count(),0);}
   const selected=options.findIndex(x=>x.slice(1).trim()===q.correctAnswer);assert.ok(selected>=0);
   if(grade.includes('小三'))await page.screenshot({path:`.ui-smoke/grade-three-${viewport.width}.png`});
   await page.locator('.answer-button').nth(selected).click();
   await page.waitForSelector('.play-fact-box');
   assert.match(await page.locator('.play-fact-box b').textContent(),/答對/);
   if(q.references?.length){
    sourceChecks++;assert.equal(await page.locator('.question-references a').first().getAttribute('href'),q.references[0].url);
   }
   if(q.imageSrc&&q.imageSrc===tower.path){
    await page.waitForFunction(()=>Array.from(document.querySelectorAll('.question-photo img')).some(n=>n.complete&&n.naturalWidth>0));
    assert.equal(await page.locator('.question-photo img').getAttribute('src'),tower.path);
    await page.screenshot({path:`.ui-smoke/petronas-${viewport.width}.png`,fullPage:true});
   }
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await page.locator('.play-next-button').click();
   await page.waitForFunction(()=>document.querySelector('.reward-section')||document.querySelector('.answer-button:not([disabled])'));
  }
  assert.equal(Object.entries(gradeCounts).find(([g])=>g.includes('小三'))?.[1],6);
  assert.ok(sourceChecks>=2,'sources should appear after their primary grade review');
  assert.ok(await page.locator('.reward-actions .primary-button').evaluate(n=>{const r=n.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;}));
  checks.push({viewport,gradeCounts,sourceChecks,questions:observed});
  await page.close();
 }
 const report={ok:true,date:'2026-10-02',url:base,questionBankVersion:bank.questionBankVersion,checks,leaderboardSubmitted:false};
 writeFileSync('docs/PRODUCTION-TRAVEL-FOCUS-QA-2026-10-02.json',JSON.stringify({...report,verifiedTowerPhoto:tower.path,rejectedProxyChecked:true},null,2)+'\n');
 console.log(JSON.stringify({ok:true,url:base,questionBankVersion:bank.questionBankVersion,viewports:checks.map(c=>({viewport:c.viewport,gradeCounts:c.gradeCounts,sourceChecks:c.sourceChecks}))}));
}finally{await browser.close();}
