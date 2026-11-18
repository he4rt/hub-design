import { useState, useTransition } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'
import { FormMessage } from '@/components/form-message'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useDebugActions } from '@/debug/use-debug-actions'
import { db, newId, useDb, type FeedPost, type ObjectiveProgress } from '@/mocks/db'
import { errorMessage } from '@/mocks/mock-action'
import { useAccount } from '@/modules/panel-app/hooks/use-account'
import { FEED_PAGE_SIZE, loadMorePosts } from '../actions'
import { PostCard, type Notice } from '../components/post-card'
import './index.css'

type View = 'community' | 'mine'

const PROGRESS_CYCLE: ObjectiveProgress[] = ['none', 'little', 'a-lot', 'very-much']

/** Fake publications from other members, spread over the last days. */
function makeCommunityPosts(count: number, authorIds: string[]): FeedPost[] {
  const now = Date.now()
  return Array.from({ length: count }, (_, i) => ({
    id: newId(),
    userId: authorIds[i % authorIds.length],
    learned: `Publicação gerada ${i + 1}: aprendi a separar regra de negócio da camada HTTP.`,
    applied: 'Movi a validação do controller para uma classe própria e escrevi um teste para ela.',
    objectiveProgress: PROGRESS_CYCLE[i % PROGRESS_CYCLE.length],
    sharedOnFeed: true,
    shownOnProfile: false,
    createdAt: new Date(now - (i + 1) * 3_600_000).toISOString(),
    deletedAt: null,
  }))
}

/**
 * Learning diary of the community: what members chose to share, newest first,
 * ten at a time. "Minhas publicações" lists everything the member recorded,
 * shared or not. No reactions, counts or popularity order.
 */
export default function FeedIndex() {
  const account = useAccount()
  const navigate = useNavigate()
  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const posts = useDb((state) => state.feedPosts)
  const users = useDb((state) => state.users)
  const [notice, setNotice] = useState<Notice | null>((location.state as { notice?: Notice } | null)?.notice ?? null)
  const [loading, startLoading] = useTransition()
  const [loadError, setLoadError] = useState<string | null>(null)

  const view: View = params.get('view') === 'mine' ? 'mine' : 'community'
  const limit = Math.max(FEED_PAGE_SIZE, Number(params.get('limit')) || FEED_PAGE_SIZE)

  useDebugActions('Feed', [
    {
      label: 'Gerar 25 publicações da comunidade',
      run: () => {
        const others = db.get().users.filter((u) => u.id !== account?.id && u.onboardedAt).map((u) => u.id)
        db.set((state) => ({ ...state, feedPosts: [...state.feedPosts, ...makeCommunityPosts(25, others)] }))
      },
    },
    {
      label: 'Publicação de outro membro chega agora',
      run: () => {
        const other = db.get().users.find((u) => u.id !== account?.id && u.onboardedAt)
        if (!other) return
        const [post] = makeCommunityPosts(1, [other.id])
        db.set((state) => ({ ...state, feedPosts: [...state.feedPosts, { ...post, createdAt: new Date().toISOString() }] }))
      },
    },
    { label: 'Esvaziar o Feed', run: () => db.set((state) => ({ ...state, feedPosts: [] })) },
    { label: 'Ver minhas publicações', run: () => setParams({ view: 'mine' }) },
    { label: 'Nova publicação', run: () => navigate('/app/feed/new') },
    {
      label: 'Expirar sessão',
      description: 'O Feed exige login: volta ao Login e retorna para cá.',
      run: () => db.set((state) => ({ ...state, session: null })),
    },
  ])

  if (!account) return null

  const visible = posts
    .filter((p) => p.deletedAt === null && (view === 'mine' ? p.userId === account.id : p.sharedOnFeed))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const page = visible.slice(0, limit)
  const hasMore = visible.length > page.length

  function changeView(next: string) {
    if (!next) return
    setNotice(null)
    setLoadError(null)
    setParams(next === 'mine' ? { view: 'mine' } : {})
  }

  function loadMore() {
    setLoadError(null)
    startLoading(async () => {
      try {
        const next = limit + FEED_PAGE_SIZE
        await loadMorePosts(view, next)
        setLoadError(null)
        setParams((current) => {
          current.set('limit', String(next))
          return current
        }, { preventScrollReset: true })
      } catch (e) {
        setLoadError(`${errorMessage(e)} Tente de novo.`)
      }
    })
  }

  return (
    <>
      <PageHeader
        title="Feed"
        description="O diário de aprendizado da comunidade."
        actions={
          <Button asChild>
            <Link to="/app/feed/new">Nova publicação</Link>
          </Button>
        }
      />
      <div className="feed">
        <div className="feed__toolbar">
          <ToggleGroup type="single" value={view} onValueChange={changeView} aria-label="Quais publicações ver">
            <ToggleGroupItem value="community">Comunidade</ToggleGroupItem>
            <ToggleGroupItem value="mine">Minhas publicações</ToggleGroupItem>
          </ToggleGroup>
        </div>
        <FormMessage tone={notice?.tone ?? 'success'}>{notice?.text}</FormMessage>

        {page.length === 0 ? (
          <Card className="feed__empty">
            <p>
              {view === 'mine'
                ? 'Você ainda não registrou nada. Registre o que você aprendeu.'
                : 'Ainda não há publicações. Registre o que você aprendeu.'}
            </p>
            <Button asChild variant="secondary">
              <Link to="/app/feed/new">Nova publicação</Link>
            </Button>
          </Card>
        ) : (
          <ol className="feed__list">
            {page.map((post) => (
              <li key={post.id}>
                <PostCard
                  post={post}
                  author={users.find((u) => u.id === post.userId)}
                  viewerId={account.id}
                  showVisibility={view === 'mine'}
                  onNotice={setNotice}
                />
              </li>
            ))}
          </ol>
        )}

        {hasMore ? (
          <div className="feed__more">
            <Button variant="secondary" loading={loading} onClick={loadMore}>
              Carregar mais
            </Button>
            <FormMessage tone="error">{loadError}</FormMessage>
          </div>
        ) : (
          page.length > 0 && <p className="feed__end">Você chegou ao fim.</p>
        )}
      </div>
    </>
  )
}
