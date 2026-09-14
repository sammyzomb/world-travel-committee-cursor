#!/usr/bin/env node
/**
 * 產生題庫與圖片人工審核清單（JSON）。
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { educationStages } from "../lib/game-config.ts";
import { landmarkImages } from "../lib/landmark-images.ts";
import {
  allQuestions,
  approvedQuestions,
  warmupQuestions,
} from "../lib/questions.ts";
import { QUESTION_BANK_VERSION } from "../lib/question-bank-version.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const auditJson = JSON.parse(readFileSync(resolve(root, "data/question-audit.json"), "utf8"));
const overrides = auditJson.overrides ?? {};

const SOURCE_URLS = {
  "REST Countries": "https://restcountries.com/",
  "世界遺產題庫": "https://whc.unesco.org/",
  "內建精選題庫": "internal://data/questions.json#questions",
  "內建旅行知識": "internal://data/questions.json#travelKnowledgeQuestions",
  "內建行程題庫": "internal://data/questions.json#tourQuestions",
  "內建送分題庫": "internal://data/questions.json#warmupQuestions",
};

function sourceUrlFor(question) {
  const base = question.source.replace(/（.+）$/, "");
  for (const [key, url] of Object.entries(SOURCE_URLS)) {
    if (base.includes(key)) return url;
  }
  if (question.source.includes("REST Countries")) return SOURCE_URLS["REST Countries"];
  return null;
}

function gradesForQuestion(question) {
  if (question.grades.length > 0) return question.grades;
  const matches = [];
  for (const [index, stage] of educationStages.entries()) {
    if (stage.pool.includes(question.level)) {
      matches.push(stage.name);
    }
  }
  return matches.length > 0 ? matches : ["未分級"];
}

const scorable = [...warmupQuestions, ...allQuestions];
const questionInventory = scorable.map((question) => {
  const override = overrides[question.id];
  const correctAnswer = question.options[question.answer] ?? "";
  return {
    questionId: question.id,
    conceptId: question.conceptId,
    questionText: question.q,
    correctAnswer,
    explanation: question.fact,
    sourceLabel: question.source,
    sourceUrl: sourceUrlFor(question),
    applicableGrades: gradesForQuestion(question),
    knowledgePoint: question.conceptId,
    questionType: question.questionType,
    level: question.level,
    category: question.category ?? null,
    auditStatus: question.auditStatus,
    reviewStatus: override
      ? {
          reviewer: override.reviewer ?? null,
          reviewedAt: override.reviewedAt ?? null,
          note: override.note ?? null,
        }
      : {
          reviewer: null,
          reviewedAt: null,
          note: question.auditStatus === "approved" ? "系統預設核准" : "待人工審核",
        },
    hasVisual: Boolean(question.visual),
    visualType: question.visual?.type ?? null,
    landmark: question.visual?.label ?? null,
  };
});

function parseCredit(credit) {
  const match = credit.match(/^Wikimedia Commons\s*\/\s*(.+)$/i);
  return match ? match[1].trim() : credit;
}

function commonsPageUrl(imageUrl) {
  if (!imageUrl.includes("upload.wikimedia.org")) return null;
  const fileName = decodeURIComponent(imageUrl.split("/").pop()?.replace(/^\d+px-/, "") ?? "");
  return `https://commons.wikimedia.org/wiki/File:${fileName}`;
}

const imageInventory = Object.entries(landmarkImages).map(([landmark, image]) => {
  const usedBy = scorable
    .filter((question) => question.visual?.type === "photo" && question.visual?.label === landmark)
    .map((question) => question.id);
  return {
    landmark,
    city: null,
    country: null,
    imageUrl: image.url,
    sourcePage: commonsPageUrl(image.url),
    author: parseCredit(image.credit),
    license: "Wikimedia Commons（依檔案授權，多為 CC）",
    credit: image.credit,
    matchesQuestion: usedBy.length > 0,
    usedByQuestionIds: usedBy,
    humanVerified: false,
    verificationNote: usedBy.length === 0 ? "尚未對應到題目" : "待人工確認地點與授權",
  };
});

const manifest = {
  version: 1,
  generatedAt: new Date().toISOString(),
  questionBankVersion: QUESTION_BANK_VERSION,
  totals: {
    questions: questionInventory.length,
    approved: questionInventory.filter((item) => item.auditStatus === "approved").length,
    pending: questionInventory.filter((item) => item.auditStatus === "pending").length,
    disabled: questionInventory.filter((item) => item.auditStatus === "disabled").length,
    scorableApproved: approvedQuestions.length + warmupQuestions.length,
    images: imageInventory.length,
    imagesLinkedToQuestions: imageInventory.filter((item) => item.matchesQuestion).length,
  },
};

writeFileSync(
  resolve(root, "data/question-audit-inventory.json"),
  JSON.stringify({ ...manifest, items: questionInventory }, null, 2) + "\n",
);
writeFileSync(
  resolve(root, "data/image-audit-inventory.json"),
  JSON.stringify({ ...manifest, items: imageInventory }, null, 2) + "\n",
);

console.log(JSON.stringify(manifest.totals, null, 2));
console.log("Wrote data/question-audit-inventory.json and data/image-audit-inventory.json");
