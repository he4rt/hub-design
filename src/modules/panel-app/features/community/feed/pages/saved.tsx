import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Lock, Search } from 'lucide-react'
import { FormMessage } from '@/components/form-message'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useDebugActions } from '@/debug/use-debug-actions'
import { formatPostDate } from '@/lib/feed-post'
import { db, useDb } from '@/mocks/db'
import { useAccount } from '@/modules/panel-app/hooks/use-account'
import { PostCard, type Notice } from '../components/post-card'
import './saved.css'

/** Lowercase without accents, so "funcao" finds "função". */
const fold = (text: string) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

/**
 * Salvos, the member's personal library: the publications they saved in the Feed to read again,
 * newest save first, each as the card it was in the Feed, with a search over their text. Its bookmark
 * takes it out; the card stays until the page is left, so a misclick can be undone by saving again.
 * Private: only the member sees what they saved, and the authors are never told.
 */
export default function Saved() {
  const account = useAccount()
  const bookmarks = useDb((s) => s.feedBookmarks)
  const posts = useDb((s) => s.feedPosts)
  const users = useDb((s) => s.users)
  const projects = useDb((s) => s.memberProjects)
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const terms = fold(query).split(/\s+/).filter(Boolean)
  const [notice, setNotice] = useState<Notice | null>(null)
  // The rule of the Feed's save: not deleted, shared on the Feed, and by someone else.
  const mine = bookmarks
    .filter((b) => b.userId === account?.id)
    .toSorted((a, b) => b.createdAt.localeCompare(a.createdAt))
  // Saved when the page opened, so taking one out does not pull the list from under the pointer.
  const [shownIds] = useState(() => mine.map((b) => b.postId))
  const shown = shownIds.flatMap((id) =>
    posts.filter((p) => p.id === id && p.deletedAt === null && p.sharedOnFeed && p.userId !== account?.id),
  )
  // Searches what the publication says and who wrote it.
  const found = shown.filter((post) => {
    const project = projects.find((p) => p.id === post.projectId)
    const author = users.find((u) => u.id === post.userId)?.name ?? ''
    const text = fold(`${post.learned} ${post.applied} ${project?.pitch ?? ''} ${project?.read.name ?? ''} ${author}`)
    return terms.every((term) => text.includes(term))
  })

  useDebugActions('Salvos', [
    { label: 'Buscar "fila"', run: () => navigate('/app/saved?q=fila') },
    { label: 'Buscar sem resultado', run: () => navigate('/app/saved?q=kubernetes-quantico') },
    {
      label: 'Esvaziar meus salvos',
      description: 'Recarregue a página para ver o estado vazio.',
      run: () => db.set((s) => ({ ...s, feedBookmarks: s.feedBookmarks.filter((b) => b.userId !== s.session?.userId) })),
    },
    {
      label: 'Outro membro apaga uma publicação que salvei',
      description: 'Ela some dos Salvos, como some do Feed.',
      run: () => {
        const bookmark = db.get().feedBookmarks.find((b) => b.userId === account?.id)
        if (!bookmark) return
        const deletedAt = new Date().toISOString()
        db.set((s) => ({ ...s, feedPosts: s.feedPosts.map((p) => (p.id === bookmark.postId ? { ...p, deletedAt } : p)) }))
      },
    },
  ])

  if (!account) return null

  return (
    <div className="saved">
      <PageHeader title="Salvos" description="Sua biblioteca de publicações do Feed para ler de novo." />
      {/* Said once, near the top: what is saved here is the member's alone. */}
      <p className="saved__private">
        <Lock size={14} aria-hidden />
        A lista é privada. Quem publicou não é avisado.
      </p>
      {shown.length > 0 && (
        <label className="saved__search">
          <Search size={18} aria-hidden />
          <Input
            type="search"
            value={query}
            placeholder="Buscar nos salvos"
            aria-label="Buscar nos salvos"
            // Typing replaces the entry, so Back leaves the page instead of undoing letters.
            onChange={(event) => setParams(event.target.value ? { q: event.target.value } : {}, { replace: true, preventScrollReset: true })}
          />
        </label>
      )}
      <FormMessage tone={notice?.tone ?? 'success'}>{notice?.text}</FormMessage>
      {shown.length === 0 ? (
        <div className="saved__empty">
          <p>Nada salvo ainda. No Feed, toque em Salvar nas publicações que quer ler de novo.</p>
          <Button asChild variant="secondary">
            <Link to="/app">Ir para o Feed</Link>
          </Button>
        </div>
      ) : found.length === 0 ? (
        <p className="saved__empty">Nenhuma publicação salva encontrada para "{query.trim()}".</p>
      ) : (
        <ol className="saved__list">
          {found.map((post) => {
            const bookmark = mine.find((b) => b.postId === post.id)
            return (
              <li key={post.id}>
                <p className="saved__when">
                  {bookmark ? (
                    <>
                      Salvo em <time dateTime={bookmark.createdAt}>{formatPostDate(bookmark.createdAt)}</time>
                    </>
                  ) : (
                    'Tirado dos salvos. Salve de novo para manter.'
                  )}
                </p>
                <PostCard
                  post={post}
                  author={users.find((u) => u.id === post.userId)}
                  viewerId={account.id}
                  onNotice={setNotice}
                />
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
