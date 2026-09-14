import { warmupQuestions, allQuestions } from "../lib/questions.ts";

const all = [...warmupQuestions, ...allQuestions].filter((q) => q.auditStatus === "approved");
for (const q of all.filter((item) => !item.visual)) {
  console.log(JSON.stringify({ q: q.q, region: q.region, category: q.category, level: q.level }));
}
