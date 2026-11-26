import { useActionState, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import type { MDXEditorMethods } from '@mdxeditor/editor'
import { FormMessage } from '@/components/form-message'
import { NotFound } from '@/components/not-found'
import { Button } from '@/components/ui/button'
import { useDebugActions } from '@/debug/use-debug-actions'
import { useDb } from '@/mocks/db'
import { errorMessage } from '@/mocks/mock-action'
import { MemberLink } from '@/modules/panel-app/components/member-link'
import { replyToDiscussion } from '../actions'
import { FeedbackDialog } from '../components/feedback-dialog'
import { MarkdownEditor } from '../components/markdown-editor'
import { SignInPrompt } from '../components/sign-in-prompt'
import { feedbackTemplate, sameAsTemplate, type FeedbackTemplate } from '../lib/feedback-templates'
import './feedback.css'

/**
 * Prototype: writing a feedback on a project, on its own page. The chosen model opens in an editor
 * that renders Markdown while you type; publishing is the reply the Forum already stores.
 */
export default function DiscussionFeedback() {
  const { discussionId } = useParams()
  const [params] = useSearchParams()
  const template = feedbackTemplate(params.get('modelo'))
  const discussion = useDb((state) => state.discussions.find((candidate) => candidate.id === discussionId))
  const posts = useDb((state) => state.feedPosts)
  const memberProjects = useDb((state) => state.memberProjects)
  const signedIn = useDb((state) => state.session !== null)
  const post = discussion?.context?.type === 'post' ? posts.find((p) => p.id === discussion.context?.id) : undefined
  const project = memberProjects.find((p) => p.id === post?.projectId)

  if (!discussion) return <NotFound />
  const back = `/app/discussions/${discussion.id}?view=showcase`

  return (
    <div className="discussion-feedback">
      <Link to={back} className="discussion-feedback__back">Voltar ao projeto</Link>
      <header className="discussion-feedback__header">
        <h1>Seu retorno{project ? ` em ${project.read.name}` : ''}</h1>
        <div className="discussion-feedback__ask">
          <MemberLink userId={discussion.authorId} caption="quer saber" />
          <p className="discussion-feedback__ask-title">{discussion.title}</p>
          <p>{discussion.body}</p>
        </div>
      </header>
      {signedIn ? (
        // A new model starts a new draft: the editor reads its initial text once.
        <FeedbackDraft key={template.id} discussionId={discussion.id} template={template} back={back} />
      ) : (
        <SignInPrompt>Entre na sua conta para dar um retorno.</SignInPrompt>
      )}
    </div>
  )
}

function FeedbackDraft({ discussionId, template, back }: { discussionId: string; template: FeedbackTemplate; back: string }) {
  const navigate = useNavigate()
  const editorRef = useRef<MDXEditorMethods>(null)
  const [body, setBody] = useState<string>(template.body)
  const [choosing, setChoosing] = useState(false)
  const untouched = sameAsTemplate(body, template)

  const [result, publish, pending] = useActionState(async (): Promise<{ error: string } | null> => {
    try {
      await replyToDiscussion({ discussionId, body })
      navigate(`${back}#retornos`, { viewTransition: true })
      return null
    } catch (error) {
      return { error: errorMessage(error) }
    }
  }, null)

  function fill(markdown: string) {
    editorRef.current?.setMarkdown(markdown)
    setBody(markdown)
  }

  useDebugActions('Retorno', [
    {
      label: 'Preencher retorno construtivo',
      run: () => fill('## O que funcionou\n\nA agenda por profissional é clara.\n\n## O que melhorar\n\n- Separar **cancelamento tardio** de falta.\n\n## Por quê\n\nHoje as duas coisas contam igual na métrica.'),
    },
    { label: 'Preencher retorno curto (erro esperado)', run: () => fill('Curti!') },
    { label: 'Trocar modelo', run: () => setChoosing(true) },
  ])

  return (
    <form action={publish} className="discussion-feedback__form">
      <div className="discussion-feedback__bar">
        <p id="feedback-editor-label">
          Modelo: <strong>{template.label}</strong>
        </p>
        <Button type="button" variant="ghost" size="sm" onClick={() => setChoosing(true)}>Trocar modelo</Button>
      </div>
      <MarkdownEditor
        editorRef={editorRef}
        initialMarkdown={template.body}
        onChange={setBody}
        readOnly={pending}
        labelledBy="feedback-editor-label"
        placeholder="Escreva aqui. Digite ## para um título, - para uma lista, ** para negrito."
      />
      <p className="discussion-feedback__hint">
        {untouched && template.body
          ? 'Escreva por cima das frases do modelo com o que você viu. O texto passa pela moderação automática.'
          : 'O texto passa pela moderação automática.'}
      </p>
      <footer className="discussion-feedback__footer">
        <FormMessage tone="error">{!pending && result?.error}</FormMessage>
        <Button variant="secondary" asChild><Link to={back}>Cancelar</Link></Button>
        <Button type="submit" loading={pending} disabled={untouched || !body.trim()}>Publicar retorno</Button>
      </footer>
      <FeedbackDialog discussionId={discussionId} open={choosing} onOpenChange={setChoosing} initialTemplate={template.id} replacing />
    </form>
  )
}
