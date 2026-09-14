import { FINAL_STAGE_INDEX } from "./game-config";
import { appendNextStage, createRound, type RoundPlan } from "./game-round";

/** 建立含全部 18 學級題目的完整場次計畫。 */
export function buildFullRunPlan(
  previousQuestionIds: string[] = [],
  previousConceptIds: string[] = [],
): RoundPlan {
  let plan = createRound(previousQuestionIds, previousConceptIds);
  for (let stageIndex = 1; stageIndex <= FINAL_STAGE_INDEX; stageIndex += 1) {
    if (plan.exhausted) break;
    const next = appendNextStage(plan, stageIndex);
    if (!next) break;
    plan = next;
  }
  return plan;
}
