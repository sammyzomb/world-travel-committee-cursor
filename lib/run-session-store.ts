import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { runSessions } from "../db/schema";
import type { StoredRunSession } from "./run-session";

const memorySessions = new Map<string, StoredRunSession>();

export async function saveRunSession(session: StoredRunSession) {
  memorySessions.set(session.sessionToken, session);
  try {
    const db = await getDb();
    await db.insert(runSessions).values({
      sessionToken: session.sessionToken,
      questionBankVersion: session.questionBankVersion,
      issuedPlanJson: JSON.stringify(session.issuedQuestions),
      stageStartsJson: JSON.stringify(session.stageStarts),
      exhausted: session.exhausted,
      createdAt: session.createdAt,
    });
  } catch {
    // 本地開發若 D1 未就緒，仍可用記憶體場次驗證。
  }
}

export async function loadRunSession(sessionToken: string): Promise<StoredRunSession | null> {
  const cached = memorySessions.get(sessionToken);
  if (cached) return cached;

  try {
    const db = await getDb();
    const rows = await db
      .select()
      .from(runSessions)
      .where(eq(runSessions.sessionToken, sessionToken))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    const session: StoredRunSession = {
      sessionToken: row.sessionToken,
      questionBankVersion: row.questionBankVersion,
      issuedQuestions: JSON.parse(row.issuedPlanJson),
      stageStarts: JSON.parse(row.stageStartsJson),
      exhausted: row.exhausted,
      createdAt: row.createdAt,
    };
    memorySessions.set(sessionToken, session);
    return session;
  } catch {
    return memorySessions.get(sessionToken) ?? null;
  }
}
