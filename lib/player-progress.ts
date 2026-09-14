import { formalStageNames } from "./game-config";

export type PersonalBest = {
  bestStageIndex: number;
  bestStageName: string;
  bestScore: number;
  maxStreak: number;
  totalRuns: number;
  conceptsLearned: number;
  updatedAt: string;
};

const STORAGE_KEY = "wtc-personal-best";

function readStorage(): PersonalBest | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersonalBest;
  } catch {
    return null;
  }
}

function writeStorage(record: PersonalBest) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
}

export function loadPersonalBest(): PersonalBest | null {
  return readStorage();
}

export function updatePersonalBest(input: {
  stageIndex: number;
  stageName: string;
  score: number;
  maxStreak: number;
  conceptsLearned: number;
}): { record: PersonalBest; isNewBest: boolean } {
  const previous = readStorage();
  const stageName = formalStageNames[input.stageName] ?? input.stageName;
  const isNewBest =
    !previous ||
    input.stageIndex > previous.bestStageIndex ||
    input.score > previous.bestScore ||
    input.maxStreak > previous.maxStreak;

  const record: PersonalBest = {
    bestStageIndex: Math.max(previous?.bestStageIndex ?? 0, input.stageIndex),
    bestStageName:
      input.stageIndex >= (previous?.bestStageIndex ?? 0) ? stageName : previous!.bestStageName,
    bestScore: Math.max(previous?.bestScore ?? 0, input.score),
    maxStreak: Math.max(previous?.maxStreak ?? 0, input.maxStreak),
    totalRuns: (previous?.totalRuns ?? 0) + 1,
    conceptsLearned: (previous?.conceptsLearned ?? 0) + input.conceptsLearned,
    updatedAt: new Date().toISOString(),
  };

  if (previous && input.stageIndex < previous.bestStageIndex) {
    record.bestStageIndex = previous.bestStageIndex;
    record.bestStageName = previous.bestStageName;
  }

  writeStorage(record);
  return { record, isNewBest };
}
