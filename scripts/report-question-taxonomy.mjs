import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { allQuestions, warmupQuestions, approvedQuestions } from "../lib/questions.ts";
import { QUESTION_SUBTOPICS } from "../lib/question-taxonomy.ts";

const root = resolve(import.meta.dirname, "..");
const all = [...warmupQuestions, ...allQuestions];
const playable = [...warmupQuestions, ...approvedQuestions];
function counts(rows, getKey) {
  return rows.reduce((result, item) => {
    const key = getKey(item);
    result[key] = (result[key] ?? 0) + 1;
    return result;
  }, {});
}
const topics = [...new Set(Object.values(QUESTION_SUBTOPICS).map(item => item.topic))];
const report = {
  version: 1,
  generatedAt: new Date().toISOString(),
  total: all.length,
  playable: playable.length,
  catalog: QUESTION_SUBTOPICS,
  topicCounts: counts(playable, item => item.classification.topic),
  subtopicCounts: counts(playable, item => item.classification.subtopic),
  geographicReviewCount: playable.filter(item => item.classification.geography.basis === "unresolved").length,
  subtopicReviewCount: playable.filter(item => item.classification.assignment === "fallback").length,
  questions: all.map(item => ({
    id: item.id, q: item.q, auditStatus: item.auditStatus,
    category: item.category, questionType: item.questionType, level: item.level,
    grades: item.grades, classification: item.classification,
  })),
};
writeFileSync(resolve(root, "data/question-taxonomy-report.json"), JSON.stringify(report, null, 2) + "\n");

const lines = ["# 題庫細分類", "", "主題、地理範圍、題型、難度和適用年級分開儲存。既有 `region` 與抽題規則保留。", "",
  `總題數 ${all.length}，可用 ${playable.length}。以下數量僅計可用題。`, "",
  "| 主題 | 細分類 | 題數 |", "|---|---|---:|"];
for (const topic of topics) {
  for (const [key, definition] of Object.entries(QUESTION_SUBTOPICS)) {
    const count = report.subtopicCounts[key] ?? 0;
    if (definition.topic === topic && count) lines.push(`| ${topic} | ${definition.label} | ${count} |`);
  }
}
lines.push("", "## 分類與校對方式", "",
  "分類採題幹規則，並支援 `data/question-classification-overrides.json` 按題目 ID 人工覆寫。它是可調整的第一版分類，並非已完成逐題人工審核。",
  "地理範圍由既有地區標籤及題幹中已知的國家／城市推導，不讀取干擾選項；國家清單是題幹的地理參照，不一定是答案或唯一所在地。",
  `可用題中有 ${report.geographicReviewCount} 題的地理範圍仍待確認；不強制以「全球」代替未知所在地。`,
  `另有 ${report.subtopicReviewCount} 題暫列綜合類，待人工細分。`,
  "細分類僅儲存於題庫及匯出資料，不加入答題 API 的公開題目，避免國家資訊透露答案。",
  "暖身題已補齊原有主題分類。世界遺產保留為原分類及跨主題標籤，可同時屬於自然地理或文化地標。",
  "未改寫正解、題目 ID、難度、年級或每關抽題規則；校對發現三題錯誤或歧義，已另行停用並記錄查證來源。", "");
mkdirSync(resolve(root, "docs"), { recursive: true });
writeFileSync(resolve(root, "docs/QUESTION-TAXONOMY.md"), lines.join("\n"));
console.log(JSON.stringify({ total: report.total, playable: report.playable, topics: report.topicCounts,
  activeSubtopics: Object.keys(report.subtopicCounts).length, geographicReviewCount: report.geographicReviewCount }));
