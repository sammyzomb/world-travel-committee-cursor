import type { QuestionVisualData } from "../components/question-visual";
import {
  educationStages,
  FINAL_STAGE_INDEX,
  passRequiredForStage,
  POINTS_PER_CORRECT,
  questionsPerStage,
  STARTING_LIVES,
} from "./game-config";
import type { AnswerFeedback, ClientRunState, PublicQuestion } from "./game-client-types";
import { getStageAt, getStageIndex, getStageLength, isGraduationStage } from "./game-round";
import type { RunAnswerRecord } from "./leaderboard-scoring";
import type { IssuedQuestion, RunEndReason, StoredRunSession } from "./run-session";

type IssuedQuestionSource = {
  id: string;
  conceptId: string;
  q: string;
  options: string[];
  answer: number;
  fact: string;
  level: string;
  region: string;
  kind?: "tf" | "choice";
  category?: "世界地理" | "旅行知識" | "世界遺產";
  questionType?: string;
  visual?: QuestionVisualData;
};

export type SubmitAnswerInput = {
  questionId: string;
  selectedOption: string;
  progressRevision: number;
};

export type EngineMutationResult = {
  session: StoredRunSession;
  state: ClientRunState;
  idempotent?: boolean;
};

export class RunSessionEngineError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export function toIssuedQuestion(
  question: IssuedQuestionSource,
  stageIndex: number,
): IssuedQuestion {
  return {
    questionId: question.id,
    conceptId: question.conceptId,
    stageIndex,
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
  };
}

export function toPublicQuestion(issued: IssuedQuestion): PublicQuestion {
  return {
    id: issued.questionId,
    conceptId: issued.conceptId,
    q: issued.q,
    options: issued.options,
    level: issued.level,
    region: issued.region,
    kind: issued.kind,
    category: issued.category,
    questionType: issued.questionType,
    visual: issued.visual,
  };
}

function factLabel(issued: IssuedQuestion) {
  return issued.visual?.label ?? issued.region ?? issued.category ?? "旅遊知識";
}

function buildRunRecap(answers: RunAnswerRecord[], issuedById: Map<string, IssuedQuestion>) {
  const correctCount = answers.filter((item) => item.correct).length;
  const wrongAnswers = answers.filter((item) => !item.correct);
  const conceptIds = new Set(answers.map((item) => item.conceptId));

  const wrongHighlights = wrongAnswers.slice(-2).map((answer) => {
    const issued = issuedById.get(answer.questionId);
    return {
      label: issued ? factLabel(issued) : "旅遊知識",
      fact: issued?.fact ?? "",
      correct: false,
    };
  });

  const correctHighlights = answers
    .filter((item) => item.correct)
    .slice(-3)
    .map((answer) => {
      const issued = issuedById.get(answer.questionId);
      return {
        label: issued ? factLabel(issued) : "旅遊知識",
        fact: issued?.fact ?? "",
        correct: true,
      };
    });

  const highlights = [...wrongHighlights, ...correctHighlights]
    .filter((item) => item.fact)
    .slice(0, 4);

  return {
    totalAnswered: answers.length,
    correctCount,
    wrongCount: answers.length - correctCount,
    uniqueConcepts: conceptIds.size,
    highlights,
  };
}

function issuedById(issuedQuestions: IssuedQuestion[]) {
  return new Map(issuedQuestions.map((item) => [item.questionId, item]));
}

function lastPlayableStageIndex(session: StoredRunSession) {
  return Math.max(0, session.stageStarts.length - 1);
}

function isRunFinished(progress: StoredRunSession["progress"]) {
  return Boolean(progress.endReason || progress.endedEarly || progress.fullCompletion);
}

function displayQuestionIndex(session: StoredRunSession) {
  if (session.progress.lastFeedback) {
    return Math.max(0, session.progress.currentIndex - 1);
  }
  return session.progress.currentIndex;
}

function currentIssued(session: StoredRunSession) {
  const index = displayQuestionIndex(session);
  return session.issuedQuestions[index] ?? null;
}

function expectedQuestion(session: StoredRunSession) {
  if (session.progress.lastFeedback) return null;
  return session.issuedQuestions[session.progress.currentIndex] ?? null;
}

function matchesLastAnswer(session: StoredRunSession, questionId: string, selectedOption: string) {
  const lastAnswer = session.progress.answers[session.progress.answers.length - 1];
  return (
    lastAnswer?.questionId === questionId &&
    lastAnswer?.selectedOption === selectedOption &&
    session.progress.lastFeedback?.selectedOption === selectedOption
  );
}

function resolveScreen(session: StoredRunSession): ClientRunState["screen"] {
  if (session.progress.lastFeedback) return "play";
  if (session.progress.pendingReward) return "reward";
  if (isRunFinished(session.progress)) return "result";
  return session.progress.currentIndex >= session.issuedQuestions.length ? "result" : "play";
}

