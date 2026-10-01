#!/usr/bin/env node
/**
 * 瀏覽器 UI 煙霧測試 + API 驗證（死亡、名人榜、題庫耗盡）。
 */
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, devices } from "playwright";

const baseUrl = process.env.UI_BASE_URL ?? "http://127.0.0.1:8787";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const artifactDir = resolve(root, ".ui-smoke");
mkdirSync(artifactDir, { recursive: true });

async function apiPost(path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  return { status: response.status, payload };
}

async function screenshot(page, name) {
  await page.screenshot({ path: resolve(artifactDir, `${name}.png`), fullPage: true });
}

async function waitForPlay(page) {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /主線闖關/ }).click();
  await page.waitForSelector(".play-screen .answer-button", { timeout: 14000 });
}

const bank = JSON.parse(readFileSync(resolve(root, 'exports/question-bank-approved.json'), 'utf8'));
const referenceMap = new Map(bank.approvedQuestions.map(q => [q.q, q.references ?? []]));
let checkedReferenceQuestions = 0;
const correctAnswers = new Map([...bank.warmupQuestions, ...bank.approvedQuestions].map(q => [q.q, q.correctAnswer]));
async function answerUntilCorrect(page) {
  const text = await page.locator('.play-question-card h1').textContent();
  const correct = correctAnswers.get(text?.trim());
  assert.equal(await page.locator('.question-references').count(), 0, 'source titles must be hidden before answering');
  assert.ok(correct, 'question should exist in exported local bank: ' + text);
  const buttons = page.locator('.answer-button');
  const labels = await buttons.allTextContents();
  const index = labels.findIndex(label => label.slice(1).trim() === correct);
  assert.ok(index >= 0, 'correct option should render');
  await buttons.nth(index).click();
  await page.waitForSelector('.play-fact-box', {timeout: 10000});
  assert.match(await page.locator('.play-fact-box b').textContent(), /答對/);
  const refs = referenceMap.get(text?.trim()) ?? [];
  if (refs.length) {
    checkedReferenceQuestions++;
    assert.equal(await page.locator('.question-references a').count(), refs.length);
    assert.equal(await page.locator('.question-references a').first().getAttribute('href'), refs[0].url);
    assert.match(await page.locator('.question-references').textContent(), refs[0].role === 'design' ? /題型參考/ : /內容依據/);
    assert.ok(await page.locator('.play-next-button').evaluate(n => {const r=n.getBoundingClientRect();return r.bottom<=innerHeight && r.top>=0;}), 'source links must leave the continue button accessible');
  }
}
async function advanceFeedback(page) {
  const next = page.locator(".play-next-button");
  if (await next.count()) {
    await next.click();
    await page.waitForTimeout(400);
  }
}

async function playUntilDeath(page, maxQuestions = 30) {
  let wrongCount = 0;
  for (let question = 0; question < maxQuestions; question += 1) {
    if (await page.locator(".result-section").count()) return;
    await page.waitForSelector(".answer-button:not([disabled])", { timeout: 10000 });
    const options = page.locator(".answer-button:not([disabled])");
    const count = await options.count();
    const text = await page.locator('.play-question-card h1').textContent();
    const correct = correctAnswers.get(text?.trim());
    const labels = await options.allTextContents();
    const pickIndex = labels.findIndex(label => label.slice(1).trim() !== correct);
    await options.nth(pickIndex).click();
    await page.waitForSelector(".play-fact-box", { timeout: 10000 });
    const headline = await page.locator(".play-fact-box b").textContent();
    if (headline?.includes("整局機會已用完") || headline?.includes("挑戰結束")) {
      await advanceFeedback(page);
      return;
    }
    if (headline?.includes("答錯")) {
      wrongCount += 1;
    }
    const nextLabel = await page.locator(".play-next-button").textContent();
    if (nextLabel?.includes("查看成績") || wrongCount >= 3) {
      await advanceFeedback(page);
      if (await page.locator(".result-section").count()) return;
      if (wrongCount >= 3) break;
    } else {
      await advanceFeedback(page);
    }
  }
  if (!(await page.locator(".result-section").count())) {
    throw new Error(`failed to reach result screen after ${maxQuestions} questions (wrong=${wrongCount})`);
  }
}

