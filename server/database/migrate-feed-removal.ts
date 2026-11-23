import type { Database } from 'bun:sqlite'

/** Adds the staff removal to Feed posts and comments of a database created before it existed. */
export function migrateFeedRemoval(database: Database) {
  for (const table of ['feed_posts', 'feed_comments']) {
    const columns = database.query<{ name: string }, []>(`PRAGMA table_info(${table})`).all()
    if (columns.length === 0 || columns.some((column) => column.name === 'removed_at')) continue
    database.transaction(() => {
      database.run(`ALTER TABLE ${table} ADD COLUMN removal_reason TEXT`)
      database.run(`ALTER TABLE ${table} ADD COLUMN removed_by TEXT REFERENCES users (id)`)
      database.run(`ALTER TABLE ${table} ADD COLUMN removed_at TEXT`)
    })()
  }
}
