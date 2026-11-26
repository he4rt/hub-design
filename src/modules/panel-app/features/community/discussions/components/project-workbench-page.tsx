import { useState, type CSSProperties } from 'react'
import { Link } from 'react-router'
import { Check, ChevronDown, FileText } from 'lucide-react'
import { FormMessage } from '@/components/form-message'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useNow } from '@/hooks/use-now'
import { formatDay, formatRelative } from '@/lib/dates'
import { useDb, type Discussion, type MemberProject } from '@/mocks/db'
import { MemberLink } from '@/modules/panel-app/components/member-link'
import { useSolutionAction } from '../hooks/use-solution-action'
import { languageColor, REQUEST_STATUS, requestStatus } from '../lib/project-entries'
import { ProjectDocuments } from './project-documents'
import { ReplyForm } from './reply-form'
import { SignInPrompt } from './sign-in-prompt'
import './project-workbench-page.css'

const FEEDBACK_TEMPLATE = 'O que funcionou:\nO que melhorar:\nPor quê:'

/**
 * Prototype "Workbench" of a project page: the request is the work on the bench. Its title leads, its
 * state moves from open to resolved, and the feedback thread is the main column. The project is a
 * reference beside it, with the documents folded until someone needs them.
 */
export function ProjectWorkbenchPage({ discussion, project }: { discussion: Discussion; project: MemberProject }) {
  const now = useNow()
  const sessionUserId = useDb((state) => state.session?.userId ?? null)
  const otherRequests = useDb((state) => state.discussions).filter(
    (other) => other.id !== discussion.id && other.context?.type === 'post' && other.context.id === discussion.context?.id,
  )
  const [solution, submitSolution, solutionPending] = useSolutionAction(discussion.id)
  const [documentsOpen, setDocumentsOpen] = useState(false)
  const status = requestStatus(discussion)
  const owner = sessionUserId === discussion.authorId
  const firstOther = discussion.replies.find((reply) => reply.authorId !== discussion.authorId)
  const steps = [
    { label: 'Pedido aberto', done: true, at: discussion.createdAt },
    { label: 'Primeiro retorno', done: !!firstOther, at: firstOther?.createdAt },
    { label: 'Resolvido', done: status === 'resolved', at: undefined },
  ]

  return (
    <article className="project-workbench-page" style={{ '--lang': languageColor(project.read.language) } as CSSProperties}>
      <Link to="/app/discussions?view=workbench" className="project-workbench-page__back">Voltar ao Workbench</Link>

      <header className="project-workbench-page__header">
        <p className="project-workbench-page__state">
          <Badge variant={REQUEST_STATUS[status].variant}>{REQUEST_STATUS[status].label}</Badge>
          <time dateTime={discussion.createdAt} title={formatDay(discussion.createdAt)}>pedido {formatRelative(discussion.createdAt, now)}</time>
        </p>
        <h1>{discussion.title}</h1>
        <MemberLink userId={discussion.authorId} caption={`pede retorno em ${project.read.name}`} />
      </header>

      <ol className="project-workbench-page__steps" aria-label="Andamento do pedido">
        {steps.map((step) => (
          <li key={step.label} data-done={step.done || undefined}>
            <span className="project-workbench-page__step-mark" aria-hidden>{step.done && <Check size={12} />}</span>
            <span className="project-workbench-page__step-label">{step.label}</span>
            {step.at && <time dateTime={step.at}>{formatDay(step.at)}</time>}
          </li>
        ))}
      </ol>

      <div className="project-workbench-page__body">
        <div className="project-workbench-page__main">
          <section className="project-workbench-page__ask" aria-labelledby="workbench-ask-title">
            <h2 id="workbench-ask-title">O pedido</h2>
            <p>{discussion.body}</p>
          </section>

          <section className="project-workbench-page__thread" aria-labelledby="workbench-thread-title">
            <h2 id="workbench-thread-title">
              Retornos <span className="project-workbench-page__count">{discussion.replies.length}</span>
            </h2>
            {discussion.replies.length === 0 ? (
              <p className="project-workbench-page__muted">Ninguém olhou ainda. Um retorno curto e concreto já ajuda.</p>
            ) : (
              <form action={submitSolution}>
                <ol className="project-workbench-page__replies">
                  {discussion.replies.map((reply) => {
                    const solved = reply.id === discussion.solvedReplyId
                    return (
                      <li key={reply.id} className="project-workbench-page__reply" data-solved={solved || undefined}>
                        <header>
                          <MemberLink userId={reply.authorId} caption={reply.authorId === discussion.authorId ? 'quem pediu' : undefined} />
                          <time dateTime={reply.createdAt} title={formatDay(reply.createdAt)}>{formatRelative(reply.createdAt, now)}</time>
                        </header>
                        <p>{reply.body}</p>
                        {(solved || owner) && (
                          <footer>
                            {solved && <Badge variant="success">Resolveu o pedido</Badge>}
                            {owner && (
                              <Button type="submit" name="replyId" value={solved ? '' : reply.id} variant="ghost" size="sm" loading={solutionPending}>
                                {solved ? 'Reabrir pedido' : 'Resolveu meu pedido'}
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
          </section>

          <section className="project-workbench-page__compose" aria-label="Dar retorno">
            {sessionUserId ? (
              <ReplyForm key={discussion.id} discussionId={discussion.id} label="Seu retorno" placeholder={FEEDBACK_TEMPLATE} />
            ) : (
              <SignInPrompt>Entre na sua conta para dar retorno.</SignInPrompt>
            )}
          </section>
        </div>

        <aside className="project-workbench-page__reference" aria-label="Referência do projeto">
          <section>
            <h2>Projeto</h2>
            <a href={project.repository.url} target="_blank" rel="noreferrer" className="project-workbench-page__repo" title={project.repository.fullName}>
              {project.repository.fullName}
            </a>
            {project.read.language && <p className="project-workbench-page__language">{project.read.language}</p>}
            <p className="project-workbench-page__pitch">{project.pitch}</p>
          </section>
          <Collapsible open={documentsOpen} onOpenChange={setDocumentsOpen} className="project-workbench-page__documents">
            <CollapsibleTrigger asChild>
              <Button variant="secondary" size="sm">
                <FileText size={16} aria-hidden /> {documentsOpen ? 'Fechar documentos' : 'Ler documentos'} <ChevronDown size={16} aria-hidden />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <ProjectDocuments key={project.id} project={project} own={project.userId === sessionUserId} />
            </CollapsibleContent>
          </Collapsible>
          {otherRequests.length > 0 && (
            <section>
              <h2>Outros pedidos deste projeto</h2>
              <ul className="project-workbench-page__others">
                {otherRequests.map((other) => (
                  <li key={other.id}>
                    <Link to={`/app/discussions/${other.id}?view=workbench`} title={other.title}>{other.title}</Link>
                    <span>{REQUEST_STATUS[requestStatus(other)].label}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </article>
  )
}
