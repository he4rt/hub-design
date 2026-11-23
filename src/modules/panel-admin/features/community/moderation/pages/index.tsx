import { useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router'
import { Field } from '@/components/field'
import { FormMessage } from '@/components/form-message'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useDebugActions } from '@/debug/use-debug-actions'
import { useActionRunner } from '@/hooks/use-action-runner'
import { formatFullDate } from '@/lib/feed-post'
import { db, type FeedComment, type FeedPost, type MockDb, useDb } from '@/mocks/db'
import { useAdmin } from '@/modules/panel-admin/hooks/use-admin'
import { removeComment, removePost } from '../actions'
import './index.css'

const TABS = ['publicacoes', 'comentarios', 'removidos'] as const
type Tab = (typeof TABS)[number]
type Target = { kind: 'post' | 'comment'; id: string }
const MIN_REASON = 20

function postText(state: MockDb, post: FeedPost) {
  return state.memberProjects.find((p) => p.id === post.projectId)?.pitch ?? post.learned
}

/**
 * Manual moderation of the Feed. Removing needs a reason: the author reads it in place of the text,
 * the other members just stop seeing it, and who removed it stays here, with the administration.
 */
export default function Index() {
  const admin = useAdmin()
  const state = useDb((s) => s)
  const [params, setParams] = useSearchParams()
  const tab: Tab = TABS.find((t) => t === params.get('aba')) ?? 'publicacoes'
  const { run, pending, error, success } = useActionRunner()
  const [target, setTarget] = useState<Target | null>(null)
  const [reason, setReason] = useState('')
  const name = (id: string) => state.users.find((u) => u.id === id)?.name ?? 'Membro removido'

  const posts = state.feedPosts
    .filter((p) => p.sharedOnFeed && p.deletedAt === null)
    .toSorted((a, b) => b.createdAt.localeCompare(a.createdAt))
  const comments = state.feedComments
    .filter((c) => c.deletedAt === null && posts.some((p) => p.id === c.postId))
    .toSorted((a, b) => b.createdAt.localeCompare(a.createdAt))
  const removed = [
    ...state.feedPosts.filter((p) => p.removal).map((p) => ({ kind: 'Publicação', id: p.id, userId: p.userId, text: postText(state, p), removal: p.removal! })),
    ...state.feedComments.filter((c) => c.removal).map((c) => ({ kind: 'Comentário', id: c.id, userId: c.userId, text: c.body, removal: c.removal! })),
  ].toSorted((a, b) => b.removal.removedAt.localeCompare(a.removal.removedAt))

  function open(next: Target) {
    setReason('')
    setTarget(next)
  }

  function confirm() {
    if (!target || !admin) return
    const action = target.kind === 'post' ? removePost : removeComment
    run(async () => {
      await action(admin.id, target.id, reason)
      setTarget(null)
    }, target.kind === 'post' ? 'Publicação removida. O autor vê o motivo.' : 'Comentário removido. O autor vê o motivo.')
  }

  useDebugActions('Moderação', [
    {
      label: 'Abrir remoção da publicação mais recente',
      run: () => posts[0] && open({ kind: 'post', id: posts[0].id }),
    },
    {
      label: 'Preencher motivo válido',
      run: () => setReason('A publicação expõe dados pessoais de um cliente. Publique de novo sem nomes e contatos.'),
    },
    {
      label: 'Remover com motivo curto (erro esperado)',
      run: () => admin && posts[0] && run(() => removePost(admin.id, posts[0].id, 'Spam.')),
    },
    { label: 'Feed sem publicações', run: () => db.set((s) => ({ ...s, feedPosts: [] })) },
  ])

  const kindLabel = target?.kind === 'comment' ? 'comentário' : 'publicação'

  return (
    <div className="moderation">
      <div className="moderation__head">
        <PageHeader
          title="Moderação"
          description="Publicações e comentários do Feed. Remover pede motivo: o autor lê o motivo, os outros membros só deixam de ver."
        />
        <FormMessage tone={error ? 'error' : 'success'}>{error ?? success}</FormMessage>
      </div>
      <Tabs value={tab} onValueChange={(value) => setParams({ aba: value }, { replace: true })}>
        <TabsList>
          <TabsTrigger value="publicacoes">Publicações ({posts.length})</TabsTrigger>
          <TabsTrigger value="comentarios">Comentários ({comments.length})</TabsTrigger>
          <TabsTrigger value="removidos">Removidos ({removed.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="publicacoes">
          <Card>
            {posts.length === 0 ? (
              <p className="moderation__muted">Nenhuma publicação no Feed.</p>
            ) : (
              <ul className="moderation__list">
                {posts.map((p) => (
                  <ModerationItem key={p.id} author={name(p.userId)} at={p.createdAt} text={postText(state, p)}>
                    <Button size="sm" variant="danger" disabled={pending} onClick={() => open({ kind: 'post', id: p.id })}>
                      Remover
                    </Button>
                  </ModerationItem>
                ))}
              </ul>
            )}
          </Card>
        </TabsContent>
        <TabsContent value="comentarios">
          <Card>
            {comments.length === 0 ? (
              <p className="moderation__muted">Nenhum comentário no Feed.</p>
            ) : (
              <ul className="moderation__list">
                {comments.map((c: FeedComment) => (
                  <ModerationItem
                    key={c.id}
                    author={name(c.userId)}
                    at={c.createdAt}
                    text={c.body}
                    context={`Na publicação de ${name(posts.find((p) => p.id === c.postId)?.userId ?? '')}.`}
                  >
                    <Button size="sm" variant="danger" disabled={pending} onClick={() => open({ kind: 'comment', id: c.id })}>
                      Remover
                    </Button>
                  </ModerationItem>
                ))}
              </ul>
            )}
          </Card>
        </TabsContent>
        <TabsContent value="removidos">
          <Card>
            {removed.length === 0 ? (
              <p className="moderation__muted">Nada removido pela moderação.</p>
            ) : (
              <ul className="moderation__list">
                {removed.map((r) => (
                  <ModerationItem
                    key={r.id}
                    author={`${r.kind} de ${name(r.userId)}`}
                    at={r.removal.removedAt}
                    text={r.text}
                    context={`Removido por ${name(r.removal.removedBy)}. Motivo: ${r.removal.reason}`}
                  />
                ))}
              </ul>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={target !== null} onOpenChange={(next) => !next && !pending && setTarget(null)}>
        <DialogContent
          title={`Remover ${kindLabel}`}
          description={`${target?.kind === 'comment' ? 'O autor vê o comentário removido' : 'O autor vê a publicação removida'} e o motivo, sem saber quem removeu. Os outros membros só deixam de ver.`}
          footer={
            <>
              <Button variant="secondary" disabled={pending} onClick={() => setTarget(null)}>
                Cancelar
              </Button>
              <Button variant="danger" loading={pending} disabled={reason.trim().length < MIN_REASON} onClick={confirm}>
                Remover
              </Button>
            </>
          }
        >
          <Field id="removal-reason" label="Motivo" required hint={`Ao menos ${MIN_REASON} caracteres. Diga o que fere a regra e como publicar de novo.`}>
            <Textarea id="removal-reason" rows={4} value={reason} disabled={pending} onChange={(e) => setReason(e.target.value)} />
          </Field>
          <FormMessage tone="error">{target ? error : null}</FormMessage>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ModerationItem({
  author,
  at,
  text,
  context,
  children,
}: {
  author: string
  at: string
  text: string
  context?: string
  children?: ReactNode
}) {
  return (
    <li className="moderation__item">
      <div className="moderation__text">
        <p className="moderation__meta">
          <span title={author}>{author}</span>
          <time dateTime={at}>{formatFullDate(at)}</time>
        </p>
        <p className="moderation__body">{text}</p>
        {context && <p className="moderation__muted">{context}</p>}
      </div>
      {children}
    </li>
  )
}
