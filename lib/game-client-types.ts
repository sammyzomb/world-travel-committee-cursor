import type { QuestionVisualData } from "../components/question-visual";

/** 客戶端可見的題目（不含正解與解析）。 */
export type PublicQuestion = {
  id: string;
  conceptId: string;
  q: string;
  options: string[];
  level: string;
  region: string;
  kind?: "tf" | "choice";
  category?: "世界地理" | "旅行知識" | "世界遺產";
  questionType?: string;
  visual?: QuestionVisualData;
};

export type AnswerFeedback = {
  isCorrect: boolean;
  correctAnswer: string;
  correctIndex: number;
  selectedIndex: number;
  selectedOption: string;
  fact: string;
};

export type RunRecap = {
  totalAnswered: number;
  correctCount: number;
  wrongCount: number;
  uniqueConcepts: number;
  highlights: Array<{ label: string; fact: string; correct: boolean }>;
};

export type ClientRunState = {
  sessionToken: string;
  questionBankVersion: string;
  screen: "enroll" | "play" | "reward" | "result";
  question: PublicQuestion | null;
  stage: { name: string; group: string };
  nextStage: { name: string; group: string };
  stageIndex: number;
  stageQuestion: number;
  stageLength: number;
  stageCorrect: number;
  passRequired: number;
  progress: number;
  score: number;
  lives: number;
  runStreak: number;
  maxRunStreak: number;
  endedEarly: boolean;
  fullCompletion: boolean;
  isGraduationStage: boolean;
  questionIndex: number;
  totalQuestions: number;
  feedback: AnswerFeedback | null;
  runRecap: RunRecap | null;
};
