import { Link } from 'react-router'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { useDebugActions } from '@/debug/use-debug-actions'
import { db, useDb } from '@/mocks/db'
import { useAccount } from '@/modules/panel-app/hooks/use-account'
import { SavedPosts } from '../components/saved-posts'
import '@/components/stack-page.css'

/**
 * The publications the member saved in the Feed to read again, newest save first. A reading tool of
 * the Feed, so it lives in the app and never on the public profile; only the member sees it.
 */
export default function Saved() {
  const account = useAccount()
  const bookmarks = useDb((s) => s.feedBookmarks)
  const posts = useDb((s) => s.feedPosts)
  const users = useDb((s) => s.users)

  useDebugActions('Salvos', [
    {
      label: 'Esvaziar meus salvos',
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
  // The rule of the Feed's save: not deleted, shared on the Feed, and by someone else.
  const saved = bookmarks
    .filter((b) => b.userId === account.id)
    .toSorted((a, b) => b.createdAt.localeCompare(a.createdAt))
    .flatMap((b) => posts.filter((p) => p.id === b.postId && p.deletedAt === null && p.sharedOnFeed && p.userId !== account.id))

  return (
    <div className="stack-page">
      <PageHeader
        title="Salvos"
        description="Publicações do Feed que você guardou para ler de novo. Só você vê."
        actions={
          <Button asChild variant="secondary">
            <Link to="/app">Voltar ao Feed</Link>
          </Button>
        }
      />
      <SavedPosts ownerId={account.id} posts={saved} users={users} />
    </div>
  )
}
