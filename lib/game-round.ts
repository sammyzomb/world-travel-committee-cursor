import {
  educationStages,
  formalStageNames,
  INSTITUTE_POOL,
  optionCountForStage,
  PASS_CORRECT_REQUIRED,
  QUESTIONS_PER_STAGE,
  WARMUP_QUESTIONS_FIRST_STAGE,
} from "./game-config";
import { allQuestions, type Question, warmupQuestions } from "./questions";

export type RoundPlan = {
  questions: Question[];
  stageStarts: number[];
  usedQuestions: Set<string>;
  previousRound: string[];
  /** 研究所延續階段已無題可抽 */
  exhausted: boolean;
};

function shuffled<T>(items: T[]) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function withOptionCount(item: Question, count: number): Question {
  if (item.kind === "tf" || item.options.length <= count) return item;
  const correct = item.options[item.answer];
  const wrong = shuffled(item.options.filter((_, index) => index !== item.answer)).slice(0, count - 1);
  const options = shuffled([correct, ...wrong]);
  return { ...item, options, answer: options.indexOf(correct) };
}

const instituteNumerals = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"] as const;

export function getStageAt(stageIndex: number) {
  if (stageIndex < educationStages.length) return educationStages[stageIndex];
  const label = instituteNumerals[stageIndex - 16] ?? `${stageIndex - 15}`;
  return { name: `研${label}`, group: "研究所", pool: INSTITUTE_POOL };
}

export function getStageCompletionLabel(stage: { name: string; group: string }, isGraduation: boolean) {
  if (isGraduation) return `${stage.group}全部學業`;
  return formalStageNames[stage.name] ?? `${stage.group}${stage.name}`;
}

export function getStageIndex(stageStarts: number[], questionIndex: number) {
  for (let stageIndex = stageStarts.length - 1; stageIndex >= 0; stageIndex -= 1) {
    if (questionIndex >= stageStarts[stageIndex]) return stageIndex;
  }
  return 0;
}

export function getStageLength(stageStarts: number[], totalQuestions: number, stageIndex: number) {
  const nextStart = stageStarts[stageIndex + 1] ?? totalQuestions;
  return nextStart - stageStarts[stageIndex];
}

export function passRequiredForStage(stageLength: number) {
  return Math.max(1, Math.min(PASS_CORRECT_REQUIRED, Math.ceil(stageLength * 0.6)));
}

function pickFreshQuestions(
  pool: Question[],
  count: number,
  optionCount: number,
  previous: string[],
  used: Set<string>,
  allowReuse = false,
) {
  const available = pool.filter((item) => {
    if (used.has(item.q)) return false;
    if (!allowReuse && previous.includes(item.q)) return false;
    return true;
  });
  const selected = shuffled(available).slice(0, count).map((item) => withOptionCount(item, optionCount));
  selected.forEach((item) => used.add(item.q));
  return selected;
}

function fillStagePool(
  pool: Question[],
  count: number,
  optionCount: number,
  previous: string[],
  used: Set<string>,
) {
  let selected = pickFreshQuestions(pool, count, optionCount, previous, used);
  if (selected.length < count) {
    selected = [
      ...selected,
      ...pickFreshQuestions(pool, count - selected.length, optionCount, previous, used, true),
    ];
  }
  return shuffled(selected);
}

function drawStageQuestions(stageIndex: number, previous: string[], used: Set<string>): Question[] {
  if (stageIndex === 0) {
    const freshWarmups = warmupQuestions.filter((item) => !previous.includes(item.q));
    const warmupChoices = shuffled(freshWarmups.length >= WARMUP_QUESTIONS_FIRST_STAGE ? freshWarmups : warmupQuestions)
      .slice(0, WARMUP_QUESTIONS_FIRST_STAGE)
      .map((item) => withOptionCount(item, 2));
    warmupChoices.forEach((item) => used.add(item.q));

    const formalCount = QUESTIONS_PER_STAGE - WARMUP_QUESTIONS_FIRST_STAGE;
    const elementaryPool = allQuestions.filter((item) => item.level === "旅行新手");
    const formalChoices = fillStagePool(elementaryPool, formalCount, 2, previous, used);
    return shuffled([...warmupChoices, ...formalChoices]);
  }

  if (stageIndex < educationStages.length) {
    const stage = educationStages[stageIndex];
    const optionCount = optionCountForStage(stageIndex);
    const stagePool = allQuestions.filter((item) => (stage.pool as readonly string[]).includes(item.level));
    return fillStagePool(stagePool, QUESTIONS_PER_STAGE, optionCount, previous, used);
  }

  const remainingPool = allQuestions.filter((item) => !previous.includes(item.q) && !used.has(item.q));
  return pickFreshQuestions(remainingPool, QUESTIONS_PER_STAGE, 4, previous, used);
}

export function createRound(previous: string[]): RoundPlan {
  const usedQuestions = new Set<string>();
  const stageQuestions = drawStageQuestions(0, previous, usedQuestions);
  return {
    questions: stageQuestions,
    stageStarts: [0],
    usedQuestions,
    previousRound: previous,
    exhausted: false,
  };
}

/** 進入下一學級時才抽該級題目；若無題可抽則回傳 null。 */
export function appendNextStage(plan: RoundPlan, stageIndex: number): RoundPlan | null {
  const stageQuestions = drawStageQuestions(stageIndex, plan.previousRound, plan.usedQuestions);
  if (stageQuestions.length === 0) return null;

  const isInstituteExtension = stageIndex >= educationStages.length;
  const exhausted = isInstituteExtension && stageQuestions.length < QUESTIONS_PER_STAGE;

  return {
    ...plan,
    questions: [...plan.questions, ...stageQuestions],
    stageStarts: [...plan.stageStarts, plan.questions.length],
    exhausted,
  };
}

export function canDrawNextStage(plan: RoundPlan, nextStageIndex: number) {
  if (plan.exhausted) return false;
  if (nextStageIndex < plan.stageStarts.length) return true;
  const probeUsed = new Set(plan.usedQuestions);
  const probe = drawStageQuestions(nextStageIndex, plan.previousRound, probeUsed);
  return probe.length > 0;
}
