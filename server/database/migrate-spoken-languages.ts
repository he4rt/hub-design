import type { Database } from 'bun:sqlite'

/** Adds the spoken languages (idiomas) and their level to a database created before them; every member starts with none. */
export function migrateSpokenLanguages(database: Database) {
  const columns = database.query<{ name: string }, []>('PRAGMA table_info(user_spoken_languages)').all()
  if (columns.length > 0 && !columns.some((column) => column.name === 'level')) database.run('DROP TABLE user_spoken_languages')
  database.run(`CREATE TABLE IF NOT EXISTS user_spoken_languages (
    user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    language TEXT NOT NULL,
    level TEXT NOT NULL CHECK (level IN ('basic', 'intermediate', 'advanced', 'fluent', 'native')),
    position INTEGER NOT NULL,
    PRIMARY KEY (user_id, language)
  )`)
}
