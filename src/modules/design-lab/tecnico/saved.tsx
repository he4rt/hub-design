import { useState } from 'react'
import { Bookmark } from 'lucide-react'
import { Link } from 'react-router'
import { useDebugActions } from '@/debug/use-debug-actions'
import { useNow } from '@/hooks/use-now'
import { useDb } from '@/mocks/db'
import { AppShell } from './app-shell'
import { Post } from './feed'
import { Button, More } from './parts'
import { malhaStore, useLabParams } from './theme'
import './profile.css'

const PAGE = 8

/**
 * Saved publications, the lab's `/app/saved`: opened from the bookmark in the Feed header, only the
 * owner sees it. The Feed's save rule: not deleted, shared on the Feed, by someone else. Newest save first.
 */
export default function Saved() {
  const state = useDb((s) => s)
  const now = useNow()
  const [params, setParams] = useLabParams()
  const [empty, setEmpty] = useState(false)
  const limit = Math.max(PAGE, Number(params.get('limite')) || PAGE)

  useDebugActions('Salvos (Técnico × Traçado)', [
    { label: 'Tema claro', run: () => malhaStore.set(() => ({ theme: 'light' })) },
    { label: 'Tema escuro', run: () => malhaStore.set(() => ({ theme: 'dark' })) },
    { label: empty ? 'Mostrar os salvos' : 'Ver os salvos vazios', run: () => setEmpty((e) => !e) },
  ])

  return (
    <AppShell screen="feed" path="/design-lab/salvos">
      {(account) => {
        const saved = empty
          ? []
          : state.feedBookmarks
              .filter((b) => b.userId === account.id)
              .toSorted((a, b) => b.createdAt.localeCompare(a.createdAt))
              .flatMap((b) =>
                state.feedPosts.filter((p) => p.id === b.postId && p.deletedAt === null && p.sharedOnFeed && p.userId !== account.id),
              )
        return (
          <main className="txf-main" data-single>
            <header className="txf-head">
              <div>
                {/* Salvos is a view of the Feed: the path back is always on screen. */}
                <nav className="txf-crumbs" aria-label="Caminho">
                  <Link viewTransition to="/design-lab/feed">Feed</Link>
                  <span aria-hidden>/</span>
                  <span aria-current="page">Salvos</span>
                </nav>
                <h1>Salvos</h1>
                <p>Publicações que você guardou para ler depois. A lista é privada.</p>
              </div>
              <div className="txf-head__actions">
                {/* The same bookmark as in the Feed header, now on: pressing it again goes back. */}
                <Link viewTransition to="/design-lab/feed" className="txf-tool" data-on aria-label="Voltar ao Feed" title="Voltar ao Feed">
                  <Bookmark strokeWidth={1.75} fill="currentColor" aria-hidden />
                </Link>
              </div>
            </header>
            <div className="txf-body">
              <div className="txf-column">
                {saved.length === 0 ? (
                  <div className="txf-empty">
                    <p className="tx-empty__title">Nada salvo ainda</p>
                    <p className="tx-meta">Salve no Feed as publicações que quer reler.</p>
                    <Button asChild>
                      <Link viewTransition to="/design-lab/feed">Ir para o Feed</Link>
                    </Button>
                  </div>
                ) : (
                  <ol className="txf-list">
                    {saved.slice(0, limit).map((post) => (
                      <li key={post.id}>
                        <Post post={post} state={state} viewer={account} now={now} />
                      </li>
                    ))}
                  </ol>
                )}
                <More
                  total={saved.length}
                  limit={limit}
                  onMore={() => setParams({ limite: String(limit + PAGE) }, { preventScrollReset: true })}
                />
              </div>
            </div>
          </main>
        )
      }}
    </AppShell>
  )
}
