import {
  educationStages,
  optionCountForStage,
  passRequiredForStage,
  POINTS_PER_CORRECT,
  questionsPerStage,
  STAGE_QUESTION_COUNTS,
  STARTING_LIVES,
} from "./game-config";
import { minDemandForStage } from "./question-demand";
import { approvedQuestions, warmupQuestions } from "./questions";

function fnv1a(input: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function scoringRulesPayload() {
  const stageRules = educationStages.map((stage, stageIndex) => {
    const count = questionsPerStage(stageIndex);
    return [
      stage.name,
      `pool=${stage.pool.join("+")}`,
      `opts=${optionCountForStage(stageIndex)}`,
      `demand=${minDemandForStage(stageIndex)}`,
      `familyCap=${stageIndex >= 9 ? 1 : 2};locationCap=1`,
      `count=${count}`,
      `pass=${passRequiredForStage(count)}`,
    ].join("|");
  });
  return [
    `lives:${STARTING_LIVES}`,
    `points:${POINTS_PER_CORRECT}`,
    `stageCounts:${STAGE_QUESTION_COUNTS.join(",")}`,
    ...stageRules,
  ].join("\n");
}

/** 可計分題目與規則的穩定版本；題幹、正解或通關規則變更時會更新。 */
export function computeQuestionBankVersion() {
  const questions = [...warmupQuestions, ...approvedQuestions]
    .map(
      (item) =>
        `${item.id}|${item.conceptId}|${item.auditStatus}|${item.q}|demand=${item.demand ?? "inferred"}|family=${item.family ?? "classified"}|grades=${item.grades.join(",")}|refs=${JSON.stringify(item.references ?? [])}|fact=${item.fact}|ans=${item.answer}|${item.options.join("\u001f")}`,
    )
    .sort()
    .join("\n");
  const payload = `${questions}\n---RULES---\n${scoringRulesPayload()}`;
  return `${fnv1a(payload)}${fnv1a([...payload].reverse().join(""))}`;
}

export const QUESTION_BANK_VERSION = computeQuestionBankVersion();
