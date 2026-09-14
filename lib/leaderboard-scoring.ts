import {
  educationStages,
  MAX_RUN_QUESTIONS,
  passRequiredForStage,
  POINTS_PER_CORRECT,
  questionsPerStage,
  STARTING_LIVES,
} from "./game-config";
import { QUESTION_BANK_VERSION } from "./question-bank-version";
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
    if (question.conceptId !== answer.conceptId) {
      return { ok: false as const, error: `conceptId mismatch for ${answer.questionId}` };
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
  questionBankVersion: string;
  answers: RunAnswerRecord[];
  endedEarly: boolean;
};

export { QUESTION_BANK_VERSION };

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
    const required = passRequiredForStage(answeredInStage);
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
  const finalStageAnswers = answers.filter((item) => item.stageIndex === FINAL_STAGE_INDEX).length;
  const required = passRequiredForStage(
    finalStageAnswers > 0 ? finalStageAnswers : questionsPerStage(FINAL_STAGE_INDEX),
  );
  return (counts.get(FINAL_STAGE_INDEX) ?? 0) >= required;
}

export function stageReachedName(stageIndex: number) {
  return educationStages[Math.max(0, Math.min(stageIndex, FINAL_STAGE_INDEX))]?.name ?? "小一";
}

/** 驗證學級進度：必須從小一連續作答，已完成學級須達通關題數與答對門檻。 */
export function validateRunProgress(answers: RunAnswerRecord[], endedEarly: boolean) {
  if (answers.length === 0) return "answers are required";
  if (answers[0].stageIndex !== 0) return "run must start at stage 0";

  const stageBlocks: RunAnswerRecord[][] = [];
  let currentStage = 0;
  let block: RunAnswerRecord[] = [];

  for (const answer of answers) {
    if (answer.stageIndex < currentStage) {
      return "answers must be grouped by ascending stageIndex";
    }
    if (answer.stageIndex > currentStage) {
      if (answer.stageIndex !== currentStage + 1) {
        return "non-contiguous stage progression";
      }
      stageBlocks.push(block);
      block = [];
      currentStage = answer.stageIndex;
    }
    if (answer.stageIndex !== currentStage) {
      return "invalid stageIndex ordering";
    }
    block.push(answer);
  }
  if (block.length > 0) stageBlocks.push(block);

  for (let stageIndex = 0; stageIndex < stageBlocks.length; stageIndex += 1) {
    const stageAnswers = stageBlocks[stageIndex];
    const expectedCount = questionsPerStage(stageIndex);
    const isLastBlock = stageIndex === stageBlocks.length - 1;
    const correctCount = stageAnswers.filter((item) => item.correct).length;
    const passRequired = passRequiredForStage(expectedCount);

    if (stageAnswers.length > expectedCount) {
      return `too many answers in stage ${stageIndex}`;
    }

    if (!isLastBlock) {
      if (stageAnswers.length !== expectedCount) {
        return `stage ${stageIndex} must be complete before advancing`;
      }
      if (correctCount < passRequired) {
        return `stage ${stageIndex} pass requirement not met`;
      }
      continue;
    }

    if (!endedEarly) {
      if (stageIndex !== FINAL_STAGE_INDEX) {
        return "incomplete run marked as not ended early";
      }
      if (stageAnswers.length !== expectedCount) {
        return "final stage must be complete";
      }
      if (correctCount < passRequired) {
        return "final stage pass requirement not met";
      }
    }
  }

  return null;
}

export function validateRunSubmission(payload: RunSubmission) {
  if (!payload.sessionToken || payload.sessionToken.length < 8) {
    return "sessionToken is required";
  }
  if (!payload.playerName.trim()) {
    return "playerName is required";
  }
  if (!payload.questionBankVersion) {
    return "questionBankVersion is required";
  }
  if (payload.questionBankVersion !== QUESTION_BANK_VERSION) {
    return "題庫已更新，請重新開始遊戲後再送出成績";
  }
  if (!Array.isArray(payload.answers) || payload.answers.length === 0) {
    return "answers are required";
  }
  if (payload.answers.length > MAX_RUN_QUESTIONS) {
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
