import { warmupQuestions, allQuestions } from "../lib/questions.ts";
import { getLandmarkImage, landmarkImages } from "../lib/landmark-images.ts";

const all = [...warmupQuestions, ...allQuestions];
const mapFallback = new Set();
const noVisual = [];
const photoLabels = new Set();

for (const q of all) {
  if (!q.visual) {
    noVisual.push(q.q);
    continue;
  }
  if (q.visual.type === "map") mapFallback.add(q.visual.label);
  if (q.visual.type === "photo") photoLabels.add(q.visual.label);
}

console.log("No visual:", noVisual.length);
noVisual.slice(0, 10).forEach((q) => console.log(" -", q));

console.log("\nMap fallback labels:", mapFallback.size);
[...mapFallback].sort().forEach((label) => {
  const hasKey = landmarkImages[label] ? "HAS" : "MISSING";
  console.log(` - ${label} (${hasKey})`);
});

console.log("\nPhoto labels:", photoLabels.size);
const missingImageKey = [...photoLabels].filter((label) => !getLandmarkImage(label));
console.log("Photo labels missing image key:", missingImageKey.length);
missingImageKey.forEach((label) => console.log(" -", label));
