import { useTransition } from 'react'
import { Bookmark } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDb, type FeedPost } from '@/mocks/db'
import { errorMessage } from '@/mocks/mock-action'
import { canSavePost, savePost, unsavePost } from '../actions'
import type { Notice } from './post-card'
import './post-save-button.css'

/** The same bookmark, backed by the publication, in the Feed and project header. */
export function PostSaveButton({ post, viewerId, onNotice }: {
  post: FeedPost
  viewerId: string
  onNotice: (notice: Notice) => void
}) {
  const bookmarks = useDb((s) => s.feedBookmarks)
  const [saving, startSaving] = useTransition()
  const saved = bookmarks.some((b) => b.userId === viewerId && b.postId === post.id)
  if (!canSavePost(post, viewerId)) return null
  return (
    <Button
      variant="ghost"
      className="post-action post-save-button"
      data-action="save"
      aria-pressed={saved}
      data-active={saved || undefined}
      loading={saving}
      onClick={() => startSaving(async () => {
        try {
          await (saved ? unsavePost : savePost)(viewerId, post.id)
        } catch (e) {
          onNotice({ tone: 'error', text: errorMessage(e) })
        }
      })}
    >
      <Bookmark size={18} aria-hidden fill={saved ? 'currentColor' : 'none'} />
      <span className="post-action__label">{saved ? 'Salvo' : 'Salvar'}</span>
    </Button>
  )
}
