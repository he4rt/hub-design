import { useActionState, useId, useState, useTransition } from 'react'
import { SendHorizontal, Trash2 } from 'lucide-react'
import { Link } from 'react-router'
import { FormMessage } from '@/components/form-message'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useNow } from '@/hooks/use-now'
import { formatFullDate, formatRelative } from '@/lib/feed-post'
import { useDb, type FeedComment, type User } from '@/mocks/db'
import { errorMessage } from '@/mocks/mock-action'
import { canDeleteComment, COMMENT_MAX, createComment, deleteComment, validateComment } from '../actions'
import './post-comments.css'

const SHOWN_COMMENTS = 3

/** Short comments stay in the Feed; questions and their answers belong in the forum. */
export function PostComments({ postId, comments, viewer, onClose }: {
  postId: string
  comments: FeedComment[]
  viewer: User
  onClose?: () => void
}) {
  const users = useDb((state) => state.users)
  const inputId = useId()
  const [body, setBody] = useState('')
  const [showAll, setShowAll] = useState(false)
  const [error, send, sending] = useActionState(async () => {
    const invalid = validateComment(body)
    if (invalid) return invalid
    try {
      await createComment(viewer.id, postId, body)
      setBody('')
      return null
    } catch (e) {
      return errorMessage(e)
    }
  }, null)
  const hidden = showAll ? 0 : Math.max(0, comments.length - SHOWN_COMMENTS)
  const length = body.trim().length

  return (
    <section className="post-comments" aria-label="Comentários">
      {hidden > 0 && (
        <button type="button" className="post-comments__more" onClick={() => setShowAll(true)}>
          Ver {hidden === 1 ? 'o comentário anterior' : `os ${hidden} comentários anteriores`}
        </button>
      )}
      {comments.length > 0 && (
        <ol className="post-comments__list" aria-live="polite">
          {comments.slice(hidden).map((comment) => (
            <CommentItem key={comment.id} comment={comment} author={users.find((u) => u.id === comment.userId)} viewerId={viewer.id} />
          ))}
        </ol>
      )}
      <form action={send} className="post-comments__form">
        <Avatar src={viewer.photoUrl} name={viewer.name} size="sm" />
        <div className="post-comments__compose">
          <div className="post-comments__field">
            <Input
              id={inputId}
              name="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Escape' && !body) onClose?.() }}
              placeholder="Escreva um comentário"
              aria-label="Escreva um comentário"
              aria-invalid={error ? true : undefined}
              aria-describedby={`${inputId}-message`}
              maxLength={COMMENT_MAX + 50}
              autoComplete="off"
              autoFocus
              disabled={sending}
            />
            {length > 0 && (
              <span className="post-comments__count" data-over={length > COMMENT_MAX || undefined}>
                {length}/{COMMENT_MAX}
              </span>
            )}
            <Button type="submit" variant="ghost" size="sm" className="post-comments__send"
              loading={sending} disabled={length === 0} aria-label="Enviar comentário" title="Enviar comentário">
              <SendHorizontal size={18} aria-hidden />
            </Button>
          </div>
          <div className="post-comments__message" id={`${inputId}-message`}>
            <FormMessage tone="error">{error}</FormMessage>
          </div>
        </div>
      </form>
    </section>
  )
}

function CommentItem({ comment, author, viewerId }: { comment: FeedComment; author: User | undefined; viewerId: string }) {
  const now = useNow()
  const [confirming, setConfirming] = useState(false)
  const [deleting, startDeleting] = useTransition()
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const name = author?.name ?? 'Membro'

  function remove() {
    startDeleting(async () => {
      try {
        await deleteComment(viewerId, comment.id)
        setConfirming(false)
      } catch (e) {
        setDeleteError(errorMessage(e))
      }
    })
  }

  return (
    <li className="post-comments__item">
      <Avatar src={author?.photoUrl ?? null} name={name} size="sm" />
      <div className="post-comments__bubble">
        <p className="post-comments__meta">
          {author ? (
            <Link to={`/members/${author.username}`} className="post-comments__name" title={name}>{name}</Link>
          ) : <strong className="post-comments__name">{name}</strong>}
          <time dateTime={comment.createdAt} title={formatFullDate(comment.createdAt)}>{formatRelative(comment.createdAt, now)}</time>
        </p>
        <p className="post-comments__body">{comment.body}</p>
        {canDeleteComment(comment, viewerId) && (
          <button type="button" className="post-comments__delete" aria-label="Excluir comentário"
            title="Excluir comentário" onClick={() => setConfirming(true)}>
            <Trash2 size={14} aria-hidden />
          </button>
        )}
      </div>
      <Dialog open={confirming} onOpenChange={(open) => !deleting && setConfirming(open)}>
        <DialogContent title="Excluir comentário?" description="Ele some para todos. Não dá para desfazer."
          footer={
            <>
              <DialogClose asChild><Button variant="secondary" disabled={deleting}>Cancelar</Button></DialogClose>
              <Button variant="danger" loading={deleting} onClick={remove}>Excluir</Button>
            </>
          }>
          <p className="post-comments__quote">{comment.body}</p>
          <FormMessage tone="error">{deleteError}</FormMessage>
        </DialogContent>
      </Dialog>
    </li>
  )
}
