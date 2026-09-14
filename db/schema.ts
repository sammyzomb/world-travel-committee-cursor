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
