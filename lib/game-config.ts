import { travelStageLabel } from './travel-stage-label';
/** 全年齡的旅行挑戰難度；舊年級鍵只用於儲存資料相容。 */
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

export const formalStageNames: Record<string, string> = Object.fromEntries(educationStages.map(stage=>[stage.name,travelStageLabel(stage.name)]));

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

/** 選擇題保留四個選項；是非題仍為兩個選項。 */
export function optionCountForStage(_stageIndex: number) {
  return 4;
}
