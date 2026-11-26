import { useState, type CSSProperties } from 'react'
import { Link } from 'react-router'
import { CheckCircle2, ExternalLink, MessageSquarePlus } from 'lucide-react'
import { FormMessage } from '@/components/form-message'
import { Button } from '@/components/ui/button'
import { useDebugActions } from '@/debug/use-debug-actions'
import { useNow } from '@/hooks/use-now'
import { formatDay, formatRelative } from '@/lib/dates'
import { formatPostDate } from '@/lib/feed-post'
import { useDb, type Discussion, type MemberProject } from '@/mocks/db'
import { MemberLink } from '@/modules/panel-app/components/member-link'
import { useSolutionAction } from '../hooks/use-solution-action'
import { languageColor } from '../lib/project-entries'
import { FeedbackDialog } from './feedback-dialog'
import { MarkdownText } from './markdown-text'
import { ProjectDocuments } from './project-documents'
import { SignInPrompt } from './sign-in-prompt'
import './project-showcase-page.css'

/**
 * Prototype "Showcase" of a project page: the project is the piece on display. A cover and the pitch
 * open it, the repository documents are what you read, and the question the maker asked is a quiet
 * note beside them. Feedback comes last, as comments on the piece.
 */
export function ProjectShowcasePage({ discussion, project }: { discussion: Discussion; project: MemberProject }) {
  const now = useNow()
  const sessionUserId = useDb((state) => state.session?.userId ?? null)
  const maker = useDb((state) => state.users.find((user) => user.id === project.userId))
  const [solution, submitSolution, solutionPending] = useSolutionAction(discussion.id)
  const firstName = maker?.name.split(' ')[0] ?? 'Quem fez'
  const owner = sessionUserId === discussion.authorId
  const count = discussion.replies.length
  // Each opening starts the dialog fresh, at the choice of a model.
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [feedbackKey, setFeedbackKey] = useState(0)
  function openFeedback() {
    setFeedbackKey((key) => key + 1)
    setFeedbackOpen(true)
  }

  useDebugActions('Showcase', [{ label: 'Abrir o modal de retorno', run: openFeedback }])

  const excerpt = project.read.files.readme?.split('\n').find((line) => line.trim() && !line.startsWith('#')) ?? project.read.description

  return (
    <article className="project-showcase-page" style={{ '--lang': languageColor(project.read.language) } as CSSProperties}>
      <Link to="/app/discussions?view=showcase" className="project-showcase-page__back">Voltar ao Showcase</Link>

      <header className="project-showcase-page__hero">
        <div className="project-showcase-page__cover" aria-hidden>
          <span className="project-showcase-page__monogram">{project.read.name.slice(0, 2)}</span>
          {excerpt && <span className="project-showcase-page__excerpt">{excerpt}</span>}
        </div>
        <div className="project-showcase-page__intro">
          {project.read.language && <p className="project-showcase-page__language">{project.read.language}</p>}
          <h1>{project.read.name}</h1>
          <p className="project-showcase-page__pitch">{project.pitch}</p>
          <MemberLink userId={project.userId} caption={`mostrou em ${formatDay(project.createdAt)}`} />
          <div className="project-showcase-page__actions">
            <Button asChild>
              <a href={project.repository.url} target="_blank" rel="noreferrer">
                <ExternalLink size={16} aria-hidden /> Abrir no GitHub
              </a>
            </Button>
            {sessionUserId ? (
              <Button variant="secondary" onClick={openFeedback}>Deixar um retorno</Button>
            ) : (
              <Button variant="secondary" asChild><a href="#retornos">Deixar um retorno</a></Button>
            )}
          </div>
        </div>
      </header>

      <div className="project-showcase-page__body">
        <div className="project-showcase-page__reading">
          <ProjectDocuments key={project.id} project={project} own={project.userId === sessionUserId} />
          <p className="project-showcase-page__read">Leitura simulada em {formatPostDate(project.readAt)}. Não sincroniza com o GitHub.</p>
        </div>

        <aside className="project-showcase-page__side" aria-label="Sobre o projeto">
          <dl className="project-showcase-page__facts">
            <dt>Repositório</dt>
            <dd>
              <a href={project.repository.url} target="_blank" rel="noreferrer" className="project-showcase-page__repo" title={project.repository.fullName}>
                {project.repository.fullName}
              </a>
            </dd>
            {project.read.license && <><dt>Licença</dt><dd>{project.read.license}</dd></>}
            <dt>Último push</dt>
            <dd><time dateTime={project.read.pushedAt} title={formatDay(project.read.pushedAt)}>{formatRelative(project.read.pushedAt, now)}</time></dd>
            <dt>Retornos</dt>
            <dd className="project-showcase-page__count">{count === 0 ? 'Nenhum ainda' : count}</dd>
          </dl>
          <section className="project-showcase-page__ask">
            <h2>{firstName} quer saber</h2>
            <p className="project-showcase-page__ask-title">{discussion.title}</p>
            <p>{discussion.body}</p>
          </section>
        </aside>
      </div>

      <section id="retornos" className="project-showcase-page__feedback" aria-labelledby="showcase-feedback-title">
        <header className="project-showcase-page__feedback-header">
          <h2 id="showcase-feedback-title">Retornos</h2>
          {sessionUserId && (
            <Button variant="secondary" onClick={openFeedback}>
              <MessageSquarePlus size={16} aria-hidden /> Dar um retorno
            </Button>
          )}
        </header>
        {count === 0 ? (
          <p className="project-showcase-page__muted">Ninguém comentou ainda. Seja a primeira pessoa a dizer o que achou.</p>
        ) : (
          <form action={submitSolution}>
            <ol className="project-showcase-page__comments">
              {discussion.replies.map((reply) => {
                const solved = reply.id === discussion.solvedReplyId
                return (
                  <li key={reply.id} className="project-showcase-page__comment" data-solved={solved || undefined}>
                    <header>
                      <MemberLink userId={reply.authorId} caption={reply.authorId === discussion.authorId ? 'quem fez' : undefined} />
                      <time dateTime={reply.createdAt} title={formatDay(reply.createdAt)}>{formatRelative(reply.createdAt, now)}</time>
                    </header>
                    <MarkdownText>{reply.body}</MarkdownText>
                    {(solved || owner) && (
                      <footer>
                        {solved && <span className="project-showcase-page__solved"><CheckCircle2 size={14} aria-hidden /> Respondeu a dúvida de {firstName}</span>}
                        {owner && (
                          <Button type="submit" name="replyId" value={solved ? '' : reply.id} variant="ghost" size="sm" loading={solutionPending}>
                            {solved ? 'Desmarcar' : 'Respondeu minha dúvida'}
                          </Button>
                        )}
                      </footer>
                    )}
                  </li>
                )
              })}
            </ol>
            {owner && <FormMessage tone={solution?.ok === false ? 'error' : 'success'}>{solution?.message}</FormMessage>}
          </form>
        )}
        {sessionUserId ? (
          <FeedbackDialog key={feedbackKey} discussionId={discussion.id} open={feedbackOpen} onOpenChange={setFeedbackOpen} />
        ) : (
          <SignInPrompt>Entre na sua conta para deixar um retorno.</SignInPrompt>
        )}
      </section>
    </article>
  )
}
