import { useState, useTransition } from 'react'
import { Bookmark } from 'lucide-react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'
import { FormMessage } from '@/components/form-message'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useDebugActions } from '@/debug/use-debug-actions'
import { db, newId, useDb, type FeedPost, type ObjectiveProgress, type ReactionType } from '@/mocks/db'
import { errorMessage } from '@/mocks/mock-action'
import { useAccount } from '@/modules/panel-app/hooks/use-account'
import { createComment, createPost, FEED_PAGE_SIZE, loadMorePosts } from '../actions'
import { AnnouncementCard } from '../components/announcement-card'
import { PostForm } from '../components/post-form'
import { RemovedNotice } from '../components/removed-notice'
import { PostCard, type Notice } from '../components/post-card'
import { ProjectForm } from '../components/project-form'
import './index.css'

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
    projectId: null,
    sharedOnFeed: true,
    shownOnProfile: false,
    collectionIds: [],
    reactions: [],
    showReactionCounts: false,
    createdAt: new Date(now - (i + 1) * 3_600_000).toISOString(),
    deletedAt: null,
    removal: null,
    editedAt: null,
    revisions: [],
  }))
}

/**
 * Home of the Hub: the learning diary of the community in one column, newest
 * first and ten at a time, never ordered by reactions, the member's own shared
 * ones included, with the community's pinned announcements on top. "Nova
 * publicação" opens over it (`?compose=1`). Their own history lives in their
 * profile and what they saved in Salvos (/app/saved); how complete it is sits in the side navigation.
 */