export function buildClientRunState(session: StoredRunSession): ClientRunState {
  const displayIndex =
    session.progress.currentIndex >= session.issuedQuestions.length
      ? Math.max(0, session.issuedQuestions.length - 1)
      : displayQuestionIndex(session);
  // Stage clear advances currentIndex to the next stage's first question before reward.
  const stageLookupIndex = session.progress.pendingReward
    ? Math.max(0, session.progress.currentIndex - 1)
    : displayIndex;
  const stageIndex = getStageIndex(session.stageStarts, stageLookupIndex);
  const stage = getStageAt(stageIndex);
  const nextStage = getStageAt(Math.min(stageIndex + 1, FINAL_STAGE_INDEX));
  const stageLength = getStageLength(
    session.stageStarts,
    session.issuedQuestions.length,
    stageIndex,
  );
  const stageStart = session.stageStarts[stageIndex] ?? 0;
  const stageQuestion = session.progress.pendingReward
    ? stageLength
    : Math.max(1, displayIndex - stageStart + 1);
  const issued = currentIssued(session);
  const screen = resolveScreen(session);

  return {
    sessionToken: session.sessionToken,
    questionBankVersion: session.questionBankVersion,
    progressRevision: session.progress.revision,
    screen,
    // Keep the answered public question visible beside feedback and the next button.
    // expectedQuestion()/submitAnswer() still enforce one answer per question.
    question: screen === "play" && issued ? toPublicQuestion(issued) : null,
    stage,
    nextStage,
    stageIndex,
    stageQuestion,
    stageLength,
    stageCorrect: session.progress.stageCorrect,
    passRequired: passRequiredForStage(stageLength),
    progress: session.progress.pendingReward
      ? 100
      : stageLength > 0
        ? (stageQuestion / stageLength) * 100
        : 0,
    score: session.progress.score,
    lives: session.progress.lives,
    runStreak: session.progress.runStreak,
    maxRunStreak: session.progress.maxRunStreak,
    endedEarly: session.progress.endedEarly,
    fullCompletion: session.progress.fullCompletion,
    endReason: session.progress.endReason,
    isGraduationStage: isGraduationStage(stageIndex),
    questionIndex: displayIndex,
    totalQuestions: session.issuedQuestions.length,
    feedback: session.progress.lastFeedback,
    runRecap:
      screen === "result"
        ? buildRunRecap(session.progress.answers, issuedById(session.issuedQuestions))
        : null,
  };
}

export function createInitialProgress() {
  return {
    revision: 0,
    currentIndex: 0,
    score: 0,
    lives: STARTING_LIVES,
    stageCorrect: 0,
    runStreak: 0,
    maxRunStreak: 0,
    endedEarly: false,
    fullCompletion: false,
    endReason: null as RunEndReason,
    pendingReward: false,
    answers: [] as RunAnswerRecord[],
    lastFeedback: null as AnswerFeedback | null,
  };
}

function finishRun(
  session: StoredRunSession,
  endReason: RunEndReason,
  options: { endedEarly?: boolean; fullCompletion?: boolean; pendingReward?: boolean } = {},
): EngineMutationResult {
  const progress = {
    ...session.progress,
    endReason,
    endedEarly: options.endedEarly ?? false,
    fullCompletion: options.fullCompletion ?? false,
    pendingReward: options.pendingReward ?? false,
  };
  const nextSession = { ...session, progress };
  return {
    session: nextSession,
    state: buildClientRunState(nextSession),
  };
}

