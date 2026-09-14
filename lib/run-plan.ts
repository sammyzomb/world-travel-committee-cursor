import { educationStages, FINAL_STAGE_INDEX, questionsPerStage } from "./game-config";
import { appendNextStage, createRound, getStageIndex, type RoundPlan } from "./game-round";

export type PlayableRunGap =
  | {
      kind: "confirmed_gap";
      stageIndex: number;
      grade: string;
      required: number;
      drawn: number;
      shortfall: number;
    }
  | {
      kind: "not_simulated";
      stageIndex: number;
      grade: string;
      note: string;
    };

export type PlayableRunPlanResult = {
  plan: RoundPlan | null;
  playableStageCount: number;
  totalQuestions: number;
  gaps: PlayableRunGap[];
  completeThroughFinal: boolean;
};

function stageQuestionCount(plan: RoundPlan, stageIndex: number) {
  const start = plan.stageStarts[stageIndex];
  if (start === undefined) return 0;
  const end = plan.stageStarts[stageIndex + 1] ?? plan.questions.length;
  return end - start;
}

function trimPartialStage(plan: RoundPlan, stageIndex: number): RoundPlan {
  const start = plan.stageStarts[stageIndex];
  if (start === undefined) return plan;
  return {
    ...plan,
    questions: plan.questions.slice(0, start),
    stageStarts: plan.stageStarts.slice(0, stageIndex),
    exhausted: true,
  };
}

/** 只保留題量已抽滿的學級；未抽滿者不加入可玩場次。 */
export function buildPlayableRunPlan(
  previousQuestionIds: string[] = [],
  previousConceptIds: string[] = [],
): PlayableRunPlanResult {
  const gaps: PlayableRunGap[] = [];
  let plan = createRound(previousQuestionIds, previousConceptIds);
  const stageZeroRequired = questionsPerStage(0);
  const stageZeroDrawn = plan.questions.length;

  if (stageZeroDrawn < stageZeroRequired) {
    return {
      plan: null,
      playableStageCount: 0,
      totalQuestions: 0,
      gaps: [
        {
          kind: "confirmed_gap",
          stageIndex: 0,
          grade: "小一",
          required: stageZeroRequired,
          drawn: stageZeroDrawn,
          shortfall: stageZeroRequired - stageZeroDrawn,
        },
        ...Array.from({ length: FINAL_STAGE_INDEX }, (_, index) => ({
          kind: "not_simulated" as const,
          stageIndex: index + 1,
          grade: educationStages[index + 1]?.name ?? `stage-${index + 1}`,
          note: "小一題量不足，後續學級未模擬",
        })),
      ],
      completeThroughFinal: false,
    };
  }

  let playableStageCount = 1;

  for (let stageIndex = 1; stageIndex <= FINAL_STAGE_INDEX; stageIndex += 1) {
    const required = questionsPerStage(stageIndex);
    const next = appendNextStage(plan, stageIndex);
    if (!next) {
      gaps.push({
        kind: "confirmed_gap",
        stageIndex,
        grade: educationStages[stageIndex]?.name ?? `stage-${stageIndex}`,
        required,
        drawn: 0,
        shortfall: required,
      });
      for (let pending = stageIndex + 1; pending <= FINAL_STAGE_INDEX; pending += 1) {
        gaps.push({
          kind: "not_simulated",
          stageIndex: pending,
          grade: `stage-${pending}`,
          note: `stage ${stageIndex} 無法抽題，後續學級未模擬`,
        });
      }
      break;
    }

    const drawn = stageQuestionCount(next, stageIndex);
    if (drawn < required) {
      plan = trimPartialStage(next, stageIndex);
      gaps.push({
        kind: "confirmed_gap",
        stageIndex,
        grade: educationStages[stageIndex]?.name ?? `stage-${stageIndex}`,
        required,
        drawn,
        shortfall: required - drawn,
      });
      for (let pending = stageIndex + 1; pending <= FINAL_STAGE_INDEX; pending += 1) {
        gaps.push({
          kind: "not_simulated",
          stageIndex: pending,
          grade: `stage-${pending}`,
          note: `stage ${stageIndex} 題量不足，後續學級未模擬`,
        });
      }
      break;
    }

    plan = next;
    playableStageCount += 1;
  }

  return {
    plan,
    playableStageCount,
    totalQuestions: plan.questions.length,
    gaps,
    completeThroughFinal: playableStageCount === FINAL_STAGE_INDEX + 1 && gaps.length === 0,
  };
}

export function stageIndexForQuestion(plan: RoundPlan, questionIndex: number) {
  return getStageIndex(plan.stageStarts, questionIndex);
}