export default function FeedIndex() {
  const account = useAccount()
  const navigate = useNavigate()
  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const posts = useDb((state) => state.feedPosts)
  const users = useDb((state) => state.users)
  const announcements = useDb((state) => state.feedAnnouncements)
  // A notice set here belongs to the navigation it happened in; a new navigation shows its own.
  const [localNotice, setLocalNotice] = useState<{ key: string; notice: Notice | null } | null>(null)
  const routeNotice = (location.state as { notice?: Notice } | null)?.notice ?? null
  const notice = localNotice?.key === location.key ? localNotice.notice : routeNotice
  const setNotice = (next: Notice | null) => setLocalNotice({ key: location.key, notice: next })
  const [loading, startLoading] = useTransition()
  const [loadError, setLoadError] = useState<string | null>(null)

  const composing = params.get('compose')
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
          feedPosts: s.feedPosts.map((p) =>
            p.id === mine.id ? { ...p, reactions: [...p.reactions, ...added] } : p,
          ),
        }))
      },
    },
    {
      label: 'Outros membros comentam na primeira publicação',
      description: 'Três comentários chegam agora; abra Comentar para ver.',
      run: () => {
        const state = db.get()
        const target = state.feedPosts
          .filter((p) => p.sharedOnFeed && !p.deletedAt)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
        if (!target) return
        const others = state.users.filter((u) => u.id !== account?.id && u.onboardedAt).slice(0, 3)
        const texts = [
          'Boa! Vou testar isso hoje.',
          'Eu passei pelo mesmo problema semana passada.',
          'Tem algum link que te ajudou?',
        ]
        const now = Date.now()
        const made = others.map((u, i) => ({
          id: newId(),
          postId: target.id,
          userId: u.id,
          body: texts[i],
          createdAt: new Date(now - (others.length - i) * 60_000).toISOString(),
          deletedAt: null,
          removal: null,
        }))
        db.set((s) => ({ ...s, feedComments: [...s.feedComments, ...made] }))
      },
    },
    {
      label: 'Gerar 25 comentários na primeira publicação',
      run: () => {
        const state = db.get()
        const target = state.feedPosts
          .filter((p) => p.sharedOnFeed && !p.deletedAt)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
        const others = state.users.filter((u) => u.id !== account?.id && u.onboardedAt)
        if (!target || others.length === 0) return
        const now = Date.now()
        const made = Array.from({ length: 25 }, (_, i) => ({
          id: newId(),
          postId: target.id,
          userId: others[i % others.length].id,
          body: `Comentário gerado ${i + 1}: anotei para estudar também, obrigado por compartilhar o que funcionou.`,
          createdAt: new Date(now - (25 - i) * 60_000).toISOString(),
          deletedAt: null,
          removal: null,
        }))
        db.set((s) => ({ ...s, feedComments: [...s.feedComments, ...made] }))
      },
    },
    {
      label: 'Comentar com texto ofensivo (erro esperado)',
      description: 'A moderação automática barra o comentário.',
      run: () => {
        const target = db.get().feedPosts.find((p) => p.sharedOnFeed && !p.deletedAt)
        if (account && target) return createComment(account.id, target.id, 'Que ideia de idiota.')
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
          .map((p, i) => ({
            userId: account.id,
            postId: p.id,
            createdAt: new Date(at - i * 60_000).toISOString(),
          }))
        db.set((s) => ({ ...s, feedBookmarks: [...s.feedBookmarks, ...saved] }))
      },
    },
    {
      label: 'Esvaziar o Feed',
      run: () => db.set((state) => ({ ...state, feedPosts: [] })),
    },
    {
      label: 'Publicar comunicado da administração',
      description: 'Assinado por He4rt Developers, sem fixar.',
      run: () =>
        db.set((s) => ({
          ...s,
          feedAnnouncements: [
            ...s.feedAnnouncements,
            {
              id: newId(),
              authorId: 'u1',
              title: 'Manutenção programada no sábado',
              body: 'O Hub fica fora do ar por até uma hora no sábado de manhã. Nenhum registro é perdido.',
              createdAt: new Date().toISOString(),
              pinnedAt: null,
            },
          ],
        })),
    },
    {
      label: 'Desafixar todos os comunicados',
      run: () =>
        db.set((s) => ({
          ...s,
          feedAnnouncements: s.feedAnnouncements.map((a) => ({ ...a, pinnedAt: null })),
        })),
    },
    {
      label: 'Ver salvos',
      run: () => navigate('/app/saved'),
    },
    { label: 'Nova publicação', run: () => setParams({ compose: '1' }) },
    {
      label: 'Expirar sessão',
      description: 'A home exige login: volta ao Login e retorna para cá.',
      run: () => db.set((state) => ({ ...state, session: null })),
    },
  ])

  if (!account) return null

  // Pinned announcements open the Feed, newest pin first; the rest mixes with publications by date.
  const pinned = announcements
    .filter((a) => a.pinnedAt !== null)
    .toSorted((a, b) => b.pinnedAt!.localeCompare(a.pinnedAt!))
    .map((a) => ({ kind: 'announcement' as const, id: a.id, announcement: a }))
  const timeline = [
    ...announcements
      .filter((a) => a.pinnedAt === null)
      .map((a) => ({ kind: 'announcement' as const, id: a.id, at: a.createdAt, announcement: a })),
    ...posts
      .filter((p) => p.deletedAt === null && p.sharedOnFeed)
      .map((p) => ({ kind: 'post' as const, id: p.id, at: p.createdAt, post: p })),
    // Only its author sees a publication the moderation removed, with the reason, where it was.
    ...posts
      .filter((p) => p.removal && p.userId === account?.id)
      .map((p) => ({ kind: 'removed' as const, id: p.id, at: p.createdAt, post: p })),
  ].toSorted((a, b) => b.at.localeCompare(a.at))
  const visible = [...pinned, ...timeline]
  const page = visible.slice(0, limit)
  const hasMore = visible.length > page.length

  function loadMore() {
    setLoadError(null)
    startLoading(async () => {
      try {
        const next = limit + FEED_PAGE_SIZE
        await loadMorePosts('community', next)
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
    <div className="feed">
      <PageHeader
        title="Feed"
        description="Aprendizados e projetos da comunidade."
        actions={
          <div className="feed__actions">
            <Button asChild variant="ghost">
              <Link to="/app/saved" aria-label="Salvos" title="Salvos">
                <Bookmark size={16} aria-hidden />
                <span className="feed__actions-label">Salvos</span>
              </Link>
            </Button>
            <Button asChild>
              <Link to="/app?compose=1" preventScrollReset>
                Nova publicação
              </Link>
            </Button>
          </div>
        }
      />
      <FormMessage tone={notice?.tone ?? 'success'}>{notice?.text}</FormMessage>

      {page.length === 0 ? (
        <Card className="feed__empty">
          <p>Ainda não há publicações. Registre o que você aprendeu.</p>
          <Button asChild variant="secondary">
            <Link to="/app?compose=1">Nova publicação</Link>
          </Button>
        </Card>
      ) : (
        <ol className="feed__list">
          {page.map((item) => (
            <li key={item.id}>
              {item.kind === 'announcement' ? (
                <AnnouncementCard announcement={item.announcement} viewer={account} onNotice={setNotice} />
              ) : item.kind === 'removed' ? (
                <RemovedNotice what="Sua publicação" createdAt={item.post.createdAt} reason={item.post.removal?.reason ?? ''} />
              ) : (
                <PostCard
                  post={item.post}
                  author={users.find((u) => u.id === item.post.userId)}
                  viewerId={account.id}
                  onNotice={setNotice}
                />
              )}
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
      {composing === '1' && (
        <Dialog open onOpenChange={(open) => !open && navigate('/app', { preventScrollReset: true })}>
          <DialogContent
            title="Nova publicação"
            description="O que você quer compartilhar?"
            footer={
              <Button variant="secondary" onClick={() => navigate('/app', { preventScrollReset: true })}>
                Cancelar
              </Button>
            }
          >
            <div className="feed__compose-options">
              <Button asChild variant="secondary">
                <Link to="/app?compose=progress" preventScrollReset>
                  Registrar um aprendizado
                </Link>
              </Button>
              <Button asChild variant="secondary">
                <Link to="/app?compose=project" preventScrollReset>
                  Compartilhar um projeto
                </Link>
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
      {composing === 'project' && <ProjectForm account={account} />}
      {composing === 'progress' && (
        <PostForm
          layout="dialog"
          account={account}
          initial={{
            learned: '',
            applied: '',
            objectiveProgress: null,
            sharedOnFeed: true,
            shownOnProfile: false,
            showReactionCounts: false,
            collectionIds: [],
          }}
          title="Nova publicação"
          submitLabel="Publicar"
          onSave={async (input) => {
            await createPost(account.id, input)
            return {
              to: '/app',
              notice: input.sharedOnFeed
                ? 'Publicação adicionada.'
                : input.shownOnProfile
                  ? 'Publicação adicionada ao seu perfil.'
                  : 'Publicação adicionada como privada. Ela fica guardada no seu perfil.',
            }
          }}
        />
      )}
    </div>
  )
}
