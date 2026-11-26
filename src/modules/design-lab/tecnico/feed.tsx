import { useState } from 'react'
import { Bookmark, ExternalLink, Eye, GitBranch, Megaphone, MessageCircle, MessagesSquare, Pin } from 'lucide-react'
import { Dialog } from 'radix-ui'
import { Link } from 'react-router'
import { useDebugActions } from '@/debug/use-debug-actions'
import { useNow } from '@/hooks/use-now'
import { formatFullDate, formatRelative, formatShortDate, OBJECTIVE_PROGRESS, REACTIONS } from '@/lib/feed-post'
import { labelOf } from '@/lib/member-profile'
import { useDb, type FeedAnnouncement, type FeedPost, type MockDb, type User } from '@/mocks/db'
import { AppShell, PersonMark } from './app-shell'
import { EventsStrip } from './events'
import { Reactions } from './hub'
import { Button, Chip } from './parts'
import { malhaStore, useLabParams } from './theme'

const PAGE_SIZE = 10

/**
 * The /app Feed recomposed in "Técnico × Traçado": the same publications, announcements and order,
 * read from the database. Nothing here writes: reacting, saving and paging stay on this screen.
 * One column of 680px; the journey and the achievements live in the profile. Saved posts open from
 * the bookmark in the header.
 */
export default function MalhaFeed() {
  const state = useDb((s) => s)
  const now = useNow()
  const [params, setParams] = useLabParams()
  const [composing, setComposing] = useState(false)
  const [empty, setEmpty] = useState(false)
  const limit = Math.max(PAGE_SIZE, Number(params.get('limit')) || PAGE_SIZE)

  useDebugActions('Feed (Técnico × Traçado)', [
    { label: 'Tema claro', run: () => malhaStore.set(() => ({ theme: 'light' })) },
    { label: 'Tema escuro', run: () => malhaStore.set(() => ({ theme: 'dark' })) },
    { label: empty ? 'Mostrar as publicações' : 'Ver o Feed vazio', run: () => setEmpty((e) => !e) },
    { label: 'Nova publicação', run: () => setComposing(true) },
  ])

  // Same order as the Feed: pinned announcements first, newest pin first; the rest by date.
  const pinned = state.feedAnnouncements
    .filter((a) => a.pinnedAt !== null)
    .toSorted((a, b) => b.pinnedAt!.localeCompare(a.pinnedAt!))
    .map((a) => ({ kind: 'announcement' as const, id: a.id, announcement: a }))
  const timeline = [
    ...state.feedAnnouncements
      .filter((a) => a.pinnedAt === null)
      .map((a) => ({ kind: 'announcement' as const, id: a.id, at: a.createdAt, announcement: a })),
    ...state.feedPosts
      .filter((p) => p.deletedAt === null && p.sharedOnFeed)
      .map((p) => ({ kind: 'post' as const, id: p.id, at: p.createdAt, post: p })),
  ].toSorted((a, b) => b.at.localeCompare(a.at))
  const visible = empty ? [] : [...pinned, ...timeline]
  const page = visible.slice(0, limit)

  return (
    <AppShell screen="feed" path="/design-lab/feed">
      {(account, root) => {
        return (
          <>
            <main className="txf-main" data-single>
              <header className="txf-head">
                <div>
                  <h1>Feed</h1>
                  <p>Aprendizados e projetos da comunidade.</p>
                </div>
                <div className="txf-head__actions">
                  <Link viewTransition to="/design-lab/salvos" className="txf-tool" aria-label="Salvos" title="Salvos">
                    <Bookmark strokeWidth={1.75} aria-hidden />
                  </Link>
                  <Button variant="primary" onClick={() => setComposing(true)}>
                    Nova publicação
                  </Button>
                </div>
              </header>

              <EventsStrip now={now} />

              <div className="txf-body">
                <div className="txf-column">
                  {page.length === 0 ? (
                    <div className="txf-empty">
                      <p className="tx-empty__title">Ainda não há publicações</p>
                      <p className="tx-meta">Registre o que você aprendeu. Ela aparece aqui para a comunidade.</p>
                      <Button onClick={() => setComposing(true)}>Nova publicação</Button>
                    </div>
                  ) : (
                    <ol className="txf-list">
                      {page.map((item) => (
                        <li key={item.id}>
                          {item.kind === 'announcement' ? (
                            <Announcement announcement={item.announcement} now={now} />
                          ) : (
                            <Post post={item.post} state={state} viewer={account} now={now} />
                          )}
                        </li>
                      ))}
                    </ol>
                  )}

                  {visible.length > page.length ? (
                    <div className="txf-more">
                      <Button
                        onClick={() =>
                          setParams(
                            (current) => {
                              current.set('limit', String(limit + PAGE_SIZE))
                              return current
                            },
                            { preventScrollReset: true },
                          )
                        }
                      >
                        Carregar mais
                      </Button>
                    </div>
                  ) : (
                    page.length > 0 && <p className="txf-end">Você chegou ao fim.</p>
                  )}
                </div>

              </div>
            </main>

            <Dialog.Root open={composing} onOpenChange={setComposing}>
              <Dialog.Portal container={root}>
                <Dialog.Overlay className="tx-scrim" />
                <Dialog.Content className="tx-dialog">
                  <header className="tx-dialog__head">
                    <Dialog.Title className="tx-dialog__title">Nova publicação</Dialog.Title>
                    <Dialog.Description className="tx-dialog__desc">O que você quer compartilhar?</Dialog.Description>
                  </header>
                  <div className="tx-dialog__body txf-compose">
                    <Button asChild>
                      <Link viewTransition to="/app?compose=progress">Registrar um aprendizado</Link>
                    </Button>
                    <Button asChild>
                      <Link viewTransition to="/app?compose=project">Compartilhar um projeto</Link>
                    </Button>
                  </div>
                  <footer className="tx-dialog__foot">
                    <span className="tx-meta">Os formulários abrem no /app.</span>
                    <Dialog.Close asChild>
                      <Button>Cancelar</Button>
                    </Dialog.Close>
                  </footer>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
          </>
        )
      }}
    </AppShell>
  )
}

