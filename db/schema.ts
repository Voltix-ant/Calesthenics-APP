import type { SQLiteDatabase } from "expo-sqlite";

export const initializeDatabase = async (db: SQLiteDatabase) => {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('reps', 'time')),
      category TEXT,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS workouts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS workout_blocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workout_id INTEGER NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
      order_index INTEGER NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('exercise', 'rest')),
      exercise_id INTEGER REFERENCES exercises(id),
      rest_between_sets INTEGER,
      rest_seconds INTEGER
    );

    CREATE TABLE IF NOT EXISTS workout_sets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      block_id INTEGER NOT NULL REFERENCES workout_blocks(id) ON DELETE CASCADE,
      set_number INTEGER NOT NULL,
      target_value INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workout_id INTEGER NOT NULL REFERENCES workouts(id),
      performed_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS session_performances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      block_id INTEGER NOT NULL REFERENCES workout_blocks(id),
      set_number INTEGER NOT NULL,
      actual_value INTEGER NOT NULL
    );
  `);

  // Migration : ajoute la colonne "description" si elle n'existe pas encore
  // (nécessaire car CREATE TABLE IF NOT EXISTS n'a aucun effet sur les tables déjà créées)
  const columns = await db.getAllAsync<{ name: string }>(
    `PRAGMA table_info(workouts)`,
  );
  const hasDescription = columns.some((col) => col.name === "description");
  if (!hasDescription) {
    await db.execAsync(`ALTER TABLE workouts ADD COLUMN description TEXT;`);
  }
};
