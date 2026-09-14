import type { ClientRunState } from "./game-client-types";
import {
  advanceAfterFeedback,
  buildClientRunState,
  continueAfterReward,
  RunSessionEngineError,
  submitAnswer,
  type EngineMutationResult,
  type SubmitAnswerInput,
} from "./run-session-engine";
import { loadRunSession, updateRunSession } from "./run-session-store";

export type MutationResponse = {
  sessionToken: string;
  questionBankVersion: string;
  state: ClientRunState;
  idempotent?: boolean;
};

async function persistMutation(
  sessionToken: string,
  expectedRevision: number,
  result: EngineMutationResult,
): Promise<MutationResponse | { error: string; status: number }> {
  if (result.idempotent) {
    return {
      sessionToken: result.session.sessionToken,
      questionBankVersion: result.session.questionBankVersion,
      state: result.state,
      idempotent: true,
    };
  }

  const updated = await updateRunSession(result.session, expectedRevision);
  if (!updated.ok) {
    if (updated.reason === "conflict") {
      const reloaded = await loadRunSession(sessionToken, { bypassCache: true });
      if (reloaded) {
        return {
          sessionToken: reloaded.sessionToken,
          questionBankVersion: reloaded.questionBankVersion,
          state: buildClientRunState(reloaded),
          idempotent: true,
        };
      }
      return { error: "進度衝突，請重新載入", status: 409 };
    }
    return { error: "找不到遊戲場次或場次已過期，請重新開始", status: 400 };
  }

  return {
    sessionToken: updated.session.sessionToken,
    questionBankVersion: updated.session.questionBankVersion,
    state: result.state,
  };
}

export async function mutateSubmitAnswer(sessionToken: string, input: SubmitAnswerInput) {
  const session = await loadRunSession(sessionToken, { bypassCache: true });
  if (!session) {
    return { error: "找不到遊戲場次或場次已過期，請重新開始", status: 400 };
  }

  try {
    const result = submitAnswer(session, input);
    return await persistMutation(sessionToken, input.progressRevision, result);
  } catch (error) {
    if (error instanceof RunSessionEngineError) {
      return { error: error.message, status: error.status };
    }
    const message = error instanceof Error ? error.message : "作答失敗";
    return { error: message, status: 400 };
  }
}

export async function mutateAdvanceAfterFeedback(sessionToken: string, progressRevision: number) {
  const session = await loadRunSession(sessionToken, { bypassCache: true });
  if (!session) {
    return { error: "找不到遊戲場次或場次已過期，請重新開始", status: 400 };
  }

  try {
    const result = advanceAfterFeedback(session, progressRevision);
    return await persistMutation(sessionToken, progressRevision, result);
  } catch (error) {
    if (error instanceof RunSessionEngineError) {
      return { error: error.message, status: error.status };
    }
    const message = error instanceof Error ? error.message : "無法前往下一題";
    return { error: message, status: 400 };
  }
}

export async function mutateContinueAfterReward(sessionToken: string, progressRevision: number) {
  const session = await loadRunSession(sessionToken, { bypassCache: true });
  if (!session) {
    return { error: "找不到遊戲場次或場次已過期，請重新開始", status: 400 };
  }

  try {
    const result = continueAfterReward(session, progressRevision);
    return await persistMutation(sessionToken, progressRevision, result);
  } catch (error) {
    if (error instanceof RunSessionEngineError) {
      return { error: error.message, status: error.status };
    }
    const message = error instanceof Error ? error.message : "無法繼續遊戲";
    return { error: message, status: 400 };
  }
}
