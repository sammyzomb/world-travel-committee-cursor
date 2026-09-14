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
import type { IssuedQuestion, StoredRunSession } from "./run-session";

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

function resolveScreen(session: StoredRunSession): ClientRunState["screen"] {
  if (session.progress.lastFeedback) return "play";
  if (session.progress.pendingReward) return "reward";
  if (session.progress.endedEarly || session.progress.fullCompletion) return "result";
  return session.progress.currentIndex >= session.issuedQuestions.length ? "result" : "play";
}

export function buildClientRunState(session: StoredRunSession): ClientRunState {
  const displayIndex =
    session.progress.currentIndex >= session.issuedQuestions.length
      ? Math.max(0, session.issuedQuestions.length - 1)
      : displayQuestionIndex(session);
  const stageIndex = getStageIndex(session.stageStarts, displayIndex);
  const stage = getStageAt(stageIndex);
  const nextStage = getStageAt(Math.min(stageIndex + 1, FINAL_STAGE_INDEX));
  const stageLength = getStageLength(
    session.stageStarts,
    session.issuedQuestions.length,
    stageIndex,
  );
  const stageStart = session.stageStarts[stageIndex] ?? 0;
  const stageQuestion = Math.max(1, displayIndex - stageStart + 1);
  const issued = currentIssued(session);
  const screen = resolveScreen(session);

  return {
    sessionToken: session.sessionToken,
    questionBankVersion: session.questionBankVersion,
    screen,
    question: screen === "play" && issued ? toPublicQuestion(issued) : null,
    stage,
    nextStage,
    stageIndex,
    stageQuestion,
    stageLength,
    stageCorrect: session.progress.stageCorrect,
    passRequired: passRequiredForStage(stageLength),
    progress: stageLength > 0 ? (stageQuestion / stageLength) * 100 : 0,
    score: session.progress.score,
    lives: session.progress.lives,
    runStreak: session.progress.runStreak,
    maxRunStreak: session.progress.maxRunStreak,
    endedEarly: session.progress.endedEarly,
    fullCompletion: session.progress.fullCompletion,
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
    currentIndex: 0,
    score: 0,
    lives: STARTING_LIVES,
    stageCorrect: 0,
    runStreak: 0,
    maxRunStreak: 0,
    endedEarly: false,
    fullCompletion: false,
    pendingReward: false,
    answers: [] as RunAnswerRecord[],
    lastFeedback: null as AnswerFeedback | null,
  };
}

export function submitAnswer(
  session: StoredRunSession,
  selectedOption: string,
): { session: StoredRunSession; state: ClientRunState } {
  if (session.progress.pendingReward || session.progress.endedEarly || session.progress.fullCompletion) {
    throw new Error("場次已結束，無法繼續作答");
  }

  const issued = currentIssued(session);
  if (!issued) {
    throw new Error("沒有可作答的題目");
  }

  const trimmed = selectedOption.trim();
  if (!trimmed) {
    throw new Error("selectedOption is required");
  }

  const selectedIndex = issued.options.indexOf(trimmed);
  if (selectedIndex < 0) {
    throw new Error(`invalid selectedOption for ${issued.questionId}`);
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
    if (progress.lives <= 0) {
      progress.endedEarly = true;
    }
  }

  progress.currentIndex += 1;

  if (progress.endedEarly) {
    return {
      session: { ...session, progress },
      state: buildClientRunState({ ...session, progress }),
    };
  }

  const stageLength = getStageLength(
    session.stageStarts,
    session.issuedQuestions.length,
    stageIndex,
  );
  const stageStart = session.stageStarts[stageIndex] ?? 0;
  const finishedStage = progress.currentIndex - stageStart >= stageLength;

  if (finishedStage) {
    const passRequired = passRequiredForStage(stageLength);
    if (progress.stageCorrect < passRequired) {
      progress.endedEarly = true;
      return {
        session: { ...session, progress },
        state: buildClientRunState({ ...session, progress }),
      };
    }

    if (stageIndex >= FINAL_STAGE_INDEX) {
      progress.fullCompletion = true;
      return {
        session: { ...session, progress },
        state: buildClientRunState({ ...session, progress }),
      };
    }

    progress.pendingReward = true;
    return {
      session: { ...session, progress },
      state: buildClientRunState({ ...session, progress }),
    };
  }

  return {
    session: { ...session, progress },
    state: buildClientRunState({ ...session, progress }),
  };
}

export function advanceAfterFeedback(session: StoredRunSession): ClientRunState {
  const progress = { ...session.progress, lastFeedback: null };
  return buildClientRunState({ ...session, progress });
}

export function continueAfterReward(session: StoredRunSession): ClientRunState {
  if (!session.progress.pendingReward) {
    throw new Error("目前不在升級獎勵階段");
  }

  const progress = {
    ...session.progress,
    pendingReward: false,
    stageCorrect: 0,
    lastFeedback: null,
  };

  return buildClientRunState({ ...session, progress });
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
  };
}
