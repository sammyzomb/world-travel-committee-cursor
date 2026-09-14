import { buildClientRunState, submitAnswer } from "../../../../lib/run-session-engine";
import { loadRunSession, updateRunSession } from "../../../../lib/run-session-store";

type AnswerBody = {
  sessionToken?: string;
  selectedOption?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AnswerBody;
    const sessionToken = body.sessionToken?.trim();
    const selectedOption = body.selectedOption?.trim();

    if (!sessionToken) {
      return Response.json({ error: "sessionToken is required" }, { status: 400 });
    }
    if (!selectedOption) {
      return Response.json({ error: "selectedOption is required" }, { status: 400 });
    }

    const session = await loadRunSession(sessionToken);
    if (!session) {
      return Response.json({ error: "找不到遊戲場次或場次已過期，請重新開始" }, { status: 400 });
    }

    const result = submitAnswer(session, selectedOption);
    await updateRunSession(result.session);

    return Response.json({
      sessionToken: result.session.sessionToken,
      questionBankVersion: result.session.questionBankVersion,
      state: result.state,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "作答失敗";
    return Response.json({ error: message }, { status: 400 });
  }
}