export function submitAnswer(
  session: StoredRunSession,
  input: SubmitAnswerInput,
): EngineMutationResult {
  const trimmed = input.selectedOption.trim();
  if (!trimmed) {
    throw new RunSessionEngineError("selectedOption is required");
  }
  if (!input.questionId) {
    throw new RunSessionEngineError("questionId is required");
  }
  if (!Number.isInteger(input.progressRevision) || input.progressRevision < 0) {
    throw new RunSessionEngineError("progressRevision is required");
  }

  if (session.progress.lastFeedback) {
    if (matchesLastAnswer(session, input.questionId, trimmed)) {
      return { session, state: buildClientRunState(session), idempotent: true };
    }
    throw new RunSessionEngineError("請先確認上一題結果後再作答");
  }

  if (isRunFinished(session.progress) || session.progress.pendingReward) {
    throw new RunSessionEngineError("場次已結束，無法繼續作答");
  }

  if (input.progressRevision !== session.progress.revision) {
    const pendingIssued = session.issuedQuestions[session.progress.currentIndex];
    const previousIssued = session.issuedQuestions[session.progress.currentIndex - 1];
    const matchesPending =
      pendingIssued?.questionId === input.questionId &&
      matchesLastAnswer(session, input.questionId, trimmed);
    const matchesPrevious =
      previousIssued?.questionId === input.questionId &&
      matchesLastAnswer(session, input.questionId, trimmed);
    if (matchesPending || matchesPrevious) {
      return { session, state: buildClientRunState(session), idempotent: true };
    }
    throw new RunSessionEngineError("進度已更新，請重新載入後再作答", 409);
  }

  const issued = expectedQuestion(session);
  if (!issued) {
    throw new RunSessionEngineError("沒有可作答的題目");
  }
  if (issued.questionId !== input.questionId) {
    throw new RunSessionEngineError("題目已變更，請重新載入後再作答", 409);
  }

  const selectedIndex = issued.options.indexOf(trimmed);
  if (selectedIndex < 0) {
    throw new RunSessionEngineError(`invalid selectedOption for ${issued.questionId}`);
  }

  const isCorrect = trimmed === issued.correctAnswer;
  const stageIndex = issued.stageIndex;
  const answer: RunAnswerRecord = {
    questionId: issued.questionId,
    conceptId: issued.conceptId,
    stageIndex,
    selected: selectedIndex,
    selectedOption: trimmed,
    correct: isCorrect,
  };

  const progress = { ...session.progress };
  progress.answers = [...progress.answers, answer];
  progress.lastFeedback = {
    isCorrect,
    correctAnswer: issued.correctAnswer,
    correctIndex: issued.options.indexOf(issued.correctAnswer),
    selectedIndex,
    selectedOption: trimmed,
    fact: issued.fact,
  };

  if (isCorrect) {
    progress.score += POINTS_PER_CORRECT;
    progress.stageCorrect += 1;
    progress.runStreak += 1;
    progress.maxRunStreak = Math.max(progress.maxRunStreak, progress.runStreak);
  } else {
    progress.runStreak = 0;
    progress.lives -= 1;
  }

  progress.currentIndex += 1;
  progress.revision = session.progress.revision + 1;
  const nextSession = { ...session, progress };

  if (progress.lives <= 0) {
    return finishRun(nextSession, "lives_exhausted", { endedEarly: true });
  }

  const stageLength = getStageLength(
    session.stageStarts,
    session.issuedQuestions.length,
    stageIndex,
  );
  const stageStart = session.stageStarts[stageIndex] ?? 0;
  const finishedStage = progress.currentIndex - stageStart >= stageLength;

  if (!finishedStage) {
    return {
      session: nextSession,
      state: buildClientRunState(nextSession),
    };
  }

  const passRequired = passRequiredForStage(stageLength);
  if (progress.stageCorrect < passRequired) {
    return finishRun(nextSession, "stage_failed", { endedEarly: true });
  }

  if (stageIndex >= FINAL_STAGE_INDEX) {
    return finishRun(nextSession, "full_completion", { fullCompletion: true });
  }

  const lastPlayable = lastPlayableStageIndex(session);
  if (stageIndex >= lastPlayable && session.exhausted) {
    return finishRun(nextSession, "question_pool_exhausted");
  }

  progress.pendingReward = true;
  return {
    session: nextSession,
    state: buildClientRunState(nextSession),
  };
}

export function advanceAfterFeedback(
  session: StoredRunSession,
  progressRevision: number,
): EngineMutationResult {
  if (!session.progress.lastFeedback) {
    if (session.progress.revision === progressRevision) {
      return { session, state: buildClientRunState(session), idempotent: true };
    }
    throw new RunSessionEngineError("目前沒有待確認的作答結果");
  }
  if (progressRevision !== session.progress.revision) {
    if (session.progress.revision > progressRevision && !session.progress.lastFeedback) {
      return { session, state: buildClientRunState(session), idempotent: true };
    }
    throw new RunSessionEngineError("進度已更新，請重新載入", 409);
  }

  const progress = {
    ...session.progress,
    lastFeedback: null,
    revision: session.progress.revision + 1,
  };
  const nextSession = { ...session, progress };
  return {
    session: nextSession,
    state: buildClientRunState(nextSession),
  };
}

export function continueAfterReward(
  session: StoredRunSession,
  progressRevision: number,
): EngineMutationResult {
  if (!session.progress.pendingReward) {
    if (session.progress.revision === progressRevision) {
      return { session, state: buildClientRunState(session), idempotent: true };
    }
    throw new RunSessionEngineError("目前不在升級獎勵階段");
  }
  if (progressRevision !== session.progress.revision) {
    throw new RunSessionEngineError("進度已更新，請重新載入", 409);
  }

  const progress = {
    ...session.progress,
    pendingReward: false,
    stageCorrect: 0,
    lastFeedback: null,
    revision: session.progress.revision + 1,
  };
  const nextSession = { ...session, progress };
  return {
    session: nextSession,
    state: buildClientRunState(nextSession),
  };
}

export function getServerRunScore(session: StoredRunSession) {
  const answers = session.progress.answers;
  const correctCount = answers.filter((item) => item.correct).length;
  return {
    correctCount,
    score: correctCount * POINTS_PER_CORRECT,
    answers,
    endedEarly: session.progress.endedEarly,
    fullCompletion: session.progress.fullCompletion,
    endReason: session.progress.endReason,
  };
}
