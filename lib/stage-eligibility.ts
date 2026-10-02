import { questionDemand, minDemandForStage, isLocationRecall } from "./question-demand";
import { educationStages } from "./game-config";
import {
  allowedTypesForStage,
  difficultyRankForLevel,
  includesTravelKnowledge,
  minQuestionLevelRankForStage,
  QUESTION_TYPE_RANK,
  type QuestionType,
} from "./question-types";
import type { Question } from "./questions";
import { isPlayableTravelContent } from './travel-focus';

export type StageRuleViolation = {
  questionId: string;
  stageIndex: number;
  grade: string;
  reason: string;
};

function questionGradesAllowStage(question: Question, stageIndex: number) {
  if (question.grades.length === 0) return true;
  const grade = educationStages[stageIndex]?.name;
  return grade ? question.grades.includes(grade) : false;
}

export function isReviewedForPrimary(question: Question, stageIndex: number) {
  if (stageIndex > 5 || question.kind === "tf") return true;
  // 舊定位題只可出現在小五以前，仍受每關一題上限限制。
  if (stageIndex <= 4 && isLocationRecall(question.q) && question.grades.length === 0) return true;
  return question.grades.includes(educationStages[stageIndex]?.name);
}

export function questionMatchesStageRules(question: Question, stageIndex: number) {
  if (question.auditStatus !== "approved") return false;
  if (!isPlayableTravelContent(question)) return false;
  if (!isReviewedForPrimary(question, stageIndex)) return false;
  if (stageIndex <= 5 && questionDemand(question) > 2) return false;
  if (questionDemand(question) < minDemandForStage(stageIndex)) return false;
  if (question.kind !== "tf" && question.options[question.answer]?.length >= 2 && question.q.includes(question.options[question.answer])) return false;
  if (stageIndex === 0) {
    if (question.kind === "tf") {
      return question.auditStatus === "approved";
    }
    return question.level === "旅行新手";
  }

  if (!questionGradesAllowStage(question, stageIndex)) {
    return false;
  }

  const stage = educationStages[stageIndex];
  if (!(stage.pool as readonly string[]).includes(question.level)) {
    return false;
  }

  const allowedTypes = new Set<QuestionType>(allowedTypesForStage(stageIndex));
  if (!allowedTypes.has(question.questionType)) return false;

  const minTypeRank = 0;
  const minLevelRank = minQuestionLevelRankForStage(stageIndex);
  const typeRank = QUESTION_TYPE_RANK[question.questionType];
  const levelRank = difficultyRankForLevel(question.level);
  if (levelRank < minLevelRank) return false;
  if (typeRank + levelRank * 0.3 < minTypeRank - 0.5) return false;

  if (
    question.category === "旅行知識" &&
    includesTravelKnowledge(stageIndex) &&
    question.auditStatus !== "approved"
  ) {
    return false;
  }

  return true;
}

export function describeStageRuleViolation(question: Question, stageIndex: number): string {
  if (question.auditStatus !== "approved") return "題目尚未核准";
  if (!isReviewedForPrimary(question, stageIndex)) return "國小題缺少此年級的內容審查";
  if (stageIndex <= 5 && questionDemand(question) > 2) return "進階推理不適用國小關卡";
  if (questionDemand(question) < minDemandForStage(stageIndex)) return "認知要求低於此關下限";
  if (question.kind !== "tf" && question.options[question.answer]?.length >= 2 && question.q.includes(question.options[question.answer])) return "題幹含有正確答案";
  if (stageIndex === 0) {
    if (question.kind === "tf") {
      return question.auditStatus === "approved" ? "" : "暖身題未核准";
    }
    if (question.level !== "旅行新手") return `小一正式題難度不符：${question.level}`;
    return "";
  }

  const stage = educationStages[stageIndex];
  if (!questionGradesAllowStage(question, stageIndex)) {
    const allowed = question.grades.join("、");
    return `此題僅適用 ${allowed}`;
  }

  if (!(stage.pool as readonly string[]).includes(question.level)) {
    return `難度 ${question.level} 不在 ${stage.name} pool`;
  }

  const allowedTypes = new Set<QuestionType>(allowedTypesForStage(stageIndex));
  if (!allowedTypes.has(question.questionType)) {
    return `題型 ${question.questionType} 不適用 ${stage.name}`;
  }

  const minLevelRank = minQuestionLevelRankForStage(stageIndex);
  const levelRank = difficultyRankForLevel(question.level);
  if (levelRank < minLevelRank) {
    return `題目難度等級過低（${question.level}）`;
  }

  const minTypeRank = 0;
  const typeRank = QUESTION_TYPE_RANK[question.questionType];
  if (typeRank + levelRank * 0.3 < minTypeRank - 0.5) {
    return `題型／難度組合低於 ${stage.name} 下限`;
  }

  return "";
}

export function auditQuestionForStage(question: Question, stageIndex: number): StageRuleViolation | null {
  if (questionMatchesStageRules(question, stageIndex)) return null;
  const reason = describeStageRuleViolation(question, stageIndex) || "不符合當級規則";
  return {
    questionId: question.id,
    stageIndex,
    grade: educationStages[stageIndex]?.name ?? `stage-${stageIndex}`,
    reason,
  };
}
