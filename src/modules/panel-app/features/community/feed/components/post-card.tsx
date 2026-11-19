import { useRef, useState, useTransition } from 'react'
import { Link } from 'react-router'
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
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { formatPostDate, OBJECTIVE_PROGRESS, REACTIONS } from '@/lib/feed-post'
import { labelOf } from '@/lib/member-profile'
import { useDb, type FeedPost, type ReactionType, type User } from '@/mocks/db'
import { errorMessage } from '@/mocks/mock-action'
import {
  canManagePost,
  canSavePost,
  deletePost,
  savePost,
  toggleReaction,
  unsavePost,
  updatePostCollections,
  updatePostVisibility,
} from '../actions'
import { CollectionPicker } from './collection-picker'
import './post-card.css'

export type Notice = { tone: 'error' | 'success'; text: string }

/**
 * One publication. Readers mark learning reactions and save it to read again;
 * the author gets a menu to choose where it shows, which study tracks
 * ("trilhas") it is in, and to delete it. Reaction counts show to the author,
 * and to everyone only when the author turned it on for this publication.
 * `showVisibility` tags where the post shows, for the author's own list.
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
  const [reacting, startReacting] = useTransition()
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
  const users = useDb((state) => state.users)
  const bookmarks = useDb((state) => state.feedBookmarks)
  const saved = bookmarks.some((b) => b.userId === viewerId && b.postId === post.id)
  const own = canManagePost(post, viewerId)
  const name = author?.name ?? 'Membro'
  const collections = allCollections.filter((c) => post.collectionIds.includes(c.id))
  const countsVisible = own || post.showReactionCounts
  const mine = post.reactions.filter((r) => r.userId === viewerId).map((r) => r.type)

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

  function react(type: ReactionType) {
    startReacting(async () => {
      try {
        await toggleReaction(viewerId, post.id, type)
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

  function toggleCounts(visible: boolean) {
    run(
      () =>
        updatePostVisibility(viewerId, post.id, {
          showReactionCounts: visible,
        }),
      visible ? 'Todos veem os números desta publicação.' : 'Só você vê os números desta publicação.',
    )
  }

  const count = (type: ReactionType) => post.reactions.filter((r) => r.type === type).length
  const helpers = post.reactions
    .filter((r) => r.type === 'helped')
    .map((r) => users.find((u) => u.id === r.userId)?.name ?? 'Membro')

  return (
    <Card className="post-card">
      <header className="post-card__header">
        <Avatar src={author?.photoUrl ?? null} name={name} size="sm" />
        <div className="post-card__author">
          <strong title={name}>{name}</strong>
          <time dateTime={post.createdAt}>{formatPostDate(post.createdAt)}</time>
        </div>
        {post.editedAt && (
          <span className="post-card__edited" title="O texto foi corrigido pela autora ou autor depois de publicado.">
            editado em <time dateTime={post.editedAt}>{formatPostDate(post.editedAt)}</time>
          </span>
        )}
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

      {collections.length > 0 && (
        <ul className="post-card__collections" aria-label="Trilhas">
          {collections.map((c) => (
            <li key={c.id} title={c.name}>
              {c.name}
            </li>
          ))}
        </ul>
      )}

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

      {own ? (
        post.sharedOnFeed && (
          <div className="post-card__reactions">
            <ul className="post-card__counts" aria-label="Reações recebidas">
              {REACTIONS.map((r) => (
                <li key={r.value}>
                  {r.label} <span>{count(r.value)}</span>
                </li>
              ))}
            </ul>
            {helpers.length > 0 && (
              <p className="post-card__hint">
                {helpers.join(', ')} {helpers.length === 1 ? 'disse' : 'disseram'} que isso ajudou.
              </p>
            )}
            <div className="post-card__counts-switch">
              <Label htmlFor={`counts-${post.id}`}>Todos veem os números</Label>
              <Switch
                id={`counts-${post.id}`}
                checked={post.showReactionCounts}
                disabled={busy}
                onCheckedChange={toggleCounts}
              />
            </div>
          </div>
        )
      ) : (
        <div className="post-card__reader">
          <ToggleGroup
            type="multiple"
            variant="chips"
            className="post-card__react"
            value={mine}
            disabled={reacting}
            aria-label="Reagir à publicação"
            onValueChange={(next) => {
              const changed = REACTIONS.find((r) => next.includes(r.value) !== mine.includes(r.value))
              if (changed) react(changed.value)
            }}
          >
            {REACTIONS.map((r) => (
              <ToggleGroupItem key={r.value} value={r.value}>
                {r.label}
                {countsVisible && <span className="post-card__count">{count(r.value)}</span>}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
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
        </div>
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
