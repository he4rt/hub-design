import type { Database } from 'bun:sqlite'
import { randomUUID } from 'node:crypto'

/** Additive migration; these operational records are NOT part of the replace-all domain store. */
export function migrateGithub(database: Database) {
  database.transaction(() => database.run(`
    CREATE TABLE IF NOT EXISTS github_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kind TEXT NOT NULL,
      dedupe_key TEXT NOT NULL UNIQUE,
      payload TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      attempts INTEGER NOT NULL DEFAULT 0,
      available_at INTEGER NOT NULL DEFAULT 0,
      lease_until INTEGER,
      lease_token TEXT,
      last_error TEXT,
      created_at INTEGER NOT NULL,
      completed_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS github_jobs_ready ON github_jobs(status, available_at);
    CREATE TABLE IF NOT EXISTS github_resources (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS github_identities (
      github_id INTEGER PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      login TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS action_receipts (
      scope TEXT NOT NULL,
      key TEXT NOT NULL,
      payload_hash TEXT NOT NULL,
      output TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      PRIMARY KEY (scope, key)
    );
  `))()
}

export type GithubJob = {
  id: number; kind: string; dedupe_key: string; payload: string; attempts: number; lease_token: string
}

/** At-least-once delivery, leased claims, and bounded exponential backoff. No network in a transaction. */
export function githubQueue(database: Database) {
  return {
    enqueue(kind: string, key: string, payload: unknown, now = Date.now()) {
      return database.query(`INSERT OR IGNORE INTO github_jobs(kind,dedupe_key,payload,created_at)
        VALUES(?,?,?,?)`).run(kind, key, JSON.stringify(payload), now).changes > 0
    },
    claim(now = Date.now(), leaseMs = 300_000): GithubJob | null {
      return database.transaction(() => {
        const row = database.query<{ id: number }, [number, number]>(`SELECT id FROM github_jobs
          WHERE (status='pending' AND available_at<=?) OR (status='processing' AND lease_until<=?)
          ORDER BY id LIMIT 1`).get(now, now)
        if (!row) return null
        const token = randomUUID()
        return database.query<GithubJob, [number, string, number]>(`UPDATE github_jobs
          SET status='processing',attempts=attempts+1,lease_until=?,lease_token=?
          WHERE id=? RETURNING *`).get(now + leaseMs, token, row.id)
      }).immediate()
    },
    complete(job: GithubJob, now = Date.now()) {
      database.query(`UPDATE github_jobs SET status='done',completed_at=?,lease_until=NULL,last_error=NULL
        WHERE id=? AND lease_token=?`).run(now, job.id, job.lease_token)
    },
    fail(job: GithubJob, now = Date.now()) {
      // Never persist a provider response, URL, token or private body in an error message.
      database.query(`UPDATE github_jobs SET status='pending',available_at=?,lease_until=NULL,
        last_error='Falha na integração GitHub; retentativa agendada.' WHERE id=? AND lease_token=?`)
        .run(now + Math.min(3_600_000, 1000 * 2 ** Math.min(job.attempts, 12)), job.id, job.lease_token)
    },
  }
}
