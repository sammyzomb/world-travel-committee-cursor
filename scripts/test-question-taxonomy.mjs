import assert from "node:assert/strict";
import { classifyQuestion, QUESTION_SUBTOPICS } from "../lib/question-taxonomy.ts";
import { allQuestions, approvedQuestions, warmupQuestions } from "../lib/questions.ts";

const cases = [
  ["購買旅遊保險時，醫療保障主要用來？", "insurance-rights"],
  ["液體物品放入登機手提行李時，單瓶容量通常上限是？", "baggage-security"],
  ["參觀清真寺時，較應遵守的禮儀是？", "culture-etiquette"],
  ["馬六甲海峽是連接哪兩片海域的重要航道？", "oceans-coasts-islands"],
  ["因海外領土分布，擁有最多時區的國家是？", "coordinates-time"],
  ["赤道附近終年高溫多雨，植被茂密，這屬於哪一種氣候類型？", "climate-polar"],
];
for (const [text, expected] of cases) {
  const question = [...warmupQuestions, ...allQuestions].find(item => item.q === text);
  assert.ok(question, `Missing fixture: ${text}`);
  assert.equal(question.classification.subtopic, expected, text);
}

const input = { id: "fixture", q: "印度河主要流經哪一個地理區域？", region: "地理知識", questionType: "world-fact" };
assert.deepEqual(classifyQuestion(input).geography.countries, []);
assert.equal(classifyQuestion(input).subtopic, "rivers-lakes-waterfalls");
assert.equal(classifyQuestion({ ...input, q: "待補充的題目" }).reviewRequired, true);
assert.equal(classifyQuestion({ ...input, q: "義大利的首都是哪座城市？", questionType: "capital", landmark: "維蘇威火山" }).subtopic, "capitals");

const questions = [...warmupQuestions, ...allQuestions];
assert.ok(questions.length >= 1108);
assert.ok(warmupQuestions.length + approvedQuestions.length > 800);
for (const question of questions) {
  assert.ok(question.category, question.id);
  assert.equal(question.classification.reviewRequired, false, question.id);
  assert.ok(QUESTION_SUBTOPICS[question.classification.subtopic], question.id);
  if (question.classification.assignment === "fallback") assert.equal(question.classification.reviewRequired, true, question.q);
}
assert.ok(!approvedQuestions.some(q => q.id === 'expanded-landmark:ldue70'));
console.log("PASS: taxonomy covers all questions; travel/geography boundaries, subject priority and ambiguous geography are handled.");