function When({ iso, edited, now }: { iso: string; edited?: string | null; now: number }) {
  return (
    <span className="tx-meta txf-when">
      <time dateTime={iso} title={formatFullDate(iso)}>
        {formatRelative(iso, now)}
      </time>
      {edited && <span title={`Corrigido em ${formatShortDate(edited, now)}.`}>, editado</span>}
    </span>
  )
}

function Announcement({ announcement, now }: { announcement: FeedAnnouncement; now: number }) {
  return (
    <article className="tx-pub txf-announcement">
      <header className="tx-pub__who">
        <span className="tx-pub__avatar txf-official" aria-hidden>
          HD
        </span>
        <p>
          <span className="txf-name-row">
            <b>He4rt Developers</b>
            <Chip tone="tag">Oficial</Chip>
          </span>
          <span className="tx-meta txf-when">
            {announcement.pinnedAt && (
              <>
                <Pin strokeWidth={1.75} aria-hidden /> Fixado,&nbsp;
              </>
            )}
            <time dateTime={announcement.createdAt} title={formatFullDate(announcement.createdAt)}>
              {formatRelative(announcement.createdAt, now)}
            </time>
          </span>
        </p>
      </header>
      <div className="tx-pub__body">
        <div className="tx-pub__trail">
          <h3 className="txf-announcement__title">
            <Megaphone strokeWidth={1.75} aria-hidden />
            {announcement.title}
          </h3>
          <p className="txf-announcement__text">{announcement.body}</p>
        </div>
      </div>
    </article>
  )
}

