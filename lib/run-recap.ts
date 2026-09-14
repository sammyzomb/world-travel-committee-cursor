import type { RunAnswerRecord } from "./leaderboard-scoring";
import { approvedQuestions, warmupQuestions } from "./questions";

const questionById = new Map(
  [...warmupQuestions, ...approvedQuestions].map((item) => [item.id, item]),
);

export type LearnedFact = {
  label: string;
  fact: string;
  correct: boolean;
};

export type RunRecap = {
  totalAnswered: number;
  correctCount: number;
  wrongCount: number;
  uniqueConcepts: number;
  highlights: LearnedFact[];
};

function factLabel(questionId: string) {
  const question = questionById.get(questionId);
  if (!question) return "旅遊知識";
  return question.visual?.label ?? question.landmark ?? question.region ?? question.category ?? "旅遊知識";
}

export function buildRunRecap(answers: RunAnswerRecord[]): RunRecap {
  const correctCount = answers.filter((item) => item.correct).length;
  const wrongAnswers = answers.filter((item) => !item.correct);
  const conceptIds = new Set(answers.map((item) => item.conceptId));

  const wrongHighlights = wrongAnswers.slice(-2).map((answer) => ({
    label: factLabel(answer.questionId),
    fact: questionById.get(answer.questionId)?.fact ?? "",
    correct: false,
  }));

  const correctHighlights = answers
    .filter((item) => item.correct)
    .slice(-3)
    .map((answer) => ({
      label: factLabel(answer.questionId),
      fact: questionById.get(answer.questionId)?.fact ?? "",
      correct: true,
    }));

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

export function streakCheerMessage(streak: number) {
  if (streak >= 10) return "超神連勝！地理達人模式";
  if (streak >= 7) return "七連勝！狀態火熱";
  if (streak >= 5) return "五連勝！越玩越順";
  if (streak >= 3) return "三連勝！保持節奏";
  return "";
}
