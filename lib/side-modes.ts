import { dateKey, seededIndex } from "./date-key";
import questionBankJson from "../data/questions.json";
import { allQuestions, travelKnowledgeQuestions, type Question } from "./questions";

export const TRAINING_CONTINENTS = [
  "綜合",
  "亞洲",
  "歐洲",
  "非洲",
  "北美洲",
  "南美洲",
  "大洋洲",
  "旅行知識",
] as const;

export type TrainingContinent = (typeof TRAINING_CONTINENTS)[number];

export const MAP_CONTINENTS = ["亞洲", "歐洲", "非洲", "北美洲", "南美洲", "大洋洲"] as const;

export type MapQuizItem = {
  country: string;
  continent: string;
  landmark: string;
};

const expandedFacts = (questionBankJson as { expandedFacts: [string, string, string, string, string][] })
  .expandedFacts;

function shuffle<T>(items: T[]) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

export function getDailyQuestion(date = new Date()): Question {
  const index = seededIndex(`daily-${dateKey(date)}`, allQuestions.length);
  return allQuestions[index];
}

export function questionsForTraining(continent: TrainingContinent, count = 10): Question[] {
  let pool: Question[];
  if (continent === "旅行知識") {
    pool = travelKnowledgeQuestions;
  } else if (continent === "綜合") {
    pool = allQuestions;
  } else {
    pool = allQuestions.filter(
      (item) => item.region === continent || item.region.includes(continent),
    );
  }
  if (pool.length === 0) pool = allQuestions;
  return shuffle(pool).slice(0, Math.min(count, pool.length));
}

export function questionsForReview(keys: string[]): Question[] {
  const keySet = new Set(keys);
  return allQuestions.filter((item) => keySet.has(item.q));
}

export function buildMapQuizRound(count = 10): MapQuizItem[] {
  const pool = expandedFacts.map(([, country, continent, , landmark]) => ({
    country,
    continent,
    landmark,
  }));
  return shuffle(pool).slice(0, Math.min(count, pool.length));
}

export function withOptionCount(item: Question, count: number): Question {
  if (item.kind === "tf" || item.options.length <= count) return item;
  const correct = item.options[item.answer];
  const wrong = shuffle(item.options.filter((_, index) => index !== item.answer)).slice(0, count - 1);
  const options = shuffle([correct, ...wrong]);
  return { ...item, options, answer: options.indexOf(correct) };
}
