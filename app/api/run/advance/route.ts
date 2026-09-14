import { advanceAfterFeedback } from "../../../../lib/run-session-engine";
import { loadRunSession, updateRunSession } from "../../../../lib/run-session-store";

type AdvanceBody = {
  sessionToken?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AdvanceBody;
    const sessionToken = body.sessionToken?.trim();
    if (!sessionToken) {
      return Response.json({ error: "sessionToken is required" }, { status: 400 });
    }

    const session = await loadRunSession(sessionToken);
    if (!session) {
      return Response.json({ error: "找不到遊戲場次或場次已過期，請重新開始" }, { status: 400 });
    }
    if (!session.progress.lastFeedback) {
      return Response.json({ error: "目前沒有待確認的作答結果" }, { status: 400 });
    }

    const nextState = advanceAfterFeedback(session);
    const updated = { ...session, progress: { ...session.progress, lastFeedback: null } };
    await updateRunSession(updated);

    return Response.json({
      sessionToken: updated.sessionToken,
      questionBankVersion: updated.questionBankVersion,
      state: nextState,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "無法前往下一題";
    return Response.json({ error: message }, { status: 400 });
  }
}
