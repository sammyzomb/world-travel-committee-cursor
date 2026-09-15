import { educationStages } from "./game-config";
import {
  allowedTypesForStage,
  difficultyRankForLevel,
  includesTravelKnowledge,
  minQuestionLevelRankForStage,
  minTypeRankForStage,
  QUESTION_TYPE_RANK,
  type QuestionType,
} from "./question-types";
import type { Question } from "./questions";

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

export function questionMatchesStageRules(question: Question, stageIndex: number) {
  if (stageIndex === 0) {
    if (question.kind === "tf") {
      return question.auditStatus === "approved";
    }
    return question.level === "旅行新手" && question.kind !== "tf";
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

  const minTypeRank = minTypeRankForStage(stageIndex);
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
  if (stageIndex === 0) {
    if (question.kind === "tf") {
      return question.auditStatus === "approved" ? "" : "暖身題未核准";
    }
    if (question.level !== "旅行新手") return `小一正式題難度不符：${question.level}`;
    if (question.kind === "tf") return "小一正式題不可為是非題";
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

  const minTypeRank = minTypeRankForStage(stageIndex);
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
