import { useState, useTransition } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'
import { FormMessage } from '@/components/form-message'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useDebugActions } from '@/debug/use-debug-actions'
import { db, newId, updateUser, useDb, type FeedPost, type ObjectiveProgress, type ReactionType } from '@/mocks/db'
import { errorMessage } from '@/mocks/mock-action'
import { useAccount } from '@/modules/panel-app/hooks/use-account'
import { canSavePost, FEED_PAGE_SIZE, loadMorePosts } from '../actions'
import { HomeAside } from '../components/home-aside'
import { PostCard, type Notice } from '../components/post-card'
import { ProfileCard } from '../components/profile-card'
import { verifyEmail } from '../reminders/actions'
import './index.css'

type View = 'community' | 'mine' | 'saved'

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
    learningId: null,
    sharedOnFeed: true,
    shownOnProfile: false,
    collectionIds: [],
    reactions: [],
    showReactionCounts: false,
    createdAt: new Date(now - (i + 1) * 3_600_000).toISOString(),
    deletedAt: null,
    editedAt: null,
    revisions: [],
  }))
}

/**
 * Home of the Hub: the learning diary of the community in the middle, newest
 * first and ten at a time, never ordered by reactions. "Minhas publicações"
 * lists everything the member recorded, shared or not; "Salvos" what they saved
 * from others, newest save first. The member's profile
 * preview sits on the left and the blocks of their moment on the right.
 */
