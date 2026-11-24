import type { Database } from 'bun:sqlite'

/**
 * The profile had two texts, the account's bio and a longer "Sobre"; now the bio is the one "Sobre".
 * A member who wrote the longer text keeps it as their bio, and the old column goes away. "Aprendendo
 * agora" left the profile too: what a member is learning goes in their publications.
 */
export function migrateProfileAbout(database: Database) {
  const columns = database.query<{ name: string }, []>('PRAGMA table_info(member_profiles)').all()
  if (columns.some((column) => column.name === 'current_focus')) database.run('ALTER TABLE member_profiles DROP COLUMN current_focus')
  if (!columns.some((column) => column.name === 'readme')) return
  database.transaction(() => {
    database.run(`UPDATE users SET bio = (SELECT readme FROM member_profiles WHERE user_id = users.id)
      WHERE EXISTS (SELECT 1 FROM member_profiles WHERE user_id = users.id AND TRIM(COALESCE(readme, '')) <> '')`)
    database.run('ALTER TABLE member_profiles DROP COLUMN readme')
  })()
}
