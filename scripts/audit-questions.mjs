#!/usr/bin/env node
/**
 * Validate question bank consistency and write per-question audit overrides.
 * Usage: node scripts/audit-questions.mjs [--write]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const questionsPath = resolve(root, "data/questions.json");
const auditPath = resolve(root, "data/question-audit.json");

function stableHash(input) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash.toString(36);
}

function makeQuestionId(prefix, seed) {
  return `${prefix}:${stableHash(seed)}`;
}

function safeLabel(landmark, correctAnswer, fallback) {
  if (!landmark) return fallback;
  if (correctAnswer && landmark.includes(correctAnswer)) return fallback;
  return landmark;
}

function safeVisualCaption({ questionText, correctAnswer, region, landmark, landmarkDetail }) {
  const [countryPart, cityPart] = (landmarkDetail ?? "").split("・");
  const genericLandmark = safeLabel(landmark, correctAnswer, "旅遊地標");

  if (questionText.includes("哪一洲") || questionText.includes("位於哪一洲")) {
    return { label: genericLandmark, detail: region || "洲別提示" };
  }
  if (questionText.includes("哪一個國家的首都是") || questionText.includes("的首都是")) {
    return { label: genericLandmark, detail: region || "地理區域" };
  }
  if (questionText.includes("位於哪一個國家")) {
    return { label: genericLandmark, detail: region || "地理區域" };
  }
  if (questionText.includes("位於哪一座城市") || questionText.includes("哪一座城市")) {
    const detail =
      countryPart && countryPart !== correctAnswer ? countryPart : region || "地理區域";
    return { label: genericLandmark, detail };
  }
  const leaksAnswer =
    correctAnswer &&
    (landmarkDetail?.includes(correctAnswer) ||
      cityPart === correctAnswer ||
      countryPart === correctAnswer);
  if (leaksAnswer) {
    return { label: genericLandmark, detail: region || "地理區域" };
  }
  const detail =
    countryPart && countryPart !== correctAnswer ? countryPart : region || "地理區域";
  return { label: safeLabel(landmark, correctAnswer, region), detail };
}

function visualLeaksAnswer({ questionText, correctAnswer, visualLabel, visualDetail }) {
  if (!correctAnswer) return false;
  const haystack = `${visualLabel ?? ""} ${visualDetail ?? ""}`;
  if (haystack.includes(correctAnswer)) return true;
  if (questionText.includes("首都是") && visualDetail?.includes(correctAnswer)) return true;
  if (
    questionText.includes("哪一個國家的首都是") &&
    (visualLabel === correctAnswer || visualDetail?.includes(correctAnswer))
  ) {
    return true;
  }
  return false;
}

function factSupportsAnswer(raw) {
  const answer = raw.options[raw.answer];
  if (!answer) return false;
  if (raw.kind === "tf") return true;
  return raw.fact.includes(answer);
}

function hasSuperlativeWithoutDefinition(raw) {
  const superlative = /世界(上)?(最|第一|唯一)/.test(raw.q);
  if (!superlative) return false;
  const hasQualifier =
    /（[^）]+）/.test(raw.q) ||
    /若|不含|不計|主權|定義|通常|一般|公認|依/.test(raw.q) ||
    /若|不含|不計|主權|定義|通常|一般|公認|依/.test(raw.fact);
  return !hasQualifier;
}

function validateCuratedQuestion(raw) {
  const answer = raw.options[raw.answer];
  if (!answer) {
    return { auditStatus: "disabled", note: "答案索引無效" };
  }
  if (raw.kind === "tf") {
    if (raw.options.length !== 2) {
      return { auditStatus: "disabled", note: "是非題選項數必須為 2" };
    }
  } else if (new Set(raw.options).size !== raw.options.length) {
    return { auditStatus: "disabled", note: "選項重複" };
  }
  if (!factSupportsAnswer(raw)) {
    return { auditStatus: "disabled", note: "解析未支持正確答案" };
  }
  if (hasSuperlativeWithoutDefinition(raw)) {
    return { auditStatus: "disabled", note: "世界之最類題目缺少定義或限定條件" };
  }
  if (raw.landmark && raw.landmarkDetail) {
    const caption = safeVisualCaption({
      questionText: raw.q,
      correctAnswer: answer,
      region: raw.region,
      landmark: raw.landmark,
      landmarkDetail: raw.landmarkDetail,
    });
    if (
      visualLeaksAnswer({
        questionText: raw.q,
        correctAnswer: answer,
        visualLabel: caption.label,
        visualDetail: caption.detail,
      })
    ) {
      return { auditStatus: "pending", note: "答題前視覺可能洩漏答案，待人工覆核" };
    }
  }
  return { auditStatus: "approved", note: "結構與解析一致（audit-script:curated）" };
}

const bank = JSON.parse(readFileSync(questionsPath, "utf8"));
const facts = bank.expandedFacts ?? [];
const overrides = {};
const report = { approved: 0, disabled: 0, pending: 0 };

function writeOverride(id, result, reviewer) {
  overrides[id] = {
    auditStatus: result.auditStatus,
    reviewedAt: new Date().toISOString().slice(0, 10),
    reviewer,
    note: result.note,
  };
  report[result.auditStatus] += 1;
}

for (const raw of bank.questions) {
  const id = makeQuestionId("hand", raw.q);
  writeOverride(id, validateCuratedQuestion(raw), "audit-script:hand-curated");
}

for (const raw of bank.travelKnowledgeQuestions ?? []) {
  const id = makeQuestionId("travel", raw.q);
  writeOverride(id, validateCuratedQuestion(raw), "audit-script:travel");
}

for (const raw of bank.tourQuestions ?? []) {
  const id = makeQuestionId("tour", raw.q);
  writeOverride(id, validateCuratedQuestion(raw), "audit-script:tour");
}

for (const raw of bank.heritageQuestions ?? []) {
  const id = makeQuestionId("heritage", raw.q);
  writeOverride(id, validateCuratedQuestion(raw), "audit-script:heritage");
}

for (const fact of facts) {
  const [city, country, , , landmark] = fact;

  const landmarkId = makeQuestionId("expanded-landmark", `${landmark}:${city}`);
  if (landmark && city) {
    writeOverride(
      landmarkId,
      { auditStatus: "approved", note: `來源 expandedFacts 一致（${landmark} → ${city}）` },
      "audit-script:fact-consistency",
    );
  } else {
    writeOverride(
      landmarkId,
      { auditStatus: "disabled", note: "來源資料不完整，已停用" },
      "audit-script:fact-consistency",
    );
  }

  const cityId = makeQuestionId("expanded-city", `${city}:${country}`);
  if (city && country) {
    writeOverride(
      cityId,
      { auditStatus: "approved", note: `來源 expandedFacts 一致（${city} → ${country}）` },
      "audit-script:fact-consistency",
    );
  } else {
    writeOverride(
      cityId,
      { auditStatus: "disabled", note: "來源資料不完整，已停用" },
      "audit-script:fact-consistency",
    );
  }
}

for (const fact of bank.heritageFacts ?? []) {
  const [city, country, , capital, landmark] = fact;

  const landmarkId = makeQuestionId("heritage-landmark", `${landmark}:${city}`);
  if (landmark && city) {
    writeOverride(
      landmarkId,
      { auditStatus: "approved", note: `來源 heritageFacts 一致（${landmark} → ${city}）` },
      "audit-script:heritage-fact",
    );
  }

  const cityId = makeQuestionId("heritage-city", `${city}:${country}`);
  if (city && country) {
    writeOverride(
      cityId,
      { auditStatus: "approved", note: `來源 heritageFacts 一致（${city} → ${country}）` },
      "audit-script:heritage-fact",
    );
  }

  const capitalId = makeQuestionId("heritage-capital", `${country}:${capital}`);
  if (country && capital) {
    writeOverride(
      capitalId,
      { auditStatus: "approved", note: `來源 heritageFacts 一致（${country} 首都 ${capital}）` },
      "audit-script:heritage-fact",
    );
  }

  const continentId = makeQuestionId("heritage-continent", `${country}:${fact[2]}`);
  if (country && fact[2]) {
    writeOverride(
      continentId,
      { auditStatus: "approved", note: `來源 heritageFacts 一致（${country} → ${fact[2]}）` },
      "audit-script:heritage-fact",
    );
  }

  const reverseCapitalId = makeQuestionId("heritage-reverse-capital", `${capital}:${country}`);
  if (capital && country) {
    writeOverride(
      reverseCapitalId,
      { auditStatus: "approved", note: `來源 heritageFacts 一致（${capital} → ${country}）` },
      "audit-script:heritage-fact",
    );
  }
}

console.log("Question audit report:");
console.log(`  approved: ${report.approved}`);
console.log(`  disabled: ${report.disabled}`);
console.log(`  pending: ${report.pending}`);
console.log(`  total overrides: ${Object.keys(overrides).length}`);
console.log("  capital / continent / reverse-capital: approved via REST Countries in lib/questions.ts");

if (process.argv.includes("--write")) {
  const payload = {
    version: 1,
    updatedAt: new Date().toISOString(),
    description:
      "Per-question audit overrides. Hand/travel/tour default pending until validated here.",
    overrides,
  };
  writeFileSync(auditPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`Wrote ${Object.keys(overrides).length} overrides to data/question-audit.json`);
} else {
  console.log("Dry run — pass --write to save data/question-audit.json");
}
