import {
  educationStages,
  FINAL_STAGE_INDEX,
  formalStageNames,
  graduationStageIndexes,
  optionCountForStage,
  passRequiredForStage,
  QUESTIONS_PER_STAGE,
  WARMUP_QUESTIONS_FIRST_STAGE,
} from "./game-config";
import { approvedQuestions, type Question, warmupQuestions } from "./questions";

export type RoundPlan = {
  questions: Question[];
  stageStarts: number[];
  usedQuestionIds: Set<string>;
  usedConceptIds: Set<string>;
  previousRoundQuestionIds: string[];
  /** 下一學級無足夠已審核題目可抽 */
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

export function getStageAt(stageIndex: number) {
  if (stageIndex < 0) return educationStages[0];
  if (stageIndex >= educationStages.length) return educationStages[FINAL_STAGE_INDEX];
  return educationStages[stageIndex];
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

export { passRequiredForStage };

function isAvailable(
  item: Question,
  previousQuestionIds: string[],
  usedQuestionIds: Set<string>,
  usedConceptIds: Set<string>,
  allowReuse: boolean,
) {
  if (usedQuestionIds.has(item.id)) return false;
  if (usedConceptIds.has(item.conceptId)) return false;
  if (!allowReuse && previousQuestionIds.includes(item.id)) return false;
  return true;
}

function pickFreshQuestions(
  pool: Question[],
  count: number,
  optionCount: number,
  previousQuestionIds: string[],
  usedQuestionIds: Set<string>,
  usedConceptIds: Set<string>,
  allowReuse = false,
) {
  const available = pool.filter((item) =>
    isAvailable(item, previousQuestionIds, usedQuestionIds, usedConceptIds, allowReuse),
  );
  const selected = shuffled(available).slice(0, count).map((item) => withOptionCount(item, optionCount));
  selected.forEach((item) => {
    usedQuestionIds.add(item.id);
    usedConceptIds.add(item.conceptId);
  });
  return selected;
}

function fillStagePool(
  pool: Question[],
  count: number,
  optionCount: number,
  previousQuestionIds: string[],
  usedQuestionIds: Set<string>,
  usedConceptIds: Set<string>,
) {
  let selected = pickFreshQuestions(
    pool,
    count,
    optionCount,
    previousQuestionIds,
    usedQuestionIds,
    usedConceptIds,
  );
  if (selected.length < count) {
    selected = [
      ...selected,
      ...pickFreshQuestions(
        pool,
        count - selected.length,
        optionCount,
        previousQuestionIds,
        usedQuestionIds,
        usedConceptIds,
        true,
      ),
    ];
  }
  return selected;
}

function drawStageQuestions(
  stageIndex: number,
  previousQuestionIds: string[],
  usedQuestionIds: Set<string>,
  usedConceptIds: Set<string>,
): Question[] {
  if (stageIndex > FINAL_STAGE_INDEX) return [];

  if (stageIndex === 0) {
    const approvedWarmups = warmupQuestions.filter((item) => item.auditStatus === "approved");
    const freshWarmups = approvedWarmups.filter((item) => !previousQuestionIds.includes(item.id));
    const warmupPool =
      freshWarmups.length >= WARMUP_QUESTIONS_FIRST_STAGE ? freshWarmups : approvedWarmups;
    const warmupChoices = warmupPool
      .slice(0, WARMUP_QUESTIONS_FIRST_STAGE)
      .map((item) => withOptionCount(item, 2));
    warmupChoices.forEach((item) => {
      usedQuestionIds.add(item.id);
      usedConceptIds.add(item.conceptId);
    });

    const formalCount = QUESTIONS_PER_STAGE - WARMUP_QUESTIONS_FIRST_STAGE;
    const elementaryPool = approvedQuestions.filter((item) => item.level === "旅行新手");
    const formalChoices = shuffled(
      fillStagePool(
        elementaryPool,
        formalCount,
        2,
        previousQuestionIds,
        usedQuestionIds,
        usedConceptIds,
      ),
    );
    return [...warmupChoices, ...formalChoices];
  }

  const stage = educationStages[stageIndex];
  const optionCount = optionCountForStage(stageIndex);
  const stagePool = approvedQuestions.filter((item) => (stage.pool as readonly string[]).includes(item.level));
  return fillStagePool(
    stagePool,
    QUESTIONS_PER_STAGE,
    optionCount,
    previousQuestionIds,
    usedQuestionIds,
    usedConceptIds,
  );
}

export function createRound(previousQuestionIds: string[]): RoundPlan {
  const usedQuestionIds = new Set<string>();
  const usedConceptIds = new Set<string>();
  const stageQuestions = drawStageQuestions(0, previousQuestionIds, usedQuestionIds, usedConceptIds);
  return {
    questions: stageQuestions,
    stageStarts: [0],
    usedQuestionIds,
    usedConceptIds,
    previousRoundQuestionIds: previousQuestionIds,
    exhausted: stageQuestions.length < QUESTIONS_PER_STAGE,
  };
}

/** 進入下一學級時才抽該級題目；若無題可抽則回傳 null。 */
export function appendNextStage(plan: RoundPlan, stageIndex: number): RoundPlan | null {
  if (stageIndex > FINAL_STAGE_INDEX) return null;

  const stageQuestions = drawStageQuestions(
    stageIndex,
    plan.previousRoundQuestionIds,
    plan.usedQuestionIds,
    plan.usedConceptIds,
  );
  if (stageQuestions.length === 0) return null;

  const exhausted = stageQuestions.length < QUESTIONS_PER_STAGE;

  return {
    ...plan,
    questions: [...plan.questions, ...stageQuestions],
    stageStarts: [...plan.stageStarts, plan.questions.length],
    exhausted,
  };
}

export function canDrawNextStage(plan: RoundPlan, nextStageIndex: number) {
  if (plan.exhausted) return false;
  if (nextStageIndex > FINAL_STAGE_INDEX) return false;
  if (nextStageIndex < plan.stageStarts.length) return true;
  const probeQuestionIds = new Set(plan.usedQuestionIds);
  const probeConceptIds = new Set(plan.usedConceptIds);
  const probe = drawStageQuestions(
    nextStageIndex,
    plan.previousRoundQuestionIds,
    probeQuestionIds,
    probeConceptIds,
  );
  return probe.length >= QUESTIONS_PER_STAGE;
}

export function isGraduationStage(stageIndex: number) {
  return graduationStageIndexes.has(stageIndex);
}
