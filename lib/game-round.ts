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
  allowedTypesForStage,
  difficultyRankForLevel,
  includesTravelKnowledge,
  minQuestionLevelRankForStage,
  minTypeRankForStage,
  QUESTION_TYPE_RANK,
  type QuestionType,
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
  previousConceptIds: string[],
  usedQuestionIds: Set<string>,
  usedConceptIds: Set<string>,
  allowReuse: boolean,
) {
  if (usedQuestionIds.has(item.id)) return false;
  if (usedConceptIds.has(item.conceptId)) return false;
  if (!allowReuse && previousQuestionIds.includes(item.id)) return false;
  if (!allowReuse && previousConceptIds.includes(item.conceptId)) return false;
  return true;
}

function sortByStageDifficulty(items: Question[], stageIndex: number) {
  const minRank = minTypeRankForStage(stageIndex);
  return [...items].sort((a, b) => {
    const rankA = QUESTION_TYPE_RANK[a.questionType] + difficultyRankForLevel(a.level) * 0.5;
    const rankB = QUESTION_TYPE_RANK[b.questionType] + difficultyRankForLevel(b.level) * 0.5;
    const biasA = rankA >= minRank ? rankA + 2 : rankA;
    const biasB = rankB >= minRank ? rankB + 2 : rankB;
    return biasB - biasA;
  });
}

function filterPoolForStage(pool: Question[], stageIndex: number) {
  const allowedTypes = new Set<QuestionType>(allowedTypesForStage(stageIndex));
  const minTypeRank = minTypeRankForStage(stageIndex);
  const minLevelRank = minQuestionLevelRankForStage(stageIndex);
  return pool.filter((item) => {
    if (!allowedTypes.has(item.questionType)) return false;
    const typeRank = QUESTION_TYPE_RANK[item.questionType];
    const levelRank = difficultyRankForLevel(item.level);
    if (levelRank < minLevelRank) return false;
    if (typeRank + levelRank * 0.3 < minTypeRank - 0.5) return false;
    return true;
  });
}

function maxQuestionsPerType(count: number, availableTypeCount: number, allowedTypeCount: number) {
  if (availableTypeCount <= 0) return count;
  const hardCap = count >= 8 ? 3 : 2;
  if (allowedTypeCount >= 3 && count >= 5) return hardCap;
  if (availableTypeCount * hardCap >= count) return hardCap;
  return Math.ceil(count / availableTypeCount);
}

/** 同一學級內優先分散題型，避免連續抽到大量同類型題目。 */
function pickDiverseQuestions(
  ranked: Question[],
  count: number,
  stageIndex: number,
  seed: Question[] = [],
  relaxTypeCap = false,
): Question[] {
  const allowedTypes = allowedTypesForStage(stageIndex);
  const seedIds = new Set(seed.map((item) => item.id));
  const byType = new Map<QuestionType, Question[]>();
  for (const item of ranked) {
    if (seedIds.has(item.id)) continue;
    const list = byType.get(item.questionType) ?? [];
    list.push(item);
    byType.set(item.questionType, list);
  }
  for (const [type, list] of byType) {
    byType.set(type, shuffled(list));
  }

  const typeOrder = shuffled(
    allowedTypes.filter((type) => (byType.get(type)?.length ?? 0) > 0),
  );
  const projectedTypeCount = new Set([
    ...seed.map((item) => item.questionType),
    ...typeOrder,
  ]).size;
  const maxPerType = relaxTypeCap
    ? Math.ceil(count / Math.max(projectedTypeCount, 1))
    : maxQuestionsPerType(count, projectedTypeCount, allowedTypes.length);
  const selected: Question[] = [...seed];
  const selectedConceptIds = new Set(seed.map((item) => item.conceptId));
  const typeCursor = new Map<QuestionType, number>();
  for (const item of seed) {
    typeCursor.set(item.questionType, (typeCursor.get(item.questionType) ?? 0) + 1);
  }

  const tryAdd = (item: Question) => {
    if (selectedConceptIds.has(item.conceptId)) return false;
    selected.push(item);
    selectedConceptIds.add(item.conceptId);
    return true;
  };

  let guard = 0;
  while (selected.length < count && guard < count * typeOrder.length * 4) {
    guard += 1;
    let progressed = false;
    for (const type of typeOrder) {
      if (selected.length >= count) break;
      const cursor = typeCursor.get(type) ?? 0;
      if (cursor >= maxPerType) continue;
      const pool = byType.get(type);
      if (!pool) continue;
      for (let index = cursor; index < pool.length; index += 1) {
        if (selected.length >= count) break;
        if (tryAdd(pool[index])) {
          typeCursor.set(type, index + 1);
          progressed = true;
          break;
        }
      }
    }
    if (!progressed) break;
  }

  if (selected.length < count) {
    const selectedIds = new Set(selected.map((entry) => entry.id));
    for (const item of ranked) {
      if (selected.length >= count) break;
      if (selectedIds.has(item.id)) continue;
      const usedForType = selected.filter((entry) => entry.questionType === item.questionType).length;
      if (usedForType >= maxPerType) continue;
      if (!tryAdd(item)) continue;
      selectedIds.add(item.id);
    }
  }

  return selected.slice(0, count).slice(seed.length);
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
  const picked = pickDiverseQuestions(ranked, count, stageIndex, seed, relaxTypeCap).map((item) =>
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
      2,
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

  let questions = fillStagePool(
    stagePool,
    stageQuestionCount,
    optionCount,
    previousQuestionIds,
    previousConceptIds,
    usedQuestionIds,
    usedConceptIds,
    stageIndex,
  );

  if (includesTravelKnowledge(stageIndex) && travelPool.length > 0 && questions.length >= 3) {
    const travelPick = sortByStageDifficulty(
      travelPool.filter(
        (item) =>
          questionMatchesStageRules(item, stageIndex) &&
          isAvailable(
            item,
            previousQuestionIds,
            previousConceptIds,
            usedQuestionIds,
            usedConceptIds,
            false,
          ),
      ),
      stageIndex,
    )[0];
    if (travelPick && !usedConceptIds.has(travelPick.conceptId)) {
      const typeCounts = new Map<QuestionType, number>();
      for (const item of questions) {
        typeCounts.set(item.questionType, (typeCounts.get(item.questionType) ?? 0) + 1);
      }
      const dominantType = [...typeCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
      const replaceIndex =
        dominantType !== undefined
          ? questions.findIndex((item) => item.questionType === dominantType)
          : -1;
      const travelSlot = replaceIndex >= 0 ? replaceIndex : Math.min(questions.length - 1, 2);
      const replaced = questions[travelSlot];
      const withTravel = [...questions];
      withTravel[travelSlot] = withOptionCount(travelPick, optionCount);
      if (replaced) {
        usedQuestionIds.delete(replaced.id);
        usedConceptIds.delete(replaced.conceptId);
      }
      usedQuestionIds.add(travelPick.id);
      usedConceptIds.add(travelPick.conceptId);
      questions = withTravel;
    }
  }

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
