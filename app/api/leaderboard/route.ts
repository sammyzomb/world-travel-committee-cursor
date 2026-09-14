import { and, desc, eq, gte } from "drizzle-orm";
import { getDb } from "../../../db";
import { leaderboardEntries } from "../../../db/schema";
import {
  computeRunScore,
  highestPassedStageIndex,
  isFullCompletion,
  stageReachedName,
  validateRunProgress,
  validateRunSubmission,
  verifyRunAnswers,
  type RunSubmission,
} from "../../../lib/leaderboard-scoring";

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
      .select()
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

    const verifiedAnswers = verifyRunAnswers(payload.answers);
    if (!verifiedAnswers.ok) {
      return Response.json({ error: verifiedAnswers.error }, { status: 400 });
    }

    const progressError = validateRunProgress(verifiedAnswers.verified, payload.endedEarly);
    if (progressError) {
      return Response.json({ error: progressError }, { status: 400 });
    }

    const { score, correctCount } = computeRunScore(verifiedAnswers.verified);
    const stageIndex = highestPassedStageIndex(verifiedAnswers.verified, payload.endedEarly);
    const stageReached = stageReachedName(stageIndex);
    const completed = isFullCompletion(verifiedAnswers.verified, payload.endedEarly);

    const currentTop = await db
      .select({ score: leaderboardEntries.score })
      .from(leaderboardEntries)
      .orderBy(desc(leaderboardEntries.score), desc(leaderboardEntries.id))
      .limit(TOP_LIMIT);

    const qualifies =
      currentTop.length < TOP_LIMIT || score > (currentTop[TOP_LIMIT - 1]?.score ?? 0);

    if (!qualifies) {
      return Response.json({ qualified: false, entry: null }, { status: 200 });
    }

    const [entry] = await db
      .insert(leaderboardEntries)
      .values({
        sessionToken: payload.sessionToken,
        playerName,
        score,
        correctCount,
        stageReached,
        completed,
      })
      .returning();

    return Response.json({ qualified: true, entry }, { status: 201 });
  } catch (error) {
    return Response.json({ error: toRouteErrorMessage(error) }, { status: 500 });
  }
}
