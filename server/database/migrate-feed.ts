import type { Database } from 'bun:sqlite'
import { readFileSync } from 'node:fs'

/** Upgrade existing Feed data without resetting it or publishing private conversations. */
export function migrateFeed(database: Database) {
  if (database.query('PRAGMA table_info(member_projects)').all().length === 0) {
    database.transaction(() => {
      const schema = readFileSync(new URL('./schema.sql', import.meta.url), 'utf8')
        .replaceAll('CREATE TABLE ', 'CREATE TABLE IF NOT EXISTS ')
        .replaceAll('CREATE INDEX ', 'CREATE INDEX IF NOT EXISTS ')
        .replaceAll('CREATE UNIQUE INDEX ', 'CREATE UNIQUE INDEX IF NOT EXISTS ')
      database.run(schema)
      database.run('ALTER TABLE feed_posts ADD COLUMN project_id TEXT REFERENCES member_projects (id)')
    })()
  }

  database.query('UPDATE feed_announcements SET body = ? WHERE body = ?').run(
    'Compartilhe aprendizados e divulgue seus projetos. Para tirar dúvidas ou pedir uma opinião sobre o código, abra uma discussão no Fórum e vincule seu projeto.',
    'Compartilhe aprendizados e projetos. Quer uma revisão ou uma ideia para o seu projeto? Publique um pedido de ajuda. Dúvidas gerais continuam no Fórum.',
  )
  const columns = database.query<{ name: string }, []>('PRAGMA table_info(member_projects)').all()
  if (!columns.some((column) => column.name === 'intent')) return

  database.transaction(() => {
    const movedAt = new Date().toISOString()
    const projects = database.query<{
      id: string; post_id: string; user_id: string; read_name: string; help_request: string | null;
      pitch: string; created_at: string;
    }, []>(`SELECT p.*, f.id AS post_id, f.created_at
      FROM member_projects p JOIN feed_posts f ON f.project_id = p.id WHERE p.intent = 'help'`).all()

    for (const project of projects) {
      const discussionId = `project-help-${project.post_id}`
      database.query(`INSERT INTO discussions
        (id, title, category, author_id, body, created_at, context_type, context_id, solved_reply_id)
        VALUES (?, ?, 'question', ?, ?, ?, 'post', ?, NULL)`)
        .run(discussionId, `Dúvida sobre ${project.read_name}`.slice(0, 120), project.user_id,
          project.help_request || project.pitch, project.created_at, project.post_id)
      database.query(`INSERT INTO discussion_replies (id, discussion_id, author_id, body, created_at)
        SELECT 'project-comment-' || id, ?, user_id, body, created_at FROM feed_comments
        WHERE post_id = ? AND deleted_at IS NULL ORDER BY created_at, rowid`)
        .run(discussionId, project.post_id)
      // Original comments remain available for audit, but no longer duplicate the forum conversation.
      database.query('UPDATE feed_comments SET deleted_at = ? WHERE post_id = ? AND deleted_at IS NULL')
        .run(movedAt, project.post_id)
    }

    database.query(`INSERT INTO member_project_revisions (project_id, intent, pitch, help_request, replaced_at)
      SELECT id, intent, pitch, help_request, ? FROM member_projects WHERE intent = 'help'`).run(movedAt)
    database.run('ALTER TABLE member_projects DROP COLUMN intent')
    database.run('ALTER TABLE member_projects DROP COLUMN help_request')
    if (database.query<{ name: string }, []>('PRAGMA table_info(feed_comments)').all().some((c) => c.name === 'is_answer')) {
      database.run('ALTER TABLE feed_comments DROP COLUMN is_answer')
    }
  })()
}
