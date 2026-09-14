import type { QuestionVisualData } from "../components/question-visual";
import {
  educationStages,
  passRequiredForStage,
  questionsPerStage,
  STARTING_LIVES,
} from "./game-config";
import { getStageIndex } from "./game-round";
import type { AnswerFeedback } from "./game-client-types";
import type { RunAnswerRecord } from "./leaderboard-scoring";

export type IssuedQuestion = {
  questionId: string;
  conceptId: string;
  stageIndex: number;
  options: string[];
  correctAnswer: string;
  fact: string;
  q: string;
  level: string;
  region: string;
  kind?: "tf" | "choice";
  category?: "世界地理" | "旅行知識" | "世界遺產";
  questionType?: string;
  visual?: QuestionVisualData;
};

export type RunSessionProgress = {
  currentIndex: number;
  score: number;
  lives: number;
  stageCorrect: number;
  runStreak: number;
  maxRunStreak: number;
  endedEarly: boolean;
  fullCompletion: boolean;
  pendingReward: boolean;
  answers: RunAnswerRecord[];
  lastFeedback: AnswerFeedback | null;
};

export type StoredRunSession = {
  sessionToken: string;
  questionBankVersion: string;
  issuedQuestions: IssuedQuestion[];
  stageStarts: number[];
  exhausted: boolean;
  createdAt: string;
  expiresAt: string;
  progress: RunSessionProgress;
};

export const RUN_SESSION_TTL_MS = 24 * 60 * 60 * 1000;

export function issuedQuestionsFromPlan(
  questions: Array<{
    id: string;
    conceptId: string;
    options: string[];
    answer: number;
    fact: string;
    q: string;
    level: string;
    region: string;
    kind?: "tf" | "choice";
    category?: "世界地理" | "旅行知識" | "世界遺產";
    questionType?: string;
    visual?: QuestionVisualData;
  }>,
  stageStarts: number[],
): IssuedQuestion[] {
  return questions.map((question, index) => ({
    questionId: question.id,
    conceptId: question.conceptId,
    stageIndex: getStageIndex(stageStarts, index),
    options: [...question.options],
    correctAnswer: question.options[question.answer] ?? "",
    fact: question.fact,
    q: question.q,
    level: question.level,
    region: question.region,
    kind: question.kind,
    category: question.category,
    questionType: question.questionType,
    visual: question.visual,
  }));
}

export function verifyAnswersAgainstIssued(
  issued: IssuedQuestion[],
  answers: RunAnswerRecord[],
) {
  const verified: RunAnswerRecord[] = [];
  for (let index = 0; index < answers.length; index += 1) {
    const answer = answers[index];
    const expected = issued[index];
    if (!expected) {
      return { ok: false as const, error: "answers exceed issued question count" };
    }
    if (answer.questionId !== expected.questionId) {
      return { ok: false as const, error: `question order mismatch at index ${index}` };
    }
    if (answer.conceptId !== expected.conceptId) {
      return { ok: false as const, error: `conceptId mismatch for ${answer.questionId}` };
    }
    if (answer.stageIndex !== expected.stageIndex) {
      return { ok: false as const, error: `stageIndex mismatch for ${answer.questionId}` };
    }
    const selectedOption = answer.selectedOption?.trim();
    if (!selectedOption) {
      return { ok: false as const, error: "selectedOption is required" };
    }
    if (!expected.options.includes(selectedOption)) {
      return { ok: false as const, error: `invalid selectedOption for ${answer.questionId}` };
    }
    verified.push({
      ...answer,
      correct: selectedOption === expected.correctAnswer,
    });
  }
  return { ok: true as const, verified };
}

/** 逐題驗證作答順序、學級與剩餘生命；第三次答錯後不得再有作答。 */
export function validateIssuedRunPlayback(
  issued: IssuedQuestion[],
  answers: RunAnswerRecord[],
  endedEarly: boolean,
) {
  if (answers.length === 0) return "answers are required";
  if (answers.length > issued.length) return "answers exceed issued question count";

  const verified = verifyAnswersAgainstIssued(issued, answers);
  if (!verified.ok) return verified.error;

  let lives = STARTING_LIVES;
  let deathIndex: number | null = null;

  for (let index = 0; index < verified.verified.length; index += 1) {
    if (deathIndex !== null) {
      return "answers submitted after lives exhausted";
    }
    if (!verified.verified[index].correct) {
      lives -= 1;
      if (lives <= 0) {
        deathIndex = index;
      }
    }
  }

  const wrongCount = verified.verified.filter((item) => !item.correct).length;
  if (wrongCount > STARTING_LIVES) {
    return "too many wrong answers";
  }

  if (deathIndex !== null) {
    if (verified.verified.length > deathIndex + 1) {
      return "answers submitted after lives exhausted";
    }
    if (!endedEarly) {
      return "endedEarly required after lives exhausted";
    }
  }

  if (!endedEarly) {
    const finalStageIndex = educationStages.length - 1;
    const finalIssued = issued.filter((item) => item.stageIndex === finalStageIndex);
    const finalAnswers = verified.verified.filter((item) => item.stageIndex === finalStageIndex);
    if (finalAnswers.length !== finalIssued.length) {
      return "final stage must be complete";
    }
    const passRequired = passRequiredForStage(questionsPerStage(finalStageIndex));
    const finalCorrect = finalAnswers.filter((item) => item.correct).length;
    if (finalCorrect < passRequired) {
      return "final stage pass requirement not met";
    }
  }

  const stageBlocks = new Map<number, RunAnswerRecord[]>();
  for (const answer of verified.verified) {
    const list = stageBlocks.get(answer.stageIndex) ?? [];
    list.push(answer);
    stageBlocks.set(answer.stageIndex, list);
  }

  const stageIndices = [...stageBlocks.keys()].sort((left, right) => left - right);
  for (let index = 0; index < stageIndices.length; index += 1) {
    if (stageIndices[index] !== index) {
      return "non-contiguous stage progression";
    }
  }

  const lastStageIndex = stageIndices[stageIndices.length - 1] ?? 0;
  for (const stageIndex of stageIndices) {
    const stageAnswers = stageBlocks.get(stageIndex) ?? [];
    const issuedInStage = issued.filter((item) => item.stageIndex === stageIndex);
    const isLastStage = stageIndex === lastStageIndex;

    if (!isLastStage) {
      if (stageAnswers.length !== issuedInStage.length) {
        return `stage ${stageIndex} must be complete before advancing`;
      }
      const passRequired = passRequiredForStage(questionsPerStage(stageIndex));
      const correctCount = stageAnswers.filter((item) => item.correct).length;
      if (correctCount < passRequired) {
        return `stage ${stageIndex} pass requirement not met`;
      }
    } else if (!endedEarly && stageIndex === educationStages.length - 1) {
      if (stageAnswers.length !== issuedInStage.length) {
        return "final stage must be complete";
      }
    }
  }

  return null;
}
