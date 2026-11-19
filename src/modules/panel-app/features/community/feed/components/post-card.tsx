import { useRef, useState, useTransition } from 'react'
import { Link } from 'react-router'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
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
import { useNow } from '@/hooks/use-now'
import { formatFullDate, formatRelative, formatShortDate, OBJECTIVE_PROGRESS } from '@/lib/feed-post'
import { areaLabels, labelOf } from '@/lib/member-profile'
import { useDb, type FeedPost, type User } from '@/mocks/db'
import { errorMessage } from '@/mocks/mock-action'
import {
  canManagePost,
  canSavePost,
  deletePost,
  savePost,
  unsavePost,
  updatePostCollections,
  updatePostVisibility,
} from '../actions'
import { memberBadges } from '../lib/badges'
import { CollectionPicker } from './collection-picker'
import { ReactionBar } from './reaction-bar'
import './post-card.css'

export type Notice = { tone: 'error' | 'success'; text: string }

/**
 * One publication. The author's photo and name open their profile, with their
 * headline and badges. Readers react and save it to read again; the author gets
 * a menu to edit it, choose where it shows and who sees the reaction counts,
 * pick its study tracks ("trilhas") and delete it.
 */
export function PostCard({
  post,
  author,
  viewerId,
  onNotice,
}: {
  post: FeedPost
  author: User | undefined
  viewerId: string
  onNotice: (notice: Notice) => void
}) {
  const [busy, startBusy] = useTransition()
  const now = useNow()
  const squads = useDb((state) => state.squads)
  const validators = useDb((state) => state.validators)
  const [saving, startSaving] = useTransition()
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [editingCollections, setEditingCollections] = useState(false)
  const [draftCollections, setDraftCollections] = useState(post.collectionIds)
  // Dialogs open from the menu, so closing one puts the focus back on the menu button.
  const menuButton = useRef<HTMLButtonElement>(null)
  const refocusMenu = (event: Event) => {
    event.preventDefault()
    menuButton.current?.focus()
  }
  const allCollections = useDb((state) => state.feedCollections)
  const bookmarks = useDb((state) => state.feedBookmarks)
  const saved = bookmarks.some((b) => b.userId === viewerId && b.postId === post.id)
  const own = canManagePost(post, viewerId)
  const name = author?.name ?? 'Membro'
  const collections = allCollections.filter((c) => post.collectionIds.includes(c.id))
  const badges = author ? memberBadges(author, { squads, validators }) : []
  const headline = author ? author.bio || areaLabels(author.areas) : ''
  const profilePath = author ? `/members/${author.username}` : null

  function run(action: () => Promise<unknown>, success: string) {
    startBusy(async () => {
      try {
        await action()
        setConfirmingDelete(false)
        setEditingCollections(false)
        onNotice({ tone: 'success', text: success })
      } catch (e) {
        onNotice({ tone: 'error', text: errorMessage(e) })
      }
    })
  }

  function toggleSaved() {
    startSaving(async () => {
      try {
        await (saved ? unsavePost : savePost)(viewerId, post.id)
      } catch (e) {
        onNotice({ tone: 'error', text: errorMessage(e) })
      }
    })
  }

  return (
    <Card className="post-card">
      <header className="post-card__header">
        {profilePath ? (
          <Link to={profilePath} className="post-card__avatar" aria-hidden tabIndex={-1}>
            <Avatar src={author?.photoUrl ?? null} name={name} />
          </Link>
        ) : (
          <Avatar src={null} name={name} />
        )}
        <div className="post-card__author">
          <div className="post-card__name">
            {profilePath ? (
              <Link to={profilePath} title={`Ver o perfil de ${name}`}>
                {name}
              </Link>
            ) : (
              <strong>{name}</strong>
            )}
            {badges.map((badge) => (
              <Badge key={badge.key} title={badge.title}>
                {badge.label}
              </Badge>
            ))}
          </div>
          {headline && (
            <p className="post-card__headline" title={headline}>
              {headline}
            </p>
          )}
          <p className="post-card__meta">
            <time dateTime={post.createdAt} title={formatFullDate(post.createdAt)}>
              {formatRelative(post.createdAt, now)}
            </time>
            {post.editedAt && (
              <span title="O texto foi corrigido depois de publicado.">
                , editado em <time dateTime={post.editedAt}>{formatShortDate(post.editedAt, now)}</time>
              </span>
            )}
          </p>
        </div>
        {own && (
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button ref={menuButton} variant="ghost" size="sm" loading={busy} aria-label="Ações da publicação">
                •••
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem asChild>
                <Link to={`/app/feed/${post.id}/edit`}>Editar</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() =>
                  run(
                    () =>
                      updatePostVisibility(viewerId, post.id, {
                        sharedOnFeed: !post.sharedOnFeed,
                      }),
                    post.sharedOnFeed ? 'Publicação tirada do Feed.' : 'Publicação compartilhada no Feed.',
                  )
                }
              >
                {post.sharedOnFeed ? 'Tirar do Feed da comunidade' : 'Compartilhar no Feed da comunidade'}
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() =>
                  run(
                    () =>
                      updatePostVisibility(viewerId, post.id, {
                        shownOnProfile: !post.shownOnProfile,
                      }),
                    post.shownOnProfile
                      ? 'Publicação tirada do perfil público.'
                      : 'Publicação mostrada no perfil público.',
                  )
                }
              >
                {post.shownOnProfile ? 'Tirar do meu perfil público' : 'Mostrar no meu perfil público'}
              </DropdownMenuItem>
              {post.sharedOnFeed && (
                <DropdownMenuItem
                  onSelect={() =>
                    run(
                      () => updatePostVisibility(viewerId, post.id, { showReactionCounts: !post.showReactionCounts }),
                      post.showReactionCounts
                        ? 'Só você vê os números desta publicação.'
                        : 'Todos veem os números desta publicação.',
                    )
                  }
                >
                  {post.showReactionCounts
                    ? 'Esconder os números das reações'
                    : 'Mostrar os números das reações a todos'}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onSelect={() => {
                  setDraftCollections(post.collectionIds)
                  setEditingCollections(true)
                }}
              >
                Trilhas
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
      </dl>

      <div className="post-card__tags">
        <Badge title="Quanto isso aproximou do objetivo">
          {labelOf(OBJECTIVE_PROGRESS, post.objectiveProgress)} do objetivo
        </Badge>
        {collections.map((c) => (
          <Badge key={c.id} title={`Trilha: ${c.name}`}>
            Trilha: {c.name}
          </Badge>
        ))}
      </div>

      {(post.sharedOnFeed || !own) && (
        <footer className="post-card__footer">
          <ReactionBar post={post} viewerId={viewerId} own={own} onNotice={onNotice}>
            {canSavePost(post, viewerId) && (
              <Button
                variant="ghost"
                size="sm"
                className="post-card__save"
                aria-pressed={saved}
                loading={saving}
                onClick={toggleSaved}
              >
                {saved ? 'Salvo' : 'Salvar'}
              </Button>
            )}
          </ReactionBar>
        </footer>
      )}

      <Dialog open={editingCollections} onOpenChange={(open) => !busy && setEditingCollections(open)}>
        <DialogContent
          onCloseAutoFocus={refocusMenu}
          title="Trilhas da publicação"
          description="Junte o que você aprende sobre um tema. Pode ficar em várias ou em nenhuma."
          footer={
            <>
              <DialogClose asChild>
                <Button variant="secondary" disabled={busy}>
                  Cancelar
                </Button>
              </DialogClose>
              <Button
                loading={busy}
                onClick={() =>
                  run(() => updatePostCollections(viewerId, post.id, draftCollections), 'Trilhas atualizadas.')
                }
              >
                Salvar
              </Button>
            </>
          }
        >
          <CollectionPicker userId={viewerId} value={draftCollections} onChange={setDraftCollections} disabled={busy} />
        </DialogContent>
      </Dialog>

      <Dialog open={confirmingDelete} onOpenChange={(open) => !busy && setConfirmingDelete(open)}>
        <DialogContent
          onCloseAutoFocus={refocusMenu}
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
