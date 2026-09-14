/** 題目難度由低到高，對應國小 → 研究所漸進。 */
export const QUESTION_LEVELS = [
  "旅行新手",
  "城市旅人",
  "國家達人",
  "洲際領隊",
  "環球旅行家",
] as const;

export type QuestionLevel = (typeof QUESTION_LEVELS)[number];

/** 各年級 primary pool 遞升，避免高年級仍大量抽到入門題。 */
export const educationStages = [
  { name: "小一", group: "國小", pool: ["旅行新手"] },
  { name: "小二", group: "國小", pool: ["旅行新手"] },
  { name: "小三", group: "國小", pool: ["旅行新手", "城市旅人"] },
  { name: "小四", group: "國小", pool: ["城市旅人"] },
  { name: "小五", group: "國小", pool: ["城市旅人", "國家達人"] },
  { name: "小六", group: "國小", pool: ["國家達人"] },
  { name: "國一", group: "國中", pool: ["國家達人", "洲際領隊"] },
  { name: "國二", group: "國中", pool: ["洲際領隊"] },
  { name: "國三", group: "國中", pool: ["洲際領隊", "環球旅行家"] },
  { name: "高一", group: "高中", pool: ["環球旅行家"] },
  { name: "高二", group: "高中", pool: ["環球旅行家"] },
  { name: "高三", group: "高中", pool: ["環球旅行家"] },
  { name: "大一", group: "大學", pool: ["環球旅行家"] },
  { name: "大二", group: "大學", pool: ["環球旅行家"] },
  { name: "大三", group: "大學", pool: ["環球旅行家"] },
  { name: "大四", group: "大學", pool: ["環球旅行家"] },
  { name: "研一", group: "研究所", pool: ["環球旅行家"] },
  { name: "研二", group: "研究所", pool: ["環球旅行家"] },
] as const;

export const formalStageNames: Record<string, string> = {
  小一: "國小一年級", 小二: "國小二年級", 小三: "國小三年級", 小四: "國小四年級", 小五: "國小五年級", 小六: "國小六年級",
  國一: "國中一年級", 國二: "國中二年級", 國三: "國中三年級",
  高一: "高中一年級", 高二: "高中二年級", 高三: "高中三年級",
  大一: "大學一年級", 大二: "大學二年級", 大三: "大學三年級", 大四: "大學四年級",
  研一: "研究所一年級", 研二: "研究所二年級",
};

/** 小六、國三、高三、大四、研二為學制畢業節點。 */
export const graduationStageIndexes = new Set([5, 8, 11, 15, 17]);
export const FINAL_STAGE_INDEX = educationStages.length - 1;

/**
 * 各學級題數：年級越高題越多（小一 5 題 → 研二 10 題）。
 * 小一含 2 題送分是非題，其餘為正式題。
 */
export const STAGE_QUESTION_COUNTS: readonly number[] = [
  5, 5, 6, 6, 7, 7,
  7, 8, 8,
  8, 9, 9,
  9, 9, 9, 10,
  10, 10,
];

/** 小一題數；供舊測試與文案 fallback。 */
export const QUESTIONS_PER_STAGE = STAGE_QUESTION_COUNTS[0];

export const MAX_RUN_QUESTIONS = STAGE_QUESTION_COUNTS.reduce((sum, count) => sum + count, 0);

export function questionsPerStage(stageIndex: number) {
  const index = Math.max(0, Math.min(stageIndex, STAGE_QUESTION_COUNTS.length - 1));
  return STAGE_QUESTION_COUNTS[index];
}

export const STARTING_LIVES = 3;
/** 小一開局送分是非題數；其餘題位由多題型分散抽題補滿。 */
export const WARMUP_QUESTIONS_FIRST_STAGE = 2;
export const PASS_CORRECT_REQUIRED = 3;
export const POINTS_PER_CORRECT = 5;

/** 通關所需答對題數：隨題數增加，約需答對六成（至少 3 題）。 */
export function passRequiredForStage(stageLength: number = QUESTIONS_PER_STAGE) {
  return Math.max(PASS_CORRECT_REQUIRED, Math.ceil(stageLength * 0.6));
}

/** 小一～小三 2 選項 → 小四～小六 3 選項 → 國中以上 4 選項。 */
export function optionCountForStage(stageIndex: number) {
  if (stageIndex <= 2) return 2;
  if (stageIndex <= 5) return 3;
  return 4;
}
