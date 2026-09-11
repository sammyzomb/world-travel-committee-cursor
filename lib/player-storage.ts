import { dateKey } from "./date-key";

const STORAGE_KEY = "wtc-player-v1";

export type PlayerProfile = {
  dailyStreak: number;
  bestDailyStreak: number;
  lastDailyDate: string | null;
  dailyPlayedToday: boolean;
  dailyWonToday: boolean;
  bestRunScore: number;
  bestRunStreak: number;
  bestStageReached: string;
  wrongQuestionKeys: string[];
  unlockedAchievements: string[];
  trainingClears: string[];
  mapPerfectCount: number;
};

const defaultProfile: PlayerProfile = {
  dailyStreak: 0,
  bestDailyStreak: 0,
  lastDailyDate: null,
  dailyPlayedToday: false,
  dailyWonToday: false,
  bestRunScore: 0,
  bestRunStreak: 0,
  bestStageReached: "小一",
  wrongQuestionKeys: [],
  unlockedAchievements: [],
  trainingClears: [],
  mapPerfectCount: 0,
};

function normalizeProfile(raw: Partial<PlayerProfile> | null): PlayerProfile {
  if (!raw) return { ...defaultProfile };
  return {
    ...defaultProfile,
    ...raw,
    wrongQuestionKeys: Array.isArray(raw.wrongQuestionKeys) ? raw.wrongQuestionKeys : [],
    unlockedAchievements: Array.isArray(raw.unlockedAchievements) ? raw.unlockedAchievements : [],
    trainingClears: Array.isArray(raw.trainingClears) ? raw.trainingClears : [],
  };
}

function refreshDailyFlags(profile: PlayerProfile): PlayerProfile {
  const today = dateKey();
  if (profile.lastDailyDate === today) return profile;
  return {
    ...profile,
    dailyPlayedToday: false,
    dailyWonToday: false,
  };
}

export function loadPlayerProfile(): PlayerProfile {
  if (typeof window === "undefined") return { ...defaultProfile };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultProfile };
    return refreshDailyFlags(normalizeProfile(JSON.parse(raw) as Partial<PlayerProfile>));
  } catch {
    return { ...defaultProfile };
  }
}

export function savePlayerProfile(profile: PlayerProfile) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

export function updatePlayerProfile(mutator: (profile: PlayerProfile) => PlayerProfile) {
  const next = mutator(loadPlayerProfile());
  savePlayerProfile(next);
  return next;
}

export function recordWrongQuestion(questionKey: string) {
  updatePlayerProfile((profile) => {
    const keys = profile.wrongQuestionKeys.filter((key) => key !== questionKey);
    keys.unshift(questionKey);
    return { ...profile, wrongQuestionKeys: keys.slice(0, 40) };
  });
}

export function clearWrongQuestion(questionKey: string) {
  updatePlayerProfile((profile) => ({
    ...profile,
    wrongQuestionKeys: profile.wrongQuestionKeys.filter((key) => key !== questionKey),
  }));
}

export function clearAllWrongQuestions() {
  updatePlayerProfile((profile) => ({ ...profile, wrongQuestionKeys: [] }));
}

export function unlockAchievement(id: string) {
  return updatePlayerProfile((profile) => {
    if (profile.unlockedAchievements.includes(id)) return profile;
    return {
      ...profile,
      unlockedAchievements: [...profile.unlockedAchievements, id],
    };
  });
}

export function recordDailyResult(won: boolean) {
  const today = dateKey();
  return updatePlayerProfile((profile) => {
    const refreshed = refreshDailyFlags(profile);
    if (refreshed.dailyPlayedToday) return refreshed;

    let dailyStreak = refreshed.dailyStreak;
    if (won) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const wasYesterday = refreshed.lastDailyDate === dateKey(yesterday);
      dailyStreak = wasYesterday || refreshed.lastDailyDate === null ? dailyStreak + 1 : 1;
    } else {
      dailyStreak = 0;
    }

    return {
      ...refreshed,
      dailyPlayedToday: true,
      dailyWonToday: won,
      lastDailyDate: today,
      dailyStreak: won ? dailyStreak : 0,
      bestDailyStreak: won ? Math.max(refreshed.bestDailyStreak, dailyStreak) : refreshed.bestDailyStreak,
    };
  });
}

export function recordMainRunResult(input: {
  score: number;
  runStreak: number;
  stageName: string;
  completed: boolean;
}) {
  return updatePlayerProfile((profile) => ({
    ...profile,
    bestRunScore: Math.max(profile.bestRunScore, input.score),
    bestRunStreak: Math.max(profile.bestRunStreak, input.runStreak),
    bestStageReached: input.completed ? input.stageName : profile.bestStageReached,
  }));
}
