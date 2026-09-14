import { readFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { drizzle } from "drizzle-orm/sqlite-proxy";
import * as schema from "./schema";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const drizzleDir = resolve(root, "drizzle");

let sqlite: DatabaseSync | null = null;
let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

function applyMigrations(database: DatabaseSync) {
  const files = readdirSync(drizzleDir)
    .filter((name) => name.endsWith(".sql"))
    .sort();
  for (const file of files) {
    const sql = readFileSync(resolve(drizzleDir, file), "utf8");
    database.exec(sql);
  }
}

function rowsAsArrays(statement: DatabaseSync["prepare"] extends (...args: never[]) => infer R
  ? R
  : never, params: unknown[]) {
  const columns = statement.columns?.() ?? [];
  const objects = statement.all(...params) as Record<string, unknown>[];
  return objects.map((row) => columns.map((column) => row[column.name]));
}

function rowAsArray(statement: DatabaseSync["prepare"] extends (...args: never[]) => infer R
  ? R
  : never, params: unknown[]) {
  const columns = statement.columns?.() ?? [];
  const row = statement.get(...params) as Record<string, unknown> | undefined;
  if (!row) return [];
  return [columns.map((column) => row[column.name])];
}

function createProxyDb(database: DatabaseSync) {
  return drizzle(
    async (sql, params, method) => {
      const statement = database.prepare(sql);
      if (method === "run") {
        statement.run(...params);
        return { rows: [] };
      }
      if (method === "all") {
        return { rows: rowsAsArrays(statement, params) };
      }
      if (method === "get") {
        return { rows: rowAsArray(statement, params) };
      }
      if (method === "values") {
        return { rows: rowsAsArrays(statement, params) };
      }
      const _exhaustive: never = method;
      throw new Error(`Unsupported sqlite proxy method: ${_exhaustive}`);
    },
    { schema },
  );
}

export function getIntegrationTestDb() {
  if (!db) {
    sqlite = new DatabaseSync(":memory:");
    applyMigrations(sqlite);
    db = createProxyDb(sqlite);
  }
  return db;
}

export function resetIntegrationTestDb() {
  if (sqlite) {
    sqlite.close();
  }
  sqlite = null;
  db = null;
}
