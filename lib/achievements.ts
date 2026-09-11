export type AchievementDef = {
  id: string;
  title: string;
  description: string;
  emoji: string;
};

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "daily_first", title: "每日旅人", description: "完成第一次每日挑戰", emoji: "☀️" },
  { id: "daily_streak_3", title: "三日不退", description: "每日挑戰連勝 3 天", emoji: "🔥" },
  { id: "daily_streak_7", title: "週週不落", description: "每日挑戰連勝 7 天", emoji: "📅" },
  { id: "run_streak_5", title: "五連勝", description: "主線單局連續答對 5 題", emoji: "⚡" },
  { id: "run_streak_10", title: "十連勝", description: "主線單局連續答對 10 題", emoji: "💥" },
  { id: "score_50", title: "半百達人", description: "主線單局得分 50+", emoji: "🎯" },
  { id: "score_100", title: "百分高手", description: "主線單局得分 100+", emoji: "💯" },
  { id: "graduate", title: "國小畢業", description: "通過小六畢業慶祝", emoji: "🎓" },
  { id: "map_perfect", title: "洲別神眼", description: "地圖模式 10 題全對", emoji: "🗺️" },
  { id: "training_clear", title: "特訓通關", description: "完成任一洲別特訓", emoji: "🏋️" },
  { id: "review_clear", title: "復仇成功", description: "錯題再戰全部答對", emoji: "😤" },
  { id: "bank_clear", title: "題庫全破", description: "主線打通全部題庫", emoji: "👑" },
];

export type AchievementContext = {
  dailyStreak: number;
  dailyWonToday: boolean;
  runStreak: number;
  score: number;
  stageIndex: number;
  isGraduationStage: boolean;
  completed: boolean;
  mapPerfect: boolean;
  trainingContinent: string | null;
  reviewCleared: boolean;
  alreadyUnlocked: string[];
};

export function evaluateAchievements(context: AchievementContext): string[] {
  const unlocked = new Set(context.alreadyUnlocked);
  const newly: string[] = [];

  const tryUnlock = (id: string, condition: boolean) => {
    if (!condition || unlocked.has(id)) return;
    unlocked.add(id);
    newly.push(id);
  };

  tryUnlock("daily_first", context.dailyWonToday);
  tryUnlock("daily_streak_3", context.dailyStreak >= 3);
  tryUnlock("daily_streak_7", context.dailyStreak >= 7);
  tryUnlock("run_streak_5", context.runStreak >= 5);
  tryUnlock("run_streak_10", context.runStreak >= 10);
  tryUnlock("score_50", context.score >= 50);
  tryUnlock("score_100", context.score >= 100);
  tryUnlock("graduate", context.isGraduationStage && context.stageIndex === 5);
  tryUnlock("map_perfect", context.mapPerfect);
  tryUnlock("training_clear", Boolean(context.trainingContinent));
  tryUnlock("review_clear", context.reviewCleared);
  tryUnlock("bank_clear", context.completed);

  return newly;
}
