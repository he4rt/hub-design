import { useState, useTransition } from 'react'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatPostDate, OBJECTIVE_PROGRESS } from '@/lib/feed-post'
import { labelOf } from '@/lib/member-profile'
import type { FeedPost, User } from '@/mocks/db'
import { errorMessage } from '@/mocks/mock-action'
import { canManagePost, deletePost, updatePostVisibility } from '../actions'
import './post-card.css'

export type Notice = { tone: 'error' | 'success'; text: string }

/**
 * One publication. Its author gets a menu to choose where it shows and to
 * delete it; nobody else gets a menu. `showVisibility` tags where the post
 * shows, for the author's own list.
 */
export function PostCard({
  post,
  author,
  viewerId,
  showVisibility = false,
  onNotice,
}: {
  post: FeedPost
  author: User | undefined
  viewerId: string
  showVisibility?: boolean
  onNotice: (notice: Notice) => void
}) {
  const [busy, startBusy] = useTransition()
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const own = canManagePost(post, viewerId)
  const name = author?.name ?? 'Membro'

  function run(action: () => Promise<unknown>, success: string) {
    startBusy(async () => {
      try {
        await action()
        setConfirmingDelete(false)
        onNotice({ tone: 'success', text: success })
      } catch (e) {
        onNotice({ tone: 'error', text: errorMessage(e) })
      }
    })
  }

  return (
    <Card className="post-card">
      <header className="post-card__header">
        <Avatar src={author?.photoUrl ?? null} name={name} size="sm" />
        <div className="post-card__author">
          <strong title={name}>{name}</strong>
          <time dateTime={post.createdAt}>{formatPostDate(post.createdAt)}</time>
        </div>
        {own && (
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" loading={busy} aria-label="Ações da publicação">
                •••
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem
                onSelect={() =>
                  run(
                    () => updatePostVisibility(viewerId, post.id, { sharedOnFeed: !post.sharedOnFeed }),
                    post.sharedOnFeed ? 'Publicação tirada do Feed.' : 'Publicação compartilhada no Feed.',
                  )
                }
              >
                {post.sharedOnFeed ? 'Tirar do Feed da comunidade' : 'Compartilhar no Feed da comunidade'}
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() =>
                  run(
                    () => updatePostVisibility(viewerId, post.id, { shownOnProfile: !post.shownOnProfile }),
                    post.shownOnProfile ? 'Publicação tirada do perfil público.' : 'Publicação mostrada no perfil público.',
                  )
                }
              >
                {post.shownOnProfile ? 'Tirar do meu perfil público' : 'Mostrar no meu perfil público'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="danger" onSelect={() => setConfirmingDelete(true)}>
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </header>

      <dl className="post-card__body">
        <div>
          <dt>O que aprendi</dt>
          <dd>{post.learned}</dd>
        </div>
        <div>
          <dt>Como apliquei</dt>
          <dd>{post.applied}</dd>
        </div>
        <div>
          <dt>Quanto me aproximou do objetivo</dt>
          <dd>{labelOf(OBJECTIVE_PROGRESS, post.objectiveProgress)}</dd>
        </div>
      </dl>

      {showVisibility && (
        <ul className="post-card__visibility" aria-label="Onde aparece">
          <li>{post.sharedOnFeed ? 'No Feed da comunidade' : 'Só para você'}</li>
          {post.shownOnProfile && <li>No perfil público</li>}
        </ul>
      )}

      <Dialog open={confirmingDelete} onOpenChange={(open) => !busy && setConfirmingDelete(open)}>
        <DialogContent
          title="Excluir publicação?"
          description="Ela some do Feed, da sua trajetória e do seu perfil. Não dá para desfazer."
          footer={
            <>
              <DialogClose asChild>
                <Button variant="secondary" disabled={busy}>
                  Cancelar
                </Button>
              </DialogClose>
              <Button
                variant="danger"
                loading={busy}
                onClick={() => run(() => deletePost(viewerId, post.id), 'Publicação excluída.')}
              >
                Excluir
              </Button>
            </>
          }
        >
          <p className="post-card__quote">{post.learned}</p>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
