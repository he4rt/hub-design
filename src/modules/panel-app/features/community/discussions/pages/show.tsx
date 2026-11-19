import { Link, useNavigate, useParams } from 'react-router'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { NotFound } from '@/components/not-found'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { useDebugActions } from '@/debug/use-debug-actions'
import { useNow } from '@/hooks/use-now'
import { db, useDb } from '@/mocks/db'
import { MemberLink } from '@/modules/panel-app/components/member-link'
import { formatDay, formatRelative } from '@/modules/panel-app/lib/dates'
import { categoryLabels, discussionContext } from '@/modules/panel-app/lib/discussions'
import { ReplyForm } from '../components/reply-form'
import { SignInPrompt } from '../components/sign-in-prompt'
import './show.css'

/** A discussion: the opening post, its context, and the replies. Anyone reads; answering needs an account. */
export default function DiscussionShow() {
  const { discussionId } = useParams()
  const navigate = useNavigate()
  const now = useNow()
  const discussion = useDb((state) => state.discussions.find((candidate) => candidate.id === discussionId))
  const squads = useDb((state) => state.squads)
  const projects = useDb((state) => state.projects)
  const posts = useDb((state) => state.feedPosts)
  const users = useDb((state) => state.users)
  const sessionUserId = useDb((state) => state.session?.userId ?? null)
  const authorName = useDb((state) => state.users.find((user) => user.id === discussion?.authorId)?.name)

  useDebugActions('Discussão', [
    { label: 'Abrir discussão com resposta que resolveu', run: () => navigate('/app/discussions/t1') },
    { label: 'Abrir discussão sem resposta', run: () => navigate('/app/discussions/t4') },
    { label: 'Abrir discussão inexistente', run: () => navigate('/app/discussions/nao-existe') },
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

  const context = discussionContext(discussion, { squads, projects, posts, users })
  const firstName = authorName?.split(' ')[0] ?? 'o autor'

  return (
    <div className="discussion-show">
      <Link to="/app/discussions" className="discussion-show__back">
        <ArrowLeft size={14} aria-hidden />
        Fórum
      </Link>

      <header className="discussion-show__header">
        <p className="discussion-show__tags">
          <Badge>{categoryLabels[discussion.category]}</Badge>
          {discussion.solvedReplyId && (
            <span className="discussion-show__solved">
              <CheckCircle2 size={14} aria-hidden />
              Resolvida
            </span>
          )}
        </p>
        <h1>{discussion.title}</h1>
        <MemberLink userId={discussion.authorId} caption={`abriu em ${formatDay(discussion.createdAt)}`} />
      </header>

      {context && (
        <p className="discussion-show__context">
          <span>{context.kind}:</span>
          {context.path ? (
            <Link to={context.path} title={context.label}>
              {context.label}
            </Link>
          ) : (
            <span title={context.label}>{context.label}</span>
          )}
        </p>
      )}

      <Card className="discussion-show__post">
        <p>{discussion.body}</p>
      </Card>

      <section className="discussion-show__replies" aria-labelledby="replies-title">
        <h2 id="replies-title">
          {discussion.replies.length === 0
            ? 'Ainda sem resposta'
            : discussion.replies.length === 1
              ? '1 resposta'
              : `${discussion.replies.length} respostas`}
        </h2>
        {discussion.replies.length > 0 && (
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
                  {reply.id === discussion.solvedReplyId && (
                    <p className="discussion-show__solved-note">
                      <CheckCircle2 size={14} aria-hidden />
                      {firstName} marcou esta resposta como a que resolveu.
                    </p>
                  )}
                </article>
              </li>
            ))}
          </ol>
        )}

        {sessionUserId ? (
          <Card>
            <ReplyForm discussionId={discussion.id} />
          </Card>
        ) : (
          <SignInPrompt>Entre na sua conta para responder.</SignInPrompt>
        )}
      </section>
    </div>
  )
}
