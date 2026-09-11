import { desc, notInArray } from "drizzle-orm";
import { getDb } from "../../../db";
import { leaderboardEntries } from "../../../db/schema";

const TOP_LIMIT = 10;
const MAX_NAME_LENGTH = 20;

function toRouteErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error";
  const detail =
    error instanceof Error && error.cause instanceof Error ? error.cause.message : "";
  const combined = `${message}\n${detail}`;

  if (combined.includes("no such table") || combined.includes('from "leaderboard_entries"')) {
    return "The leaderboard table is unavailable. Generate the migration with `npm run db:generate`, then apply it to the local D1 database.";
  }

  return message;
}

export async function GET() {
  try {
    const db = getDb();
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
    const payload = (await request.json()) as {
      playerName?: string;
      score?: number;
      stageReached?: string;
      completed?: boolean;
    };

    const playerName = payload.playerName?.trim() ?? "";
    const score = payload.score ?? 0;
    const stageReached = payload.stageReached?.trim() ?? "";
    const completed = payload.completed === true;

    if (!playerName || playerName.length > MAX_NAME_LENGTH) {
      return Response.json(
        { error: `playerName is required and must be at most ${MAX_NAME_LENGTH} characters` },
        { status: 400 },
      );
    }
    if (!Number.isInteger(score) || score < 0) {
      return Response.json({ error: "score must be a non-negative integer" }, { status: 400 });
    }
    if (!stageReached) {
      return Response.json({ error: "stageReached is required" }, { status: 400 });
    }

    const db = getDb();
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
      .values({ playerName, score, stageReached, completed })
      .returning();

    const topRows = await db
      .select({ id: leaderboardEntries.id })
      .from(leaderboardEntries)
      .orderBy(desc(leaderboardEntries.score), desc(leaderboardEntries.id))
      .limit(TOP_LIMIT);

    const keepIds = topRows.map((row) => row.id);
    if (keepIds.length > 0) {
      await db.delete(leaderboardEntries).where(notInArray(leaderboardEntries.id, keepIds));
    }

    return Response.json({ qualified: true, entry }, { status: 201 });
  } catch (error) {
    return Response.json({ error: toRouteErrorMessage(error) }, { status: 500 });
  }
}
