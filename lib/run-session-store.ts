import { eq, lt } from "drizzle-orm";
import { getDb } from "../db";
import { runSessions } from "../db/schema";
import type { StoredRunSession } from "./run-session";
import { RUN_SESSION_TTL_MS } from "./run-session";

const memorySessions = new Map<string, StoredRunSession>();

export function allowRunSessionMemoryFallback() {
  return process.env.RUN_SESSION_MEMORY_FALLBACK === "true";
}

function isExpired(session: StoredRunSession) {
  return Date.parse(session.expiresAt) <= Date.now();
}

function rowToSession(row: {
  sessionToken: string;
  questionBankVersion: string;
  issuedPlanJson: string;
  stageStartsJson: string;
  progressJson: string;
  exhausted: boolean;
  createdAt: string;
  expiresAt: string;
}): StoredRunSession {
  return {
    sessionToken: row.sessionToken,
    questionBankVersion: row.questionBankVersion,
    issuedQuestions: JSON.parse(row.issuedPlanJson),
    stageStarts: JSON.parse(row.stageStartsJson),
    progress: JSON.parse(row.progressJson),
    exhausted: row.exhausted,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
  };
}

async function persistSession(session: StoredRunSession) {
  const db = await getDb();
  await db
    .insert(runSessions)
    .values({
      sessionToken: session.sessionToken,
      questionBankVersion: session.questionBankVersion,
      issuedPlanJson: JSON.stringify(session.issuedQuestions),
      stageStartsJson: JSON.stringify(session.stageStarts),
      progressJson: JSON.stringify(session.progress),
      exhausted: session.exhausted,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
    })
    .onConflictDoUpdate({
      target: runSessions.sessionToken,
      set: {
        progressJson: JSON.stringify(session.progress),
        expiresAt: session.expiresAt,
      },
    });
}

export async function saveRunSession(session: StoredRunSession) {
  memorySessions.set(session.sessionToken, session);

  if (allowRunSessionMemoryFallback()) {
    try {
      await persistSession(session);
    } catch {
      return;
    }
    return;
  }

  await persistSession(session);
}

export async function updateRunSession(session: StoredRunSession) {
  memorySessions.set(session.sessionToken, session);

  if (allowRunSessionMemoryFallback()) {
    try {
      await persistSession(session);
    } catch {
      return;
    }
    return;
  }

  await persistSession(session);
}

export async function cleanupExpiredSessions(now = Date.now()) {
  const cutoff = new Date(now).toISOString();
  for (const [token, session] of memorySessions) {
    if (session.expiresAt <= cutoff) {
      memorySessions.delete(token);
    }
  }

  if (allowRunSessionMemoryFallback()) {
    try {
      const db = await getDb();
      await db.delete(runSessions).where(lt(runSessions.expiresAt, cutoff));
    } catch {
      return;
    }
    return;
  }

  const db = await getDb();
  await db.delete(runSessions).where(lt(runSessions.expiresAt, cutoff));
}

export async function loadRunSession(sessionToken: string): Promise<StoredRunSession | null> {
  await cleanupExpiredSessions();

  const cached = memorySessions.get(sessionToken);
  if (cached) {
    if (isExpired(cached)) {
      memorySessions.delete(sessionToken);
      return null;
    }
    return cached;
  }

  try {
    const db = await getDb();
    const rows = await db
      .select()
      .from(runSessions)
      .where(eq(runSessions.sessionToken, sessionToken))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    const session = rowToSession(row);
    if (isExpired(session)) return null;
    memorySessions.set(sessionToken, session);
    return session;
  } catch {
    if (!allowRunSessionMemoryFallback()) return null;
    const fallback = memorySessions.get(sessionToken) ?? null;
    if (fallback && isExpired(fallback)) {
      memorySessions.delete(sessionToken);
      return null;
    }
    return fallback;
  }
}

export function createSessionExpiry(createdAt = new Date()) {
  return new Date(createdAt.getTime() + RUN_SESSION_TTL_MS).toISOString();
}
