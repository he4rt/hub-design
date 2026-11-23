import type { Database } from 'bun:sqlite'

/** Adds the profile cover to a database created before it existed; every profile keeps the ink band. */
export function migrateProfileCover(database: Database) {
  const columns = database.query<{ name: string }, []>('PRAGMA table_info(member_profiles)').all()
  if (columns.length === 0 || columns.some((column) => column.name === 'cover_image_url')) return
  database.run('ALTER TABLE member_profiles ADD COLUMN cover_image_url TEXT')
}