export default function FeedIndex() {
  const account = useAccount()
  const navigate = useNavigate()
  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const posts = useDb((state) => state.feedPosts)
  const users = useDb((state) => state.users)
  const bookmarks = useDb((state) => state.feedBookmarks)
  const [notice, setNotice] = useState<Notice | null>((location.state as { notice?: Notice } | null)?.notice ?? null)
  const [loading, startLoading] = useTransition()
  const [loadError, setLoadError] = useState<string | null>(null)

  const requested = params.get('view')
  const view: View = requested === 'mine' || requested === 'saved' ? requested : 'community'
  const limit = Math.max(FEED_PAGE_SIZE, Number(params.get('limit')) || FEED_PAGE_SIZE)

  useDebugActions('Início (Feed)', [
    {
      label: 'Gerar 25 publicações da comunidade',
      run: () => {
        const others = db
          .get()
          .users.filter((u) => u.id !== account?.id && u.onboardedAt)
          .map((u) => u.id)
        db.set((state) => ({
          ...state,
          feedPosts: [...state.feedPosts, ...makeCommunityPosts(25, others)],
        }))
      },
    },
    {
      label: 'Publicação de outro membro chega agora',
      run: () => {
        const other = db.get().users.find((u) => u.id !== account?.id && u.onboardedAt)
        if (!other) return
        const [post] = makeCommunityPosts(1, [other.id])
        db.set((state) => ({
          ...state,
          feedPosts: [...state.feedPosts, { ...post, createdAt: new Date().toISOString() }],
        }))
      },
    },
    {
      label: 'Outros membros reagem à minha última publicação',
      description: 'Três membros marcam “Isso me ajudou” e um marca “Aprendendo também”.',
      run: () => {
        const state = db.get()
        const mine = state.feedPosts
          .filter((p) => p.userId === account?.id && p.sharedOnFeed && !p.deletedAt)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
        if (!mine) return
        const others = state.users.filter((u) => u.id !== account?.id && u.onboardedAt).slice(0, 3)
        const at = new Date().toISOString()
        const added = others.flatMap((u, i) => {
          const types: ReactionType[] = i === 0 ? ['helped', 'learning-too'] : ['helped']
          return types
            .filter((type) => !mine.reactions.some((r) => r.userId === u.id && r.type === type))
            .map((type) => ({ userId: u.id, type, createdAt: at }))
        })
        db.set((s) => ({
          ...s,
          feedPosts: s.feedPosts.map((p) => (p.id === mine.id ? { ...p, reactions: [...p.reactions, ...added] } : p)),
        }))
      },
    },
    {
      label: 'Criar 12 trilhas',
      run: () => {
        if (!account) return
        const at = new Date().toISOString()
        const made = Array.from({ length: 12 }, (_, i) => ({
          id: newId(),
          userId: account.id,
          name: `Trilha gerada ${i + 1} com um nome bem comprido`,
          createdAt: at,
        }))
        db.set((s) => ({
          ...s,
          feedCollections: [...s.feedCollections, ...made],
        }))
      },
    },
    {
      label: 'Salvar 15 publicações da comunidade',
      run: () => {
        if (!account) return
        const state = db.get()
        const at = Date.now()
        const saved = state.feedPosts
          .filter(
            (p) =>
              p.userId !== account.id &&
              p.sharedOnFeed &&
              !p.deletedAt &&
              !state.feedBookmarks.some((b) => b.userId === account.id && b.postId === p.id),
          )
          .slice(0, 15)
          .map((p, i) => ({ userId: account.id, postId: p.id, createdAt: new Date(at - i * 60_000).toISOString() }))
        db.set((s) => ({ ...s, feedBookmarks: [...s.feedBookmarks, ...saved] }))
      },
    },
    {
      label: 'Outro membro apaga uma publicação que salvei',
      description: 'Ela some dos Salvos, como some do Feed.',
      run: () => {
        const state = db.get()
        const bookmark = state.feedBookmarks.find((b) => b.userId === account?.id)
        if (!bookmark) return
        const deletedAt = new Date().toISOString()
        db.set((s) => ({
          ...s,
          feedPosts: s.feedPosts.map((p) => (p.id === bookmark.postId ? { ...p, deletedAt } : p)),
        }))
      },
    },
    {
      label: 'Zerar dispensas dos próximos passos',
      run: () =>
        account &&
        updateUser(account.id, (u) => ({
          ...u,
          profileReminder: { dismissals: 0, hiddenUntil: null },
        })),
    },
    {
      label: 'Abrir o link de confirmação do e-mail',
      run: () => account && verifyEmail(account.id),
    },
    {
      label: 'Desconfirmar e-mail',
      run: () => account && updateUser(account.id, (u) => ({ ...u, emailVerifiedAt: null })),
    },
    {
      label: 'Esvaziar o Feed',
      run: () => db.set((state) => ({ ...state, feedPosts: [] })),
    },
    { label: 'Ver minhas publicações', run: () => setParams({ view: 'mine' }) },
    { label: 'Ver salvos', run: () => setParams({ view: 'saved' }) },
    { label: 'Nova publicação', run: () => navigate('/app/feed/new') },
    {
      label: 'Expirar sessão',
      description: 'A home exige login: volta ao Login e retorna para cá.',
      run: () => db.set((state) => ({ ...state, session: null })),
    },
  ])

  if (!account) return null

  const savedAt = new Map(bookmarks.filter((b) => b.userId === account.id).map((b) => [b.postId, b.createdAt]))
  const visible =
    view === 'saved'
      ? posts
          .filter((p) => savedAt.has(p.id) && canSavePost(p, account.id))
          .sort((a, b) => savedAt.get(b.id)!.localeCompare(savedAt.get(a.id)!))
      : posts
          .filter((p) => p.deletedAt === null && (view === 'mine' ? p.userId === account.id : p.sharedOnFeed))
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const page = visible.slice(0, limit)
  const hasMore = visible.length > page.length

  function changeView(next: string) {
    if (!next) return
    setNotice(null)
    setLoadError(null)
    setParams(next === 'community' ? {} : { view: next })
  }

  function loadMore() {
    setLoadError(null)
    startLoading(async () => {
      try {
        const next = limit + FEED_PAGE_SIZE
        await loadMorePosts(view, next)
        setLoadError(null)
        setParams(
          (current) => {
            current.set('limit', String(next))
            return current
          },
          { preventScrollReset: true },
        )
      } catch (e) {
        setLoadError(`${errorMessage(e)} Tente de novo.`)
      }
    })
  }

  return (
    <div className="feed-home">
      <div className="feed-home__grid">
        <aside className="feed-home__profile" aria-label="Seu perfil">
          <ProfileCard account={account} />
        </aside>
        <div className="feed">
          <PageHeader
            title={`Olá, ${account.name.split(' ')[0]}!`}
            description="O diário de aprendizado da comunidade."
            actions={
              <Button asChild>
                <Link to="/app/feed/new">Nova publicação</Link>
              </Button>
            }
          />
          <div className="feed__toolbar">
            <ToggleGroup type="single" value={view} onValueChange={changeView} aria-label="Quais publicações ver">
              <ToggleGroupItem value="community">Comunidade</ToggleGroupItem>
              <ToggleGroupItem value="mine">Minhas publicações</ToggleGroupItem>
              <ToggleGroupItem value="saved">Salvos</ToggleGroupItem>
            </ToggleGroup>
          </div>
          <FormMessage tone={notice?.tone ?? 'success'}>{notice?.text}</FormMessage>

          {page.length === 0 ? (
            view === 'saved' ? (
              <Card className="feed__empty">
                <p>Você ainda não salvou nada. Salve uma publicação da comunidade para ler de novo depois.</p>
                <Button asChild variant="secondary">
                  <Link to="/app">Ver a comunidade</Link>
                </Button>
              </Card>
            ) : (
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
            )
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
        <aside className="feed-home__aside" aria-label="Para você">
          <HomeAside account={account} />
        </aside>
      </div>
    </div>
  )
}