/** A publication from the database, in the shape of the two cards Daniel drew: project or learning. */
export function Post({ post, state, viewer, now }: { post: FeedPost; state: MockDb; viewer: User; now: number }) {
  const author = state.users.find((u) => u.id === post.userId)
  const project = state.memberProjects.find((p) => p.id === post.projectId)
  const help = state.discussions.find((d) => d.context?.type === 'post' && d.context.id === post.id)
  const comments = state.feedComments.filter((c) => c.postId === post.id && c.deletedAt === null).length
  const own = post.userId === viewer.id
  const [mine, setMine] = useState(() => post.reactions.filter((r) => r.userId === viewer.id).map((r) => r.type as string))
  const [saved, setSaved] = useState(() => state.feedBookmarks.some((b) => b.userId === viewer.id && b.postId === post.id))
  const others: Record<string, number> = {}
  for (const r of post.reactions) if (r.userId !== viewer.id) others[r.type] = (others[r.type] ?? 0) + 1
  const name = author?.name ?? 'Membro'
  const profile = author ? `/members/${author.username}` : null

  return (
    <article className="tx-pub">
      <header className="tx-pub__who">
        {profile ? (
          <Link viewTransition to={profile} tabIndex={-1} aria-hidden>
            <PersonMark user={author} />
          </Link>
        ) : (
          <PersonMark user={author} />
        )}
        <p>
          <span>
            {profile ? (
              <Link viewTransition to={profile} className="txf-author">
                {name}
              </Link>
            ) : (
              <b>{name}</b>
            )}{' '}
            {project ? 'publicou um projeto' : 'registrou um aprendizado'}
          </span>
          <span className="txf-when-row">
            <When iso={post.createdAt} edited={post.editedAt} now={now} />
            <Eye strokeWidth={1.75} aria-label="Visível para a comunidade" />
          </span>
        </p>
      </header>

      <div className="tx-pub__body">
        {project ? (
          <>
            <div className="tx-pub__trail">
              <p className="tx-pub__text">{project.pitch}</p>
              {help && (
                <p className="tx-pub__ref">
                  <MessagesSquare strokeWidth={1.75} aria-hidden />
                  Pediu ajuda no Fórum: <Link viewTransition to={`/app/discussions/${help.id}`}>{help.title}</Link>
                </p>
              )}
            </div>
            <a className="tx-pub__repo" href={project.repository.url} target="_blank" rel="noreferrer">
              <span className="tx-pub__repo-name">
                <GitBranch strokeWidth={1.75} aria-hidden />
                <span className="txf-ellipsis" title={project.repository.fullName}>
                  {project.repository.fullName}
                </span>
                <ExternalLink strokeWidth={1.75} aria-label="Abre no GitHub" />
              </span>
              {project.read.description && <span>{project.read.description}</span>}
              <span className="tx-meta">
                {project.read.language ? `${project.read.language}, a` : 'A'}tualizado{' '}
                {formatRelative(project.read.pushedAt, now).replace(/\.$/, '')}.
              </span>
            </a>
          </>
        ) : (
          <>
            <div className="tx-pub__trail">
              <div>
                <span className="tx-pub__label">O que aprendi</span>
                <p className="tx-pub__text">{post.learned}</p>
              </div>
              <div>
                <span className="tx-pub__label">Como apliquei</span>
                <p className="tx-pub__text">{post.applied}</p>
              </div>
            </div>
            <p className="tx-pub__goal">
              <b>{labelOf(OBJECTIVE_PROGRESS, post.objectiveProgress)}</b> do objetivo
            </p>
          </>
        )}
      </div>

      <footer className="tx-pub__actions">
        {own ? (
          // The author does not react to their own publication; they see what others gave.
          <span className="tx-meta txf-summary">
            {post.reactions.length === 0
              ? 'Ainda sem reações'
              : REACTIONS.filter((r) => others[r.value])
                  .map((r) => `${r.label} (${others[r.value]})`)
                  .join(', ')}
          </span>
        ) : (
          <Reactions value={mine} onChange={setMine} others={others} counts={post.showReactionCounts} />
        )}
        <Button variant="tertiary">
          <MessageCircle strokeWidth={1.75} aria-hidden />
          Comentar{comments > 0 ? ` (${comments})` : ''}
        </Button>
        {!own && (
          <Button variant="tertiary" pressed={saved} aria-pressed={saved} onClick={() => setSaved((s) => !s)}>
            <Bookmark strokeWidth={1.75} fill={saved ? 'currentColor' : 'none'} aria-hidden />
            {saved ? 'Salva' : 'Salvar'}
          </Button>
        )}
      </footer>
    </article>
  )
}
