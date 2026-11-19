import { Link } from 'react-router'
import { BookmarkMinus } from 'lucide-react'
import { FormMessage } from '@/components/form-message'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useActionRunner } from '@/hooks/use-action-runner'
import { formatPostDate } from '@/lib/feed-post'
import type { FeedPost, User } from '@/mocks/db'
import { unsavePost } from '../actions'
import './saved-posts.css'

/** Publications the owner saved to read again, newest save first. Only the owner sees this list. */
export function SavedPosts({ ownerId, posts, users }: { ownerId: string; posts: FeedPost[]; users: User[] }) {
  const { run, pending, error } = useActionRunner()
  return (
    <Card className="saved-posts" aria-labelledby="saved-posts-title">
      <h2 id="saved-posts-title">Salvos</h2>
      <p className="saved-posts__muted">Só você vê o que salvou no Feed.</p>
      {posts.length === 0 ? (
        <p className="saved-posts__muted">Nada salvo ainda. Salve no Feed as publicações que quer ler de novo.</p>
      ) : (
        <ol className="saved-posts__list">
          {posts.map((post) => {
            const author = users.find((u) => u.id === post.userId)
            return (
              <li key={post.id}>
                <p className="saved-posts__meta">
                  {author?.published ? (
                    <Link to={`/members/${author.username}`} title={author.name}>
                      {author.name}
                    </Link>
                  ) : (
                    <span title={author?.name}>{author?.name ?? 'Membro'}</span>
                  )}
                  <time dateTime={post.createdAt}>{formatPostDate(post.createdAt)}</time>
                </p>
                <p>{post.learned}</p>
                <p className="saved-posts__muted">Como aplicou: {post.applied}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="saved-posts__remove"
                  disabled={pending}
                  onClick={() => run(() => unsavePost(ownerId, post.id))}
                >
                  <BookmarkMinus size={14} aria-hidden />
                  Tirar dos salvos
                </Button>
              </li>
            )
          })}
        </ol>
      )}
      <FormMessage tone="error">{error}</FormMessage>
    </Card>
  )
}
