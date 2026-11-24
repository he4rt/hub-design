import { useState } from 'react'
import { FormMessage } from '@/components/form-message'
import { PageHeader } from '@/components/page-header'
import { useDebugActions } from '@/debug/use-debug-actions'
import { formatPostDate } from '@/lib/feed-post'
import { db, useDb } from '@/mocks/db'
import { useAccount } from '@/modules/panel-app/hooks/use-account'
import { PostCard, type Notice } from '../components/post-card'
import './saved.css'

/**
 * The publications the member saved in the Feed to read again, newest save first, each as the card
 * it was in the Feed. Its bookmark takes it out; the card stays until the page is left, so a misclick
 * can be undone by saving again. A reading tool of the Feed: only the member sees it.
 */
export default function Saved() {
  const account = useAccount()
  const bookmarks = useDb((s) => s.feedBookmarks)
  const posts = useDb((s) => s.feedPosts)
  const users = useDb((s) => s.users)
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

  useDebugActions('Salvos', [
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
      <PageHeader parent={{ to: '/app', label: 'Feed' }} title="Salvos" description="Publicações que você guardou para ler depois. A lista é privada." />
      <FormMessage tone={notice?.tone ?? 'success'}>{notice?.text}</FormMessage>
      {shown.length === 0 ? (
        <p className="saved__empty">Nada salvo ainda. No Feed, toque em Salvar nas publicações que quer ler de novo.</p>
      ) : (
        <ol className="saved__list">
          {shown.map((post) => {
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
