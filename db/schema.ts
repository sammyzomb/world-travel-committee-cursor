import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const leaderboardEntries = sqliteTable("leaderboard_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionToken: text("session_token").unique(),
  playerName: text("player_name").notNull(),
  score: integer("score").notNull(),
  correctCount: integer("correct_count"),
  stageReached: text("stage_reached").notNull(),
  completed: integer("completed", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const runSessions = sqliteTable("run_sessions", {
  sessionToken: text("session_token").primaryKey(),
  questionBankVersion: text("question_bank_version").notNull(),
  issuedPlanJson: text("issued_plan_json").notNull(),
  stageStartsJson: text("stage_starts_json").notNull(),
  exhausted: integer("exhausted", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
