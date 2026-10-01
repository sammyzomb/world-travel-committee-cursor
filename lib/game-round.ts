import { questionDemand, questionFamily } from "./question-demand";
import {
  educationStages,
  FINAL_STAGE_INDEX,
  formalStageNames,
  graduationStageIndexes,
  optionCountForStage,
  passRequiredForStage,
  questionsPerStage,
  WARMUP_QUESTIONS_FIRST_STAGE,
} from "./game-config";
import {
  includesTravelKnowledge,
  minTypeRankForStage,
} from "./question-types";
import { gameRandom } from "./game-random";
import { questionMatchesStageRules } from "./stage-eligibility";
import { approvedQuestions, travelKnowledgeQuestions, type Question, warmupQuestions } from "./questions";

export type RoundPlan = {
  questions: Question[];
  stageStarts: number[];
  usedQuestionIds: Set<string>;
  usedConceptIds: Set<string>;
  previousRoundQuestionIds: string[];
  previousRoundConceptIds: string[];
  /** 下一學級無足夠已審核題目可抽 */
  exhausted: boolean;
};

function shuffled<T>(items: T[]) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(gameRandom() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function withOptionCount(item: Question, count: number): Question {
  if (item.kind === "tf") return item;
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
  previousConceptIds: string[],
  usedQuestionIds: Set<string>,
  usedConceptIds: Set<string>,
  allowReuse: boolean,
) {
  if (usedQuestionIds.has(item.id)) return false;
  if (usedConceptIds.has(item.conceptId)) return false;
  if (previousConceptIds.includes(item.conceptId)) return false;
  if (!allowReuse && previousQuestionIds.includes(item.id)) return false;
  return true;
}

function sortByStageDifficulty(items: Question[], stageIndex: number) {
  const minRank = minTypeRankForStage(stageIndex);
  return [...items].sort((a, b) => {
    const rankA = questionDemand(a);
    const rankB = questionDemand(b);
    const biasA = rankA >= minRank ? rankA + 2 : rankA;
    const biasB = rankB >= minRank ? rankB + 2 : rankB;
    return biasB - biasA;
  });
}

function filterPoolForStage(pool: Question[], stageIndex: number) {
  return pool.filter((item) => questionMatchesStageRules(item, stageIndex));
}

/** 首都、洲別、國家及城市定位共用一個配額，不能以不同型名繞過。 */
function pickDiverseQuestions(ranked: Question[], count: number, stageIndex: number, seed: Question[] = [], _relaxTypeCap = false, priorFamilyCounts = new Map<string, number>()): Question[] {
  const selected = [...seed];
  const concepts = new Set(seed.map(q => q.conceptId));
  const ids = new Set(seed.map(q => q.id));
  const familyCounts = new Map<string, number>();
  for (const q of seed) familyCounts.set(questionFamily(q), (familyCounts.get(questionFamily(q)) ?? 0) + 1);
  const candidates = shuffled(ranked).filter(q => !ids.has(q.id));
  while (selected.length < count) {
    const available = candidates.filter(q => !ids.has(q.id) && !concepts.has(q.conceptId) &&
      (familyCounts.get(questionFamily(q)) ?? 0) < (questionFamily(q) === 'location-recall' || stageIndex >= 9 ? 1 : 2));
    // Spread demand across the available families so later stages/replays keep enough choices.
    const remainingByFamily = new Map<string, Set<string>>();
    for (const q of available) {
      const family = questionFamily(q);
      if (!remainingByFamily.has(family)) remainingByFamily.set(family, new Set());
      remainingByFamily.get(family)!.add(q.conceptId);
    }
    available.sort((a, b) => (familyCounts.get(questionFamily(a)) ?? 0) - (familyCounts.get(questionFamily(b)) ?? 0)
      || questionDemand(b) - questionDemand(a)
      || Number(Boolean(b.references?.length)) - Number(Boolean(a.references?.length))
      || (remainingByFamily.get(questionFamily(b))?.size ?? 0) - (remainingByFamily.get(questionFamily(a))?.size ?? 0)
      || (priorFamilyCounts.get(questionFamily(a)) ?? 0) - (priorFamilyCounts.get(questionFamily(b)) ?? 0));
    const picked = available[0];
    if (!picked) break;
    selected.push(picked); ids.add(picked.id); concepts.add(picked.conceptId);
    const family = questionFamily(picked);
    familyCounts.set(family, (familyCounts.get(family) ?? 0) + 1);
  }
  return selected.slice(seed.length);
}

function pickFreshQuestions(
  pool: Question[],
  count: number,
  optionCount: number,
  previousQuestionIds: string[],
  previousConceptIds: string[],
  usedQuestionIds: Set<string>,
  usedConceptIds: Set<string>,
  stageIndex: number,
  allowReuse = false,
  seed: Question[] = [],
  relaxTypeCap = false,
) {
  const available = pool.filter((item) =>
    isAvailable(
      item,
      previousQuestionIds,
      previousConceptIds,
      usedQuestionIds,
      usedConceptIds,
      allowReuse,
    ),
  );
  const ranked = sortByStageDifficulty(available, stageIndex);
  const priorFamilyCounts = new Map<string, number>();
  const currentStageIds = new Set(seed.map(q => q.id));
  for (const q of [...approvedQuestions, ...warmupQuestions]) {
    if (!usedQuestionIds.has(q.id) || currentStageIds.has(q.id)) continue;
    const family = questionFamily(q);
    priorFamilyCounts.set(family, (priorFamilyCounts.get(family) ?? 0) + 1);
  }
  const picked = pickDiverseQuestions(ranked, count, stageIndex, seed, relaxTypeCap, priorFamilyCounts).map((item) =>
    withOptionCount(item, optionCount),
  );
  picked.forEach((item) => {
    usedQuestionIds.add(item.id);
    usedConceptIds.add(item.conceptId);
  });
  return picked;
}

function fillStagePool(
  pool: Question[],
  count: number,
  optionCount: number,
  previousQuestionIds: string[],
  previousConceptIds: string[],
  usedQuestionIds: Set<string>,
  usedConceptIds: Set<string>,
  stageIndex: number,
) {
  const stagePool = filterPoolForStage(pool, stageIndex);
  let selected: Question[] = [];

  const tryPick = (source: Question[], allowReuse: boolean, relaxTypeCap = false) => {
    if (selected.length >= count) return;
    const batch = pickFreshQuestions(
      source,
      count,
      optionCount,
      previousQuestionIds,
      previousConceptIds,
      usedQuestionIds,
      usedConceptIds,
      stageIndex,
      allowReuse,
      selected,
      relaxTypeCap,
    );
    selected = [...selected, ...batch];
  };

  tryPick(stagePool, false);
  if (selected.length < count) tryPick(stagePool, true);
  if (selected.length < count) tryPick(stagePool, true, true);

  return selected.slice(0, count);
}

function drawStageQuestions(
  stageIndex: number,
  previousQuestionIds: string[],
  previousConceptIds: string[],
  usedQuestionIds: Set<string>,
  usedConceptIds: Set<string>,
): Question[] {
  if (stageIndex > FINAL_STAGE_INDEX) return [];

  const stageQuestionCount = questionsPerStage(stageIndex);

  if (stageIndex === 0) {
    const warmupPool = shuffled(
      warmupQuestions.filter((item) => item.auditStatus === "approved" && item.kind === "tf"),
    );
    const avoidWarmup = warmupPool.filter(
      (item) =>
        !previousQuestionIds.includes(item.id) && !previousConceptIds.includes(item.conceptId),
    );
    const warmupSource =
      avoidWarmup.length >= WARMUP_QUESTIONS_FIRST_STAGE ? avoidWarmup : warmupPool;
    const warmupChoices = warmupSource
      .slice(0, WARMUP_QUESTIONS_FIRST_STAGE)
      .map((item) => withOptionCount(item, 2));
    warmupChoices.forEach((item) => {
      usedQuestionIds.add(item.id);
      usedConceptIds.add(item.conceptId);
    });

    const formalCount = stageQuestionCount - WARMUP_QUESTIONS_FIRST_STAGE;
    const elementaryPool = approvedQuestions.filter(
      (item) => item.level === "旅行新手" && item.kind !== "tf",
    );
    const formalChoices = fillStagePool(
      elementaryPool,
      formalCount,
      optionCountForStage(0),
      previousQuestionIds,
      previousConceptIds,
      usedQuestionIds,
      usedConceptIds,
      stageIndex,
    );
    return [...shuffled(warmupChoices), ...shuffled(formalChoices)];
  }

  const stage = educationStages[stageIndex];
  const optionCount = optionCountForStage(stageIndex);
  const levelPool = approvedQuestions.filter((item) =>
    (stage.pool as readonly string[]).includes(item.level),
  );
  const travelPool =
    includesTravelKnowledge(stageIndex)
      ? travelKnowledgeQuestions.filter((item) => item.auditStatus === "approved")
      : [];
  const stagePool = travelPool.length > 0 ? [...levelPool, ...travelPool] : levelPool;

  const questions = fillStagePool(
    stagePool,
    stageQuestionCount,
    optionCount,
    previousQuestionIds,
    previousConceptIds,
    usedQuestionIds,
    usedConceptIds,
    stageIndex,
  );

  return shuffled(questions);
}

export function createRound(
  previousQuestionIds: string[] = [],
  previousConceptIds: string[] = [],
): RoundPlan {
  const usedQuestionIds = new Set<string>();
  const usedConceptIds = new Set<string>();
  const stageQuestions = drawStageQuestions(
    0,
    previousQuestionIds,
    previousConceptIds,
    usedQuestionIds,
    usedConceptIds,
  );
  return {
    questions: stageQuestions,
    stageStarts: [0],
    usedQuestionIds,
    usedConceptIds,
    previousRoundQuestionIds: previousQuestionIds,
    previousRoundConceptIds: previousConceptIds,
    exhausted: stageQuestions.length < questionsPerStage(0),
  };
}

/** 進入下一學級時才抽該級題目；若無題可抽則回傳 null。 */
export function appendNextStage(plan: RoundPlan, stageIndex: number): RoundPlan | null {
  if (stageIndex > FINAL_STAGE_INDEX) return null;

  const stageQuestions = drawStageQuestions(
    stageIndex,
    plan.previousRoundQuestionIds,
    plan.previousRoundConceptIds,
    plan.usedQuestionIds,
    plan.usedConceptIds,
  );
  if (stageQuestions.length === 0) return null;

  const exhausted = stageQuestions.length < questionsPerStage(stageIndex);

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
    plan.previousRoundConceptIds,
    probeQuestionIds,
    probeConceptIds,
  );
  return probe.length >= questionsPerStage(nextStageIndex);
}

export function isGraduationStage(stageIndex: number) {
  return graduationStageIndexes.has(stageIndex);
}
