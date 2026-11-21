import { Database } from 'bun:sqlite'
import { randomUUIDv7 } from 'bun'
import { readFileSync } from 'node:fs'

const DATABASE_PATH = process.env.DB_PATH ?? new URL('./hub.sqlite', import.meta.url).pathname
const SCHEMA_PATH = new URL('./schema.sql', import.meta.url).pathname

export type Row = Record<string, string | number | null>

/** The single SQLite connection. Foreign keys are off by default in SQLite, so turn them on. */
export const sql = open()

function open(): Database {
  const database = new Database(DATABASE_PATH, { create: true, strict: true })
  database.run('PRAGMA journal_mode = WAL')
  database.run('PRAGMA foreign_keys = ON')
  return database
}

/** Drops every table and runs the schema again, like `php artisan migrate:fresh`. */
export function migrateFresh() {
  sql.run('PRAGMA foreign_keys = OFF')
  const tables = sql.query<{ name: string }, []>("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'").all()
  for (const { name } of tables) sql.run(`DROP TABLE "${name}"`)
  sql.run(readFileSync(SCHEMA_PATH, 'utf8'))
  sql.run('PRAGMA foreign_keys = ON')
}

/** Tables that hold the model; the session tables are kept when the model is rewritten. */
const SESSION_TABLES = ['sessions', 'pending_social_identities']

/**
 * Replaces every model row in one transaction, then checks every foreign key before committing.
 * Foreign keys are off meanwhile, so deleting users does not cascade to their sessions.
 */
export function replaceRows(write: () => void) {
  sql.run('PRAGMA foreign_keys = OFF')
  try {
    transaction(() => {
      const tables = sql
        .query<{ name: string }, []>("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
        .all()
        .filter(({ name }) => !SESSION_TABLES.includes(name))
      for (const { name } of tables) sql.run(`DELETE FROM "${name}"`)
      write()
      sql.run('DELETE FROM sessions WHERE user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM users)')
      const broken = sql.query('PRAGMA foreign_key_check').all()
      if (broken.length > 0) throw new Error(`Chave estrangeira quebrada: ${JSON.stringify(broken.slice(0, 3))}`)
    })
  } finally {
    sql.run('PRAGMA foreign_keys = ON')
  }
}

export function hasSchema(): boolean {
  return !!sql.query("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'users'").get()
}

/** Inserts one row; keys are column names. */
export function insert(table: string, row: Record<string, unknown>) {
  const columns = Object.keys(row)
  sql
    .query(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map((c) => `$${c}`).join(', ')})`)
    .run(Object.fromEntries(columns.map((c) => [c, toSql(row[c])])) as Row)
}

export function update(table: string, where: Record<string, unknown>, values: Record<string, unknown>) {
  const set = Object.keys(values).map((c) => `${c} = $set_${c}`)
  const conditions = Object.keys(where).map((c) => `${c} = $where_${c}`)
  sql.query(`UPDATE ${table} SET ${set.join(', ')} WHERE ${conditions.join(' AND ')}`).run({
    ...Object.fromEntries(Object.entries(values).map(([c, v]) => [`set_${c}`, toSql(v)])),
    ...Object.fromEntries(Object.entries(where).map(([c, v]) => [`where_${c}`, toSql(v)])),
  } as Row)
}

/** Runs a query and returns every row. */
export function all<T = Row>(query: string, params: Record<string, unknown> = {}): T[] {
  return sql.query(query).all(params as Row) as T[]
}

export function first<T = Row>(query: string, params: Record<string, unknown> = {}): T | undefined {
  return (sql.query(query).get(params as Row) as T | null) ?? undefined
}

export function transaction<T>(work: () => T): T {
  return sql.transaction(work)()
}

/** Short random id for new rows, like the prototype's `newId()`. */
export function newId(): string {
  return randomUUIDv7().replaceAll('-', '').slice(-12)
}

export function now(): string {
  return new Date().toISOString()
}

function toSql(value: unknown): string | number | null {
  if (value === undefined || value === null) return null
  if (typeof value === 'boolean') return value ? 1 : 0
  if (typeof value === 'string' || typeof value === 'number') return value
  return JSON.stringify(value)
}
