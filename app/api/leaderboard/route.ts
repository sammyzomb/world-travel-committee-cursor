import { and, desc, eq, gte } from "drizzle-orm";
import { getDb } from "../../../db";
import { leaderboardEntries } from "../../../db/schema";
import {
  highestPassedStageIndex,
  isFullCompletion,
  stageReachedName,
  validateRunSubmission,
  type RunSubmission,
} from "../../../lib/leaderboard-scoring";
import { getServerRunScore } from "../../../lib/run-session-engine";
import { validateIssuedRunPlayback } from "../../../lib/run-session";
import { loadRunSession } from "../../../lib/run-session-store";

// sessionToken authorizes run mutations and must never appear on the public board.
const publicEntryFields = {
  id: leaderboardEntries.id,
  playerName: leaderboardEntries.playerName,
  score: leaderboardEntries.score,
  stageReached: leaderboardEntries.stageReached,
  completed: leaderboardEntries.completed,
};
const TOP_LIMIT = 10;
const MAX_NAME_LENGTH = 20;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;

function toRouteErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error";
  const detail =
    error instanceof Error && error.cause instanceof Error ? error.cause.message : "";
  const combined = `${message}\n${detail}`;

  if (combined.includes("no such table") || combined.includes('from "leaderboard_entries"')) {
    return "名人榜資料表尚未建立。請在 Cloudflare D1 執行 drizzle 遷移後再試。";
  }

  if (combined.includes("Netlify 部署尚未設定資料庫")) {
    return "名人榜需要 Cloudflare D1 或另行設定資料庫，目前部署環境尚未連線。";
  }

  return message;
}

export async function GET() {
  try {
    const db = await getDb();
    const rows = await db
      .select(publicEntryFields)
      .from(leaderboardEntries)
      .orderBy(desc(leaderboardEntries.score), desc(leaderboardEntries.id))
      .limit(TOP_LIMIT);

    return Response.json({ entries: rows });
  } catch (error) {
    return Response.json(
      { entries: [], error: toRouteErrorMessage(error) },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as RunSubmission;
    const validationError = validateRunSubmission(payload);
    if (validationError) {
      return Response.json({ error: validationError }, { status: 400 });
    }

    const playerName = payload.playerName.trim();
    if (playerName.length > MAX_NAME_LENGTH) {
      return Response.json(
        { error: `playerName must be at most ${MAX_NAME_LENGTH} characters` },
        { status: 400 },
      );
    }

    const runSession = await loadRunSession(payload.sessionToken);
    if (!runSession) {
      return Response.json({ error: "找不到遊戲場次，請重新開始遊戲" }, { status: 400 });
    }
    if (runSession.questionBankVersion !== payload.questionBankVersion) {
      return Response.json({ error: "題庫已更新，請重新開始遊戲後再送出成績" }, { status: 400 });
    }

    const serverRun = getServerRunScore(runSession);
    if (!serverRun.endReason) {
      return Response.json({ error: "遊戲尚未結束，請完成挑戰後再提交成績" }, { status: 409 });
    }
    if (serverRun.answers.length === 0) {
      return Response.json({ error: "尚未完成任何作答" }, { status: 400 });
    }

    const playbackError = validateIssuedRunPlayback(runSession.issuedQuestions, serverRun.answers, {
      endedEarly: serverRun.endedEarly,
      endReason: serverRun.endReason,
      exhausted: runSession.exhausted,
    });
    if (playbackError) {
      return Response.json({ error: playbackError }, { status: 400 });
    }

    const db = await getDb();

    const existingSession = await db
      .select({ id: leaderboardEntries.id })
      .from(leaderboardEntries)
      .where(eq(leaderboardEntries.sessionToken, payload.sessionToken))
      .limit(1);
    if (existingSession.length > 0) {
      return Response.json({ error: "此場次成績已提交過" }, { status: 409 });
    }

    const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
    const recent = await db
      .select({ id: leaderboardEntries.id })
      .from(leaderboardEntries)
      .where(
        and(
          eq(leaderboardEntries.playerName, playerName),
          gte(leaderboardEntries.createdAt, since),
        ),
      );
    if (recent.length >= RATE_LIMIT_MAX) {
      return Response.json({ error: "提交過於頻繁，請稍後再試" }, { status: 429 });
    }

    const stageIndex = highestPassedStageIndex(serverRun.answers, serverRun.endedEarly);
    const stageReached = stageReachedName(stageIndex);
    const completed =
      serverRun.endReason === "full_completion" &&
      isFullCompletion(serverRun.answers, serverRun.endedEarly);

    const currentTop = await db
      .select({ score: leaderboardEntries.score })
      .from(leaderboardEntries)
      .orderBy(desc(leaderboardEntries.score), desc(leaderboardEntries.id))
      .limit(TOP_LIMIT);

    const qualifies =
      currentTop.length < TOP_LIMIT || serverRun.score > (currentTop[TOP_LIMIT - 1]?.score ?? 0);

    if (!qualifies) {
      return Response.json({ qualified: false, entry: null }, { status: 200 });
    }

    const [entry] = await db
      .insert(leaderboardEntries)
      .values({
        sessionToken: payload.sessionToken,
        playerName,
        score: serverRun.score,
        correctCount: serverRun.correctCount,
        stageReached,
        completed,
      })
      .returning(publicEntryFields);

    return Response.json({ qualified: true, entry }, { status: 201 });
  } catch (error) {
    return Response.json({ error: toRouteErrorMessage(error) }, { status: 500 });
  }
}
