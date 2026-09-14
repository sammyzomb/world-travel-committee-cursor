import { continueAfterReward } from "../../../../lib/run-session-engine";
import { loadRunSession, updateRunSession } from "../../../../lib/run-session-store";

type ContinueBody = {
  sessionToken?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ContinueBody;
    const sessionToken = body.sessionToken?.trim();
    if (!sessionToken) {
      return Response.json({ error: "sessionToken is required" }, { status: 400 });
    }

    const session = await loadRunSession(sessionToken);
    if (!session) {
      return Response.json({ error: "找不到遊戲場次或場次已過期，請重新開始" }, { status: 400 });
    }

    const nextState = continueAfterReward(session);
    const updated = {
      ...session,
      progress: {
        ...session.progress,
        pendingReward: false,
        stageCorrect: 0,
        lastFeedback: null,
      },
    };
    await updateRunSession(updated);

    return Response.json({
      sessionToken: updated.sessionToken,
      questionBankVersion: updated.questionBankVersion,
      state: nextState,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "無法繼續遊戲";
    return Response.json({ error: message }, { status: 400 });
  }
}
