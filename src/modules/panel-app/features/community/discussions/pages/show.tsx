import { useActionState, useState, useSyncExternalStore } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { CheckCircle2, ChevronDown, FileText, LifeBuoy, MessagesSquare } from 'lucide-react'
import { MemberProjectPreview } from '@/components/member-project-preview'
import { FormMessage } from '@/components/form-message'
import { NotFound } from '@/components/not-found'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useDebugActions } from '@/debug/use-debug-actions'
import { useNow } from '@/hooks/use-now'
import { db, useDb } from '@/mocks/db'
import { errorMessage } from '@/mocks/mock-action'
import { MemberLink } from '@/modules/panel-app/components/member-link'
import { formatDay, formatRelative } from '@/lib/dates'
import { formatPostDate } from '@/lib/feed-post'
import { categoryLabels, discussionContext } from '@/modules/panel-app/lib/discussions'
import { setDiscussionSolution } from '../actions'
import { ReplyForm } from '../components/reply-form'
import { ProjectDocuments } from '../components/project-documents'
import { SignInPrompt } from '../components/sign-in-prompt'
import './show.css'

/** A discussion and its replies. Personal-project conversations are for members, not public-profile visitors. */
export default function DiscussionShow() {
  const { discussionId } = useParams()
  const navigate = useNavigate()
  const now = useNow()
  const discussion = useDb((state) => state.discussions.find((candidate) => candidate.id === discussionId))
  const squads = useDb((state) => state.squads)
  const projects = useDb((state) => state.projects)
  const memberProjects = useDb((state) => state.memberProjects)
  const posts = useDb((state) => state.feedPosts)
  const users = useDb((state) => state.users)
  const sessionUserId = useDb((state) => state.session?.userId ?? null)
  const authorName = useDb((state) => state.users.find((user) => user.id === discussion?.authorId)?.name)
  const linkedPost = discussion?.context?.type === 'post' ? posts.find((post) => post.id === discussion.context?.id) : undefined
  const memberProject = memberProjects.find((project) => project.id === linkedPost?.projectId)
  const [documentsOpen, setDocumentsOpen] = useState(false)
  const wide = useSyncExternalStore(
    (notify) => {
      const query = window.matchMedia('(min-width: 1100px)')
      query.addEventListener('change', notify)
      return () => query.removeEventListener('change', notify)
    },
    () => window.matchMedia('(min-width: 1100px)').matches,
  )
  const [solutionResult, submitSolution, solutionPending] = useActionState(
    async (_previous: { ok: boolean; message: string } | null, data: FormData) => {
      try {
        const replyId = String(data.get('replyId') ?? '') || null
        await setDiscussionSolution({ discussionId: discussionId!, replyId })
        return { ok: true, message: replyId ? 'Solução marcada.' : 'Solução desmarcada.' }
      } catch (error) {
        return { ok: false, message: errorMessage(error) }
      }
    },
    null,
  )

  useDebugActions('Discussão', [
    { label: 'Abrir discussão com resposta que resolveu', run: () => navigate('/app/discussions/t1') },
    { label: 'Abrir discussão sem resposta', run: () => navigate('/app/discussions/t4') },
    { label: 'Abrir discussão inexistente', run: () => navigate('/app/discussions/nao-existe') },
    { label: 'Ver dúvida de projeto com documentos', run: () => navigate('/app/discussions/project-help-pp1') },
    { label: 'Ver dúvida de projeto sem documentos de produto', run: () => navigate('/app/discussions/project-help-pp3') },
    {
      label: 'Gerar 20 respostas',
      run: () => db.set((state) => ({
        ...state,
        discussions: state.discussions.map((item) => item.id === discussionId ? {
          ...item,
          replies: [...item.replies, ...Array.from({ length: 20 }, (_, index) => ({
            id: crypto.randomUUID(), authorId: state.session?.userId ?? item.authorId,
            body: `Sugestão ${index + 1}: comece isolando a consulta e compare o resultado com um caso conhecido.`,
            createdAt: new Date().toISOString(),
          }))],
        } : item),
      })),
    },
    {
      label: 'Ver como visitante',
      description: 'Remove a sessão de membro.',
      run: () => db.set((state) => ({ ...state, session: null })),
    },
    {
      label: 'Entrar para responder',
      description: 'Use ana@he4rt.dev e a senha "password"; o login volta para esta discussão.',
      run: () => navigate(`/app/login?redirect=${encodeURIComponent(`/app/discussions/${discussionId}`)}`),
    },
  ])

  if (!discussion) return <NotFound />

  const context = discussionContext(discussion, { squads, projects, posts, users, memberProjects })
  const firstName = authorName?.split(' ')[0] ?? 'o autor'

  return (
    <div className="discussion-show" data-project={!!memberProject || undefined}>
      <Link to="/app/discussions" className="discussion-show__back">
        Voltar ao Fórum
      </Link>

      <header className="discussion-show__header">
        <p className="discussion-show__tags">
          <Badge>{categoryLabels[discussion.category]}</Badge>
          {memberProject && <span className="discussion-show__audience">{linkedPost?.sharedOnFeed ? 'Só para membros' : 'Só você'}</span>}
          {discussion.solvedReplyId && (
            <Badge variant="success">Resolvida</Badge>
          )}
        </p>
        <h1>{discussion.title}</h1>
        <MemberLink userId={discussion.authorId} caption={`abriu em ${formatDay(discussion.createdAt)}`} />
      </header>

      {context && !memberProject && (
        <Card variant="inset" className="discussion-show__context">
          <span>{context.kind}</span>
          {context.path ? (
            <Link to={context.path} title={context.label}>
              {context.label}
            </Link>
          ) : (
            <span title={context.label}>{context.label}</span>
          )}
        </Card>
      )}

      <div className="discussion-show__workspace">
        {memberProject && (
          <aside className="discussion-show__project" aria-label="Contexto do projeto">
            <MemberProjectPreview project={memberProject} />
            <p className="discussion-show__pitch">{memberProject.pitch}</p>
            <Collapsible open={wide || documentsOpen} onOpenChange={setDocumentsOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="secondary" className="discussion-show__documents-toggle">
                  <FileText size={16} aria-hidden /> Documentos do projeto <ChevronDown size={16} aria-hidden />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="discussion-show__documents">
                <ProjectDocuments key={memberProject.id} project={memberProject} own={memberProject.userId === sessionUserId} />
                <p className="discussion-show__read">Leitura simulada em {formatPostDate(memberProject.readAt)}. Não sincroniza com o GitHub.</p>
              </CollapsibleContent>
            </Collapsible>
          </aside>
        )}
        <div className="discussion-show__conversation">
          <Card className="discussion-show__post">
            {memberProject && <h2><LifeBuoy size={18} aria-hidden /> A dúvida</h2>}
            <p>{discussion.body}</p>
          </Card>

          {memberProject && sessionUserId && <Card><ReplyForm key={discussion.id} discussionId={discussion.id} /></Card>}

          <section className="discussion-show__replies" aria-labelledby="replies-title">
            <h2 id="replies-title">
              {memberProject && <MessagesSquare size={18} aria-hidden />}
              {discussion.replies.length === 0
                ? 'Ainda sem resposta'
                : discussion.replies.length === 1
                  ? '1 resposta'
                  : `${discussion.replies.length} respostas`}
            </h2>
            {discussion.replies.length > 0 && (
              <form action={submitSolution} className="discussion-show__solutions">
              <ol className="discussion-show__reply-list">
                {discussion.replies.map((reply) => (
                  <li key={reply.id}>
                    <article
                      className="discussion-show__reply"
                      data-solved={reply.id === discussion.solvedReplyId || undefined}
                    >
                      <header>
                        <MemberLink
                          userId={reply.authorId}
                          caption={reply.authorId === discussion.authorId ? 'autor da discussão' : undefined}
                        />
                        <time dateTime={reply.createdAt} title={formatDay(reply.createdAt)}>
                          {formatRelative(reply.createdAt, now)}
                        </time>
                      </header>
                      <p>{reply.body}</p>
                      <p className="discussion-show__solved-note" aria-live="polite">
                        {reply.id === discussion.solvedReplyId && <>
                          <CheckCircle2 size={14} aria-hidden />
                          {firstName} marcou esta resposta como a que resolveu.
                        </>}
                      </p>
                      {sessionUserId === discussion.authorId && (
                        <Button
                          type="submit"
                          name="replyId"
                          value={reply.id === discussion.solvedReplyId ? '' : reply.id}
                          variant="secondary"
                          size="sm"
                          loading={solutionPending}
                          className="discussion-show__solution-button"
                        >
                          {reply.id === discussion.solvedReplyId ? 'Desmarcar solução' : 'Marcar como solução'}
                        </Button>
                      )}
                    </article>
                  </li>
                ))}
              </ol>
              {sessionUserId === discussion.authorId && (
                <FormMessage tone={solutionResult?.ok === false ? 'error' : 'success'}>
                  {solutionResult?.message}
                </FormMessage>
              )}
              </form>
            )}

            {!memberProject && (sessionUserId ? (
              <Card>
                <ReplyForm key={discussion.id} discussionId={discussion.id} />
              </Card>
            ) : (
              <SignInPrompt>Entre na sua conta para responder.</SignInPrompt>
            ))}
          </section>
        </div>
      </div>
    </div>
  )
}
