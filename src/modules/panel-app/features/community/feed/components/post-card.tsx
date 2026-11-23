import { useRef, useState, useTransition } from 'react'
import { BadgeCheck, BookOpen, MessageSquare, Wrench } from 'lucide-react'
import { Link } from 'react-router'
import { MemberProjectPreview } from '@/components/member-project-preview'
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
import { useNow } from '@/hooks/use-now'
import { formatFullDate, formatRelative, formatShortDate, OBJECTIVE_PROGRESS } from '@/lib/feed-post'
import { areaLabels, labelOf } from '@/lib/member-profile'
import { useDb, type FeedPost, type User } from '@/mocks/db'
import { errorMessage } from '@/mocks/mock-action'
import {
  canCommentOn,
  canManagePost,
  deletePost,
  updatePostCollections,
  updatePostVisibility,
} from '../actions'
import { CollectionPicker } from './collection-picker'
import { PostComments } from './post-comments'
import { PostSaveButton } from './post-save-button'
import { ReactButton, ReactionSummary } from './reaction-bar'
import './post-card.css'

export type Notice = { tone: 'error' | 'success'; text: string }

/**
 * One publication, kept to what it says: who wrote it, when, what they learned,
 * how they applied it and how much it moved them toward their objective. The
 * author's photo and name open their profile. Readers react, comment and save it
 * to read again; "Comentar" opens the short discussion inside the card. The author gets a menu to edit it, choose where it shows and who sees
 * the reaction counts, pick its study tracks ("trilhas") and delete it.
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
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [editingCollections, setEditingCollections] = useState(false)
  const [draftCollections, setDraftCollections] = useState(post.collectionIds)
  // Dialogs open from the menu, so closing one puts the focus back on the menu button.
  const menuButton = useRef<HTMLButtonElement>(null)
  const refocusMenu = (event: Event) => {
    event.preventDefault()
    menuButton.current?.focus()
  }
  const allComments = useDb((state) => state.feedComments)
  const viewer = useDb((state) => state.users.find((u) => u.id === viewerId))
  const project = useDb((state) => state.memberProjects.find((p) => p.id === post.projectId))
  const [commenting, setCommenting] = useState(false)
  const comments = allComments.filter((c) => c.postId === post.id && c.deletedAt === null)
  // The viewer's own comments the moderation removed stay in the conversation for them, with the reason.
  const shownComments = allComments.filter((c) => c.postId === post.id && (c.deletedAt === null || (c.removal && c.userId === viewerId)))
  const own = canManagePost(post, viewerId)
  const name = author?.name ?? 'Membro'
  const authorProfile = useDb((state) => state.profiles.find((p) => p.userId === post.userId))
  const validator = useDb((state) => state.validators.some((v) => v.userId === post.userId && v.suspension === null))
  // One line: what the author does today, or their areas. The bio stays on the profile.
  const currentRole = authorProfile?.experiences.find((e) => e.endedAt === null)?.role
  const headline = author ? currentRole || areaLabels(author.areas) : ''
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
            {/* A function, not a rank: quiet, in the text color, with no colored name or badge box. */}
            {validator && (
              <span className="post-card__role" role="img" aria-label="Validador" title="Validador">
                <BadgeCheck size={15} aria-hidden />
              </span>
            )}
            <p className="post-card__meta">
              <time dateTime={post.createdAt} title={formatFullDate(post.createdAt)}>
                {formatRelative(post.createdAt, now)}
              </time>
              {post.editedAt && (
                <span title={`O texto foi corrigido em ${formatShortDate(post.editedAt, now)}.`}>, editado</span>
              )}
            </p>
          </div>
          {headline && (
            <p className="post-card__headline" title={headline}>
              {headline}
            </p>
          )}
        </div>
        {own && (
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                ref={menuButton}
                variant="ghost"
                size="sm"
                loading={busy}
                aria-label="Ações da publicação"
              >
                •••
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem asChild>
                <Link to={`/app/feed/${post.id}/edit`}>Editar</Link>
              </DropdownMenuItem>
              {project && (post.sharedOnFeed || post.shownOnProfile) && (
                <DropdownMenuItem asChild>
                  <Link to={`/app/discussions/new?post=${post.id}`}>Tirar dúvida no Fórum</Link>
                </DropdownMenuItem>
              )}
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
                      () =>
                        updatePostVisibility(viewerId, post.id, {
                          showReactionCounts: !post.showReactionCounts,
                        }),
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

      {project ? (
        <div className="post-card__project">
          <p className="post-card__pitch">{project.pitch}</p>
          <MemberProjectPreview project={project} />
        </div>
      ) : (
        <>
          <dl className="post-card__body">
            <div>
              <dt><BookOpen size={15} aria-hidden /> O que aprendi</dt>
              <dd>{post.learned}</dd>
            </div>
            <div>
              <dt><Wrench size={15} aria-hidden /> Como apliquei</dt>
              <dd>{post.applied}</dd>
            </div>
          </dl>

          <p className="post-card__progress">
            {labelOf(OBJECTIVE_PROGRESS, post.objectiveProgress)} do objetivo
          </p>
        </>
      )}

      {canCommentOn(post) && (
        <footer className="post-card__footer">
          {/* What others did with it; hidden when there is nothing to show. */}
          <div className="post-card__stats">
            <ReactionSummary post={post} own={own} />
            {comments.length > 0 && (
              <button
                type="button"
                className="post-card__stats-comments"
                aria-expanded={commenting}
                onClick={() => setCommenting((open) => !open)}
              >
                {comments.length} {comments.length === 1 ? 'comentário' : 'comentários'}
              </button>
            )}
          </div>
          <div className="post-card__actions">
            {!own && <ReactButton post={post} viewerId={viewerId} onNotice={onNotice} />}
            <Button
              variant="ghost"
              className="post-action"
              data-action="comment"
              aria-expanded={commenting}
              data-active={commenting || undefined}
              onClick={() => setCommenting((open) => !open)}
            >
              <MessageSquare size={18} aria-hidden />
              <span className="post-action__label">Comentar</span>
            </Button>
            <PostSaveButton post={post} viewerId={viewerId} onNotice={onNotice} />
          </div>
          {commenting && viewer && (
            <PostComments
              postId={post.id}
              comments={shownComments}
              viewer={viewer}
              onClose={() => setCommenting(false)}
            />
          )}
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
                  run(
                    () => updatePostCollections(viewerId, post.id, draftCollections),
                    'Trilhas atualizadas.',
                  )
                }
              >
                Salvar
              </Button>
            </>
          }
        >
          <CollectionPicker
            userId={viewerId}
            value={draftCollections}
            onChange={setDraftCollections}
            disabled={busy}
          />
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
          <p className="post-card__quote">{project?.pitch ?? post.learned}</p>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
