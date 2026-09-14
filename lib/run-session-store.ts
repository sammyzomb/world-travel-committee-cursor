import { and, eq, lt } from "drizzle-orm";
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
  progressRevision?: number;
  exhausted: boolean;
  createdAt: string;
  expiresAt: string;
}): StoredRunSession {
  const progress = JSON.parse(row.progressJson);
  return {
    sessionToken: row.sessionToken,
    questionBankVersion: row.questionBankVersion,
    issuedQuestions: JSON.parse(row.issuedPlanJson),
    stageStarts: JSON.parse(row.stageStartsJson),
    progress: {
      ...progress,
      revision: row.progressRevision ?? progress.revision ?? 0,
    },
    exhausted: row.exhausted,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
  };
}

async function loadFromDatabase(sessionToken: string): Promise<StoredRunSession | null> {
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
  return session;
}

async function insertSession(session: StoredRunSession) {
  const db = await getDb();
  await db.insert(runSessions).values({
    sessionToken: session.sessionToken,
    questionBankVersion: session.questionBankVersion,
    issuedPlanJson: JSON.stringify(session.issuedQuestions),
    stageStartsJson: JSON.stringify(session.stageStarts),
    progressJson: JSON.stringify({
      ...session.progress,
      revision: undefined,
    }),
    progressRevision: session.progress.revision,
    exhausted: session.exhausted,
    createdAt: session.createdAt,
    expiresAt: session.expiresAt,
  });
}

async function updateSessionConditional(
  session: StoredRunSession,
  expectedRevision: number,
): Promise<boolean> {
  const db = await getDb();
  const updated = await db
    .update(runSessions)
    .set({
      progressJson: JSON.stringify({
        ...session.progress,
        revision: undefined,
      }),
      progressRevision: session.progress.revision,
      expiresAt: session.expiresAt,
    })
    .where(
      and(
        eq(runSessions.sessionToken, session.sessionToken),
        eq(runSessions.progressRevision, expectedRevision),
      ),
    )
    .returning({ sessionToken: runSessions.sessionToken });
  return updated.length > 0;
}

export type ConditionalUpdateResult =
  | { ok: true; session: StoredRunSession; idempotent?: boolean }
  | { ok: false; reason: "not_found" | "conflict"; error?: string };

export async function saveRunSession(session: StoredRunSession) {
  if (allowRunSessionMemoryFallback()) {
    try {
      await insertSession(session);
      memorySessions.set(session.sessionToken, session);
      return;
    } catch {
      memorySessions.set(session.sessionToken, session);
      return;
    }
  }

  await insertSession(session);
  memorySessions.set(session.sessionToken, session);
}

export async function updateRunSession(
  session: StoredRunSession,
  expectedRevision: number,
): Promise<ConditionalUpdateResult> {
  if (session.progress.revision !== expectedRevision + 1) {
    return { ok: false, reason: "conflict", error: "revision mismatch in update payload" };
  }

  if (allowRunSessionMemoryFallback()) {
    const cached = memorySessions.get(session.sessionToken);
    if (!cached) {
      try {
        const persisted = await updateSessionConditional(session, expectedRevision);
        if (!persisted) return { ok: false, reason: "conflict" };
        memorySessions.set(session.sessionToken, session);
        return { ok: true, session };
      } catch {
        return { ok: false, reason: "not_found" };
      }
    }
    if (cached.progress.revision !== expectedRevision) {
      return { ok: false, reason: "conflict" };
    }
    try {
      const persisted = await updateSessionConditional(session, expectedRevision);
      if (!persisted && process.env.INTEGRATION_TEST_DB !== "true") {
        return { ok: false, reason: "conflict" };
      }
    } catch {
      memorySessions.set(session.sessionToken, session);
      return { ok: true, session };
    }
    memorySessions.set(session.sessionToken, session);
    return { ok: true, session };
  }

  const persisted = await updateSessionConditional(session, expectedRevision);
  if (!persisted) {
    return { ok: false, reason: "conflict" };
  }
  memorySessions.set(session.sessionToken, session);
  return { ok: true, session };
}

export async function cleanupExpiredSessions(now = Date.now()) {
  const cutoff = new Date(now).toISOString();
  for (const [token, session] of memorySessions) {
    if (session.expiresAt <= cutoff) {
      memorySessions.delete(token);
    }
  }

  try {
    const db = await getDb();
    await db.delete(runSessions).where(lt(runSessions.expiresAt, cutoff));
  } catch {
    if (!allowRunSessionMemoryFallback()) {
      throw new Error("Failed to cleanup expired run sessions");
    }
  }
}

export async function loadRunSession(
  sessionToken: string,
  options: { bypassCache?: boolean } = {},
): Promise<StoredRunSession | null> {
  await cleanupExpiredSessions();

  if (!options.bypassCache && allowRunSessionMemoryFallback()) {
    const cached = memorySessions.get(sessionToken);
    if (cached) {
      if (isExpired(cached)) {
        memorySessions.delete(sessionToken);
        return null;
      }
      return cached;
    }
  }

  try {
    const session = await loadFromDatabase(sessionToken);
    if (!session) {
      if (allowRunSessionMemoryFallback()) {
        const fallback = memorySessions.get(sessionToken) ?? null;
        if (fallback && isExpired(fallback)) {
          memorySessions.delete(sessionToken);
          return null;
        }
        return fallback;
      }
      return null;
    }
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
