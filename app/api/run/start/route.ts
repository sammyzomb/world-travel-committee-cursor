import type { ClientRunState } from "../../../../lib/game-client-types";
import { buildPlayableRunPlan } from "../../../../lib/run-plan";
import { QUESTION_BANK_VERSION } from "../../../../lib/question-bank-version";
import { buildClientRunState, createInitialProgress } from "../../../../lib/run-session-engine";
import { issuedQuestionsFromPlan } from "../../../../lib/run-session";
import {
  cleanupExpiredSessions,
  createSessionExpiry,
  saveRunSession,
} from "../../../../lib/run-session-store";

type StartRunBody = {
  avoidQuestionIds?: string[];
  avoidConceptIds?: string[];
};

function createSessionToken() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `run-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export async function POST(request: Request) {
  try {
    await cleanupExpiredSessions();

    const body = (await request.json()) as StartRunBody;
    const avoidQuestionIds = Array.isArray(body.avoidQuestionIds) ? body.avoidQuestionIds : [];
    const avoidConceptIds = Array.isArray(body.avoidConceptIds) ? body.avoidConceptIds : [];

    const playable = buildPlayableRunPlan(avoidQuestionIds, avoidConceptIds);
    if (!playable.plan || playable.totalQuestions === 0) {
      const gap = playable.gaps.find((item) => item.kind === "confirmed_gap");
      return Response.json(
        {
          error: gap
            ? `${gap.grade} 題量不足（需要 ${gap.required}，僅 ${gap.drawn}）`
            : "目前無法建立可玩場次",
          gaps: playable.gaps,
        },
        { status: 409 },
      );
    }

    const sessionToken = createSessionToken();
    const createdAt = new Date().toISOString();
    const expiresAt = createSessionExpiry(new Date(createdAt));
    const issuedQuestions = issuedQuestionsFromPlan(
      playable.plan.questions,
      playable.plan.stageStarts,
    );

    const session = {
      sessionToken,
      questionBankVersion: QUESTION_BANK_VERSION,
      issuedQuestions,
      stageStarts: playable.plan.stageStarts,
      exhausted: playable.plan.exhausted,
      createdAt,
      expiresAt,
      progress: createInitialProgress(),
    };

    await saveRunSession(session);

    const state: ClientRunState = {
      ...buildClientRunState(session),
      screen: "enroll",
    };

    return Response.json({
      sessionToken,
      questionBankVersion: QUESTION_BANK_VERSION,
      state,
      playableStageCount: playable.playableStageCount,
      gaps: playable.gaps,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "無法建立遊戲場次";
    return Response.json({ error: message }, { status: 500 });
  }
}
