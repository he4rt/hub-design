import { useActionState, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { FormMessage } from '@/components/form-message'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Combobox, type ComboboxOption } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioCard, RadioCards } from '@/components/ui/radio-cards'
import { Textarea } from '@/components/ui/textarea'
import { useDebugActions } from '@/debug/use-debug-actions'
import { db, useDb, type DiscussionCategory, type DiscussionContext } from '@/mocks/db'
import { MockError, errorMessage } from '@/mocks/mock-action'
import { categoryLabels } from '@/modules/panel-app/lib/discussions'
import { canLinkPost, createDiscussion } from '../actions'
import { SignInPrompt } from '../components/sign-in-prompt'
import './create.css'

const CATEGORY_HINTS: Record<DiscussionCategory, string> = {
  question: 'Algo travou e você quer ajuda para entender.',
  technical: 'Uma decisão de código ou de projeto para alinhar com o time.',
  learning: 'Como estudar, registrar o que aprendeu e evoluir.',
}

type Result = { ok: false; error: string; field?: string } | null

/** `project:p1` ⇄ `{ type: 'project', id: 'p1' }`, so one picker holds squads, projects, and publications. */
const encode = (context: DiscussionContext) => `${context.type}:${context.id}`
function decode(value: string | null): DiscussionContext | null {
  if (!value) return null
  const [type, id] = value.split(':') as [DiscussionContext['type'], string]
  return { type, id }
}

function initialContext(params: URLSearchParams): string | null {
  const post = params.get('post')
  const project = params.get('project')
  const squad = params.get('squad')
  if (post) return encode({ type: 'post', id: post })
  if (project) return encode({ type: 'project', id: project })
  if (squad) return encode({ type: 'squad', id: squad })
  return null
}

/** Opens a discussion, optionally about a squad, a project, or one of the member's own publications. */
export default function DiscussionCreate() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const sessionUserId = useDb((state) => state.session?.userId ?? null)
  const squads = useDb((state) => state.squads)
  const projects = useDb((state) => state.projects)
  const posts = useDb((state) => state.feedPosts)

  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<DiscussionCategory | null>(null)
  const [contextValue, setContextValue] = useState<string | null>(() => initialContext(params))
  const [body, setBody] = useState('')

  // The same rule as the action: only the member's own publications others can read can be linked.
  const options: ComboboxOption[] = [
    ...projects.map((project) => ({
      value: encode({ type: 'project', id: project.id }),
      label: `Projeto · ${project.name} (squad ${squads.find((squad) => squad.id === project.squadId)?.name ?? ''})`,
    })),
    ...squads.map((squad) => ({ value: encode({ type: 'squad', id: squad.id }), label: `Squad · ${squad.name}` })),
    ...posts
      .filter((post) => canLinkPost(sessionUserId, post))
      .toSorted((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((post) => ({ value: encode({ type: 'post', id: post.id }), label: `Minha publicação · ${post.learned}` })),
  ]
  const context = options.some((option) => option.value === contextValue) ? contextValue : null

  const [result, submit, pending] = useActionState(async (): Promise<Result> => {
    try {
      const { id } = await createDiscussion({ title, category, body, context: decode(context) })
      navigate(`/app/discussions/${id}`)
      return null
    } catch (e) {
      return { ok: false, error: errorMessage(e), field: e instanceof MockError ? e.field : undefined }
    }
  }, null)
  const invalid = (field: string) => (result?.field === field ? true : undefined)

  useDebugActions('Nova discussão', [
    {
      label: 'Preencher com dados válidos',
      run: () => {
        setTitle('Como rodar os testes da loja sem subir o Docker?')
        setCategory('question')
        setContextValue(encode({ type: 'project', id: 'p1' }))
        setBody('Quero rodar só os testes de frete no meu notebook, que tem pouca memória para o Docker. Dá para usar SQLite?')
      },
    },
    {
      label: 'Preencher com título curto (erro esperado)',
      run: () => {
        setTitle('Ajuda')
        setCategory('question')
        setBody('Não consigo rodar o projeto e não sei por onde começar.')
      },
    },
    { label: 'Abrir a partir de uma publicação do diário', run: () => navigate('/app/discussions/new?post=j1') },
    { label: 'Abrir a partir de um projeto', run: () => navigate('/app/discussions/new?project=p1') },
    {
      label: 'Ver como visitante',
      description: 'Remove a sessão de membro.',
      run: () => db.set((state) => ({ ...state, session: null })),
    },
  ])

  return (
    <div className="discussion-create">
      <PageHeader
        title="Nova discussão"
        description="Pergunte, proponha ou conte o que está aprendendo. Quem lê o fórum não precisa de conta; quem escreve, sim."
      />

      {!sessionUserId && <SignInPrompt>Entre na sua conta para abrir uma discussão.</SignInPrompt>}

      <Card>
        <form action={submit} className="discussion-create__form">
          {/* A visitor sees the form as it is, but only a member fills it in. */}
          <fieldset disabled={!sessionUserId} className="discussion-create__fields">
            <div className="discussion-create__field">
              <Label htmlFor="discussion-title">Título</Label>
              <Input
                id="discussion-title"
                value={title}
                maxLength={120}
                aria-invalid={invalid('title')}
                onChange={(event) => setTitle(event.target.value)}
              />
            </div>

            <div className="discussion-create__field">
              <Label id="discussion-category-label">Categoria</Label>
              <RadioCards
                aria-labelledby="discussion-category-label"
                value={category ?? ''}
                onValueChange={(value) => setCategory(value as DiscussionCategory)}
                className="discussion-create__categories"
              >
                {(Object.keys(categoryLabels) as DiscussionCategory[]).map((value) => (
                  <RadioCard key={value} value={value} label={categoryLabels[value]} description={CATEGORY_HINTS[value]} />
                ))}
              </RadioCards>
            </div>

            <div className="discussion-create__field">
              <Label htmlFor="discussion-context">Relacionada a (opcional)</Label>
              <Combobox
                id="discussion-context"
                options={options}
                value={context}
                onValueChange={setContextValue}
                placeholder="Busque um squad, projeto ou publicação sua"
                emptyText="Nenhum squad, projeto ou publicação sua com esse nome."
                aria-invalid={invalid('context')}
                aria-describedby="discussion-context-hint"
              />
              <p id="discussion-context-hint" className="discussion-create__hint">
                Só você pode ligar uma discussão às suas publicações do diário.
              </p>
            </div>

            <div className="discussion-create__field">
              <Label htmlFor="discussion-body">Texto</Label>
              <Textarea
                id="discussion-body"
                rows={6}
                value={body}
                aria-invalid={invalid('body')}
                aria-describedby="discussion-body-hint"
                onChange={(event) => setBody(event.target.value)}
              />
              <p id="discussion-body-hint" className="discussion-create__hint">
                Conte o que você tentou e o que ainda não sabe.
              </p>
            </div>
          </fieldset>

          <FormMessage tone="error">{result?.error}</FormMessage>
          <div className="discussion-create__actions">
            <Button asChild variant="ghost">
              <Link to="/app/discussions">Cancelar</Link>
            </Button>
            <Button type="submit" loading={pending} disabled={!sessionUserId}>
              Publicar discussão
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
