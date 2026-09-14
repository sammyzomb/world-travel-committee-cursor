import {
  educationStages,
  passRequiredForStage,
  POINTS_PER_CORRECT,
  QUESTIONS_PER_STAGE,
  STARTING_LIVES,
} from "./game-config";
import { approvedQuestions, warmupQuestions } from "./questions";

export type RunAnswerRecord = {
  questionId: string;
  conceptId: string;
  stageIndex: number;
  selected: number;
  /** 玩家所選選項文字；伺服器以此重算正確與否，不信任 client 的 correct。 */
  selectedOption: string;
  correct: boolean;
};

const scorableQuestionById = new Map(
  [...warmupQuestions, ...approvedQuestions].map((item) => [item.id, item]),
);

export function verifyRunAnswers(answers: RunAnswerRecord[]) {
  const verified: RunAnswerRecord[] = [];
  for (const answer of answers) {
    const question = scorableQuestionById.get(answer.questionId);
    if (!question) {
      return { ok: false as const, error: `unknown questionId: ${answer.questionId}` };
    }
    const selectedOption = answer.selectedOption?.trim();
    if (!selectedOption) {
      return { ok: false as const, error: "selectedOption is required" };
    }
    if (!question.options.includes(selectedOption)) {
      return { ok: false as const, error: `invalid selectedOption for ${answer.questionId}` };
    }
    const correctText = question.options[question.answer];
    verified.push({ ...answer, correct: selectedOption === correctText });
  }
  return { ok: true as const, verified };
}

export { STARTING_LIVES };

export type RunSubmission = {
  sessionToken: string;
  playerName: string;
  answers: RunAnswerRecord[];
  endedEarly: boolean;
};

const FINAL_STAGE_INDEX = educationStages.length - 1;

export function computeRunScore(answers: RunAnswerRecord[]) {
  const correctCount = answers.filter((item) => item.correct).length;
  return {
    correctCount,
    score: correctCount * POINTS_PER_CORRECT,
  };
}

export function stageCorrectCounts(answers: RunAnswerRecord[]) {
  const counts = new Map<number, number>();
  for (const answer of answers) {
    if (!answer.correct) continue;
    counts.set(answer.stageIndex, (counts.get(answer.stageIndex) ?? 0) + 1);
  }
  return counts;
}

export function highestPassedStageIndex(answers: RunAnswerRecord[], endedEarly: boolean) {
  let highestPassed = 0;
  const counts = stageCorrectCounts(answers);
  for (let stageIndex = 0; stageIndex < educationStages.length; stageIndex += 1) {
    const answeredInStage = answers.filter((item) => item.stageIndex === stageIndex).length;
    if (answeredInStage === 0) break;
    const required = passRequiredForStage(QUESTIONS_PER_STAGE);
    if ((counts.get(stageIndex) ?? 0) >= required) {
      highestPassed = stageIndex;
      continue;
    }
    if (endedEarly) return stageIndex;
    break;
  }
  return highestPassed;
}

export function isFullCompletion(answers: RunAnswerRecord[], endedEarly: boolean) {
  if (endedEarly) return false;
  const counts = stageCorrectCounts(answers);
  const required = passRequiredForStage(QUESTIONS_PER_STAGE);
  return (counts.get(FINAL_STAGE_INDEX) ?? 0) >= required;
}

export function stageReachedName(stageIndex: number) {
  return educationStages[Math.max(0, Math.min(stageIndex, FINAL_STAGE_INDEX))]?.name ?? "小一";
}

export function validateRunSubmission(payload: RunSubmission) {
  if (!payload.sessionToken || payload.sessionToken.length < 8) {
    return "sessionToken is required";
  }
  if (!payload.playerName.trim()) {
    return "playerName is required";
  }
  if (!Array.isArray(payload.answers) || payload.answers.length === 0) {
    return "answers are required";
  }
  if (payload.answers.length > educationStages.length * QUESTIONS_PER_STAGE) {
    return "too many answers";
  }

  const seenQuestionIds = new Set<string>();
  const seenConceptIds = new Set<string>();
  for (const answer of payload.answers) {
    if (!answer.questionId || !answer.conceptId) {
      return "each answer must include questionId and conceptId";
    }
    if (!answer.selectedOption?.trim()) {
      return "each answer must include selectedOption";
    }
    if (seenQuestionIds.has(answer.questionId)) {
      return "duplicate questionId in run";
    }
    if (seenConceptIds.has(answer.conceptId)) {
      return "duplicate conceptId in run";
    }
    seenQuestionIds.add(answer.questionId);
    seenConceptIds.add(answer.conceptId);
    if (answer.stageIndex < 0 || answer.stageIndex >= educationStages.length) {
      return "invalid stageIndex";
    }
  }

  return null;
}