const browser = await chromium.launch({ headless: true, channel: "msedge" });
const desktop = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const mobileContext = await browser.newContext({ ...devices["iPhone 13"] });
const phone = await mobileContext.newPage();
const tablet = await browser.newPage({viewport:{width:820,height:1180}});

try {
  await waitForPlay(desktop);
  await screenshot(desktop, "desktop-play");
  await answerUntilCorrect(desktop);
  await screenshot(desktop, "desktop-feedback");
  assert.ok(await desktop.locator(".play-fact-box p").count(), "fact text should render");
  await advanceFeedback(desktop);
  await screenshot(desktop, "desktop-next");

  for (let step = 0; step < 6; step += 1) {
    if (await desktop.locator(".reward-section").count()) break;
    if (await desktop.locator(".result-section").count()) break;
    if (!(await desktop.locator(".answer-button:not([disabled])").count())) break;
    await answerUntilCorrect(desktop);
    await advanceFeedback(desktop);
  }
  assert.ok(await desktop.locator(".reward-section").count(), "should reach reward after stage zero");
  await screenshot(desktop, "desktop-reward");
  for (const viewport of [{width:1280,height:650},{width:390,height:844},{width:844,height:390}]) {
    await desktop.setViewportSize(viewport);
    await desktop.evaluate(() => scrollTo(0,0));
    const cta = desktop.locator('.reward-actions .primary-button');
    assert.ok(await cta.evaluate(node => { const r=node.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight && r.width >= 44 && r.height >= 44; }), 'continue button must be visible without scrolling');
    assert.ok(await cta.evaluate(node => { const r=node.getBoundingClientRect(); return node.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)); }), 'continue button must not be covered');
    assert.ok(await desktop.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'reward has no horizontal overflow');
    await screenshot(desktop, `reward-${viewport.width}x${viewport.height}`);
  }
  await desktop.setViewportSize({width:1280,height:800});

  await desktop.getByRole("button", { name: /休息好了|畢業完成/ }).click();
  await desktop.waitForSelector(".play-screen .answer-button", { timeout: 10000 });
  await screenshot(desktop, "desktop-stage-two");

  await waitForPlay(tablet);
  await screenshot(tablet, 'tablet-play');
  await answerUntilCorrect(tablet);
  await screenshot(tablet, 'tablet-feedback');
  for (const page of [desktop, tablet]) {
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no horizontal overflow');
  }
  await waitForPlay(phone);
  assert.ok(await phone.getByRole('button', {name: /^重玩$/}).evaluate(node => parseFloat(getComputedStyle(node).fontSize) > 0), 'mobile replay label should be visible');
  const playWidth = await phone.locator(".play-question-card").evaluate((node) => node.getBoundingClientRect().width);
  assert.ok(playWidth <= (phone.viewportSize()?.width ?? 390) + 4, "play card should fit mobile width");
  const buttonHeight = await phone.locator(".answer-button").first().evaluate((node) => node.getBoundingClientRect().height);
  assert.ok(buttonHeight >= 40, "mobile answer button should be tappable");
  const questionText = await phone.locator(".play-question-card h1").textContent();
  assert.ok(questionText && questionText.trim().length > 0, "mobile question text should render");
  await screenshot(phone, "mobile-play");
  await answerUntilCorrect(phone);
  const factText = await phone.locator(".play-fact-box p").last().textContent();
  assert.ok(factText && factText.trim().length > 0, "mobile fact text should render");
  await screenshot(phone, "mobile-feedback");
  await advanceFeedback(phone);
  for (let step=0;step<4;step++) {
    if (await phone.locator('.reward-section').count()) break;
    await answerUntilCorrect(phone);
    if (await phone.locator('.question-references').count()) {
      await screenshot(phone, 'mobile-source-feedback');
      assert.ok(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'source links must fit mobile');
    }
    await advanceFeedback(phone);
  }


  await waitForPlay(desktop);
  await desktop.getByRole("button", { name: /^重玩$/ }).click();
  await desktop.waitForTimeout(3500);
  await desktop.waitForSelector(".play-screen .answer-button", { timeout: 15000 });
  await screenshot(desktop, "desktop-replay");

  await waitForPlay(desktop);
  await answerUntilCorrect(desktop);
  await advanceFeedback(desktop);
  await playUntilDeath(desktop);
  await desktop.waitForSelector(".result-section", { timeout: 10000 });
  await screenshot(desktop, "desktop-death-result");
  await desktop.locator("#player-name").fill("瀏覽器煙霧");
  await desktop.getByRole("button", { name: /送出成績/ }).click();
  await desktop.waitForTimeout(1200);
  await screenshot(desktop, "desktop-leaderboard-submit");
  const submitMessage = await desktop.locator(".result-section").textContent();
  assert.ok(
    submitMessage?.includes("留名") || submitMessage?.includes("前 10") || submitMessage?.includes("送出"),
    "leaderboard submit should show feedback",
  );

  const poolExhausted = await apiPost("/api/run/start", { avoidQuestionIds: [], avoidConceptIds: [] });
  assert.equal(poolExhausted.status, 200);
  const exhaustedToken = poolExhausted.payload.sessionToken;
  let exhaustedState = poolExhausted.payload.state;
  for (let step = 0; step < 600 && exhaustedState.screen !== "result"; step += 1) {
    if (exhaustedState.screen === "reward") {
      const continueRun = await apiPost("/api/run/continue", {
        sessionToken: exhaustedToken,
        progressRevision: exhaustedState.progressRevision,
      });
      if (continueRun.status !== 200) break;
      exhaustedState = continueRun.payload.state;
      continue;
    }
    const question = exhaustedState.question;
    if (!question) break;
    const answer = await apiPost("/api/run/answer", {
      sessionToken: exhaustedToken,
      questionId: question.id,
      selectedOption: question.options[0],
      progressRevision: exhaustedState.progressRevision,
    });
    if (answer.status !== 200) break;
    exhaustedState = answer.payload.state;
    if (exhaustedState.screen === "result") break;
    if (!exhaustedState.feedback) continue;
    const advance = await apiPost("/api/run/advance", {
      sessionToken: exhaustedToken,
      progressRevision: exhaustedState.progressRevision,
    });
    if (advance.status !== 200) break;
    exhaustedState = advance.payload.state;
  }
  assert.equal(exhaustedState.screen, "result", `API should eventually end run (last screen=${exhaustedState.screen})`);
  assert.ok(
    ["question_pool_exhausted", "full_completion", "lives_exhausted", "stage_failed"].includes(
      exhaustedState.endReason ?? "",
    ),
    `unexpected endReason: ${exhaustedState.endReason}`,
  );

  assert.ok(checkedReferenceQuestions >= 2, 'browser should exercise source-linked questions');
  writeFileSync(
    resolve(artifactDir, "report.json"),
    JSON.stringify({ ok: true, baseUrl, viewports: ["1280x800", "820x1180", "390x844", "1280x650", "844x390"], flows: ["answer", "feedback", "reward", "continue", "replay", "death", "leaderboard", "source-links-after-answer"], checkedReferenceQuestions, artifacts: artifactDir }, null, 2),
  );
  console.log(`PASS: browser+API smoke at ${baseUrl} (artifacts: ${artifactDir})`);
} finally {
  await tablet.close();
  await phone.close();
  await mobileContext.close();
  await desktop.close();
  await browser.close();
}
