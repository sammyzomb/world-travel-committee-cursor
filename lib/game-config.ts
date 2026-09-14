/** 題目難度由低到高，對應國小 → 研究所漸進。 */
export const QUESTION_LEVELS = [
  "旅行新手",
  "城市旅人",
  "國家達人",
  "洲際領隊",
  "環球旅行家",
] as const;

export type QuestionLevel = (typeof QUESTION_LEVELS)[number];

export const educationStages = [
  { name: "小一", group: "國小", pool: ["旅行新手"] },
  { name: "小二", group: "國小", pool: ["旅行新手"] },
  { name: "小三", group: "國小", pool: ["旅行新手", "城市旅人"] },
  { name: "小四", group: "國小", pool: ["旅行新手", "城市旅人"] },
  { name: "小五", group: "國小", pool: ["城市旅人"] },
  { name: "小六", group: "國小", pool: ["城市旅人", "國家達人"] },
  { name: "國一", group: "國中", pool: ["城市旅人", "國家達人"] },
  { name: "國二", group: "國中", pool: ["國家達人"] },
  { name: "國三", group: "國中", pool: ["國家達人", "洲際領隊"] },
  { name: "高一", group: "高中", pool: ["洲際領隊"] },
  { name: "高二", group: "高中", pool: ["洲際領隊", "環球旅行家"] },
  { name: "高三", group: "高中", pool: ["環球旅行家"] },
  { name: "大一", group: "大學", pool: ["洲際領隊", "環球旅行家"] },
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
/** 每個學級固定出 5 題（小一含 3 題送分是非題 + 2 題正式題）。 */
export const QUESTIONS_PER_STAGE = 5;
export const STARTING_LIVES = 3;
export const WARMUP_QUESTIONS_FIRST_STAGE = 3;
export const PASS_CORRECT_REQUIRED = 3;
export const POINTS_PER_CORRECT = 5;

export function passRequiredForStage(stageLength: number = QUESTIONS_PER_STAGE) {
  return Math.min(PASS_CORRECT_REQUIRED, stageLength);
}

/** 小一～小三 2 選項 → 小四～小六 3 選項 → 國中以上 4 選項。 */
export function optionCountForStage(stageIndex: number) {
  if (stageIndex <= 2) return 2;
  if (stageIndex <= 5) return 3;
  return 4;
}
