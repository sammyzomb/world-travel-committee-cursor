import type { QuestionCategory } from "./questions";
import { QUESTION_LEVELS, type QuestionLevel } from "./game-config";

export type QuestionType =
  | "tf"
  | "continent"
  | "country-pick"
  | "city-pick"
  | "landmark-city"
  | "capital"
  | "reverse-capital"
  | "travel"
  | "world-fact";

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  tf: "是非判斷",
  continent: "洲別定位",
  "country-pick": "國家識別",
  "city-pick": "城市探索",
  "landmark-city": "地標尋城",
  capital: "首都記憶",
  "reverse-capital": "首都反推",
  travel: "旅行知識",
  "world-fact": "世界之最",
};

/** 題型認知難度（越高越難）。 */
export const QUESTION_TYPE_RANK: Record<QuestionType, number> = {
  tf: 0,
  continent: 1,
  "country-pick": 2,
  "city-pick": 3,
  travel: 3,
  "landmark-city": 4,
  capital: 4,
  "reverse-capital": 5,
  "world-fact": 5,
};

const LEVEL_RANK = Object.fromEntries(
  QUESTION_LEVELS.map((level, index) => [level, index]),
) as Record<QuestionLevel, number>;

export function difficultyRankForLevel(level: string) {
  if (level === "送分題") return 0;
  return LEVEL_RANK[level as QuestionLevel] ?? 0;
}

export function inferQuestionType(input: {
  q: string;
  kind?: "tf" | "choice";
  category?: QuestionCategory;
  level?: string;
}): QuestionType {
  if (input.kind === "tf") return "tf";
  if (input.category === "旅行知識") return "travel";
  if (input.q.includes("首都是哪") || input.q.includes("的首都")) return "capital";
  if (input.q.includes("哪一個國家的首都是") || input.q.includes("的首都為")) return "reverse-capital";
  if (input.q.includes("哪一洲") || input.q.includes("位於哪一洲")) return "continent";
  if (input.q.includes("位於哪一座城市") || input.q.includes("位於哪一個國家")) {
    return input.q.includes("位於哪一個國家") ? "country-pick" : "city-pick";
  }
  if (input.q.includes("位於哪") && input.q.includes("城市")) return "landmark-city";
  if (
    input.q.includes("最大") ||
    input.q.includes("最長") ||
    input.q.includes("最高") ||
    input.q.includes("跨越") ||
    input.level === "環球旅行家"
  ) {
    return "world-fact";
  }
  if (input.q.includes("位於哪")) return "country-pick";
  return "city-pick";
}

/** 各年級允許的題型（越後面越多、越難）。 */
export const STAGE_ALLOWED_TYPES: QuestionType[][] = [
  ["tf", "continent"],
  ["tf", "continent", "country-pick", "city-pick"],
  ["continent", "country-pick", "city-pick"],
  ["country-pick", "city-pick", "capital"],
  ["city-pick", "capital", "landmark-city"],
  ["city-pick", "capital", "landmark-city"],
  ["capital", "landmark-city", "country-pick"],
  ["capital", "landmark-city", "world-fact"],
  ["landmark-city", "capital", "travel", "world-fact"],
  ["capital", "reverse-capital", "landmark-city", "travel"],
  ["reverse-capital", "world-fact", "travel", "capital"],
  ["reverse-capital", "world-fact", "travel"],
  ["reverse-capital", "world-fact", "travel", "landmark-city"],
  ["reverse-capital", "world-fact", "travel"],
  ["reverse-capital", "world-fact", "travel", "capital"],
  ["reverse-capital", "world-fact", "travel"],
  ["world-fact", "reverse-capital", "travel"],
  ["world-fact", "reverse-capital", "travel", "capital"],
];

export function allowedTypesForStage(stageIndex: number): QuestionType[] {
  return STAGE_ALLOWED_TYPES[Math.min(stageIndex, STAGE_ALLOWED_TYPES.length - 1)] ?? STAGE_ALLOWED_TYPES[0];
}

export function minTypeRankForStage(stageIndex: number) {
  if (stageIndex <= 1) return 0;
  if (stageIndex <= 4) return 1;
  if (stageIndex <= 8) return 2;
  if (stageIndex <= 12) return 3;
  if (stageIndex <= 15) return 4;
  return 5;
}

/** 年級越高，越不抽入門難度標籤的題目。 */
export function minQuestionLevelRankForStage(stageIndex: number) {
  if (stageIndex <= 2) return 0;
  if (stageIndex <= 5) return 1;
  if (stageIndex <= 8) return 2;
  if (stageIndex <= 11) return 3;
  return 4;
}

export function includesTravelKnowledge(stageIndex: number) {
  return stageIndex >= 8;
}
