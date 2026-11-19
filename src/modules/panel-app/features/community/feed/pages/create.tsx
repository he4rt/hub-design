import { useActionState, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { FormMessage } from '@/components/form-message'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { RadioCard, RadioCards } from '@/components/ui/radio-cards'
import { Textarea } from '@/components/ui/textarea'
import { useDebugActions } from '@/debug/use-debug-actions'
import { OBJECTIVE_PROGRESS } from '@/lib/feed-post'
import { labelOf, OBJECTIVES } from '@/lib/member-profile'
import type { ObjectiveProgress } from '@/mocks/db'
import { MockError, errorMessage } from '@/mocks/mock-action'
import { useAccount } from '@/modules/panel-app/hooks/use-account'
import { CollectionPicker } from '../components/collection-picker'
import { createPost, POST_TEXT_MAX, validatePost, type PostField, type PostInput } from '../actions'
import './create.css'

type Result = { errors: Partial<Record<PostField, string>>; message: string | null }

const NO_ERRORS: Result = { errors: {}, message: null }

const VALID_SAMPLE = {
  learned: 'Aprendi a usar transações no banco para que duas escritas aconteçam juntas ou nenhuma aconteça.',
  applied: 'Envolvi o cadastro de pedido e de itens numa transação no meu projeto da loja.',
}

export default function FeedCreate() {
  const account = useAccount()
  const navigate = useNavigate()
  const [learned, setLearned] = useState('')
  const [applied, setApplied] = useState('')
  const [progress, setProgress] = useState<ObjectiveProgress | null>(null)
  const [sharedOnFeed, setSharedOnFeed] = useState(true)
  const [shownOnProfile, setShownOnProfile] = useState(false)
  const [collectionIds, setCollectionIds] = useState<string[]>([])
  const [confirmingDiscard, setConfirmingDiscard] = useState(false)

  const input: PostInput = { learned, applied, objectiveProgress: progress, sharedOnFeed, shownOnProfile, collectionIds }

  const [result, submit, pending] = useActionState(async (): Promise<Result> => {
    if (!account) return NO_ERRORS
    const errors = validatePost(input)
    if (Object.keys(errors).length > 0) return { errors, message: null }
    try {
      await createPost(account.id, input)
      navigate(sharedOnFeed ? '/app' : '/app?view=mine', {
        state: { notice: { tone: 'success', text: 'Publicação adicionada.' } },
      })
      return NO_ERRORS
    } catch (e) {
      const field = e instanceof MockError ? (e.field as PostField | undefined) : undefined
      return field ? { errors: { [field]: errorMessage(e) }, message: null } : { errors: {}, message: errorMessage(e) }
    }
  }, NO_ERRORS)

  useDebugActions('Nova publicação', [
    {
      label: 'Preencher com dados válidos',
      run: () => {
        setLearned(VALID_SAMPLE.learned)
        setApplied(VALID_SAMPLE.applied)
        setProgress('a-lot')
      },
    },
    {
      label: 'Preencher com conteúdo ofensivo (barrado)',
      description: 'A moderação automática recusa e o texto continua no formulário.',
      run: () => {
        setLearned('Aprendi que quem não sabe Git é idiota.')
        setApplied(VALID_SAMPLE.applied)
        setProgress('little')
      },
    },
    {
      label: 'Preencher acima de 500 caracteres',
      run: () => {
        setLearned('Aprendi sobre filas. '.repeat(30))
        setApplied(VALID_SAMPLE.applied)
        setProgress('a-lot')
      },
    },
    { label: 'Só para mim (sem compartilhar)', run: () => setSharedOnFeed(false) },
    {
      label: 'Limpar formulário',
      run: () => {
        setLearned('')
        setApplied('')
        setProgress(null)
      },
    },
  ])

  if (!account) return null

  const dirty = learned.trim() !== '' || applied.trim() !== ''
  const objective = labelOf(OBJECTIVES, account.objective)

  return (
    <>
      <PageHeader title="Nova publicação" description="Registre o que você aprendeu no seu diário." />
      <Card className="post-form-card">
        <form action={submit} className="post-form" noValidate>
          <TextField
            id="learned"
            label="O que você aprendeu"
            value={learned}
            onChange={setLearned}
            error={result.errors.learned}
          />
          <TextField
            id="applied"
            label="Como você aplicou"
            value={applied}
            onChange={setApplied}
            error={result.errors.applied}
          />

          <fieldset className="post-form__field">
            <legend id="progress-label">
              Quanto isso aproximou você do objetivo
              {objective && <span className="post-form__objective"> · {objective}</span>}
            </legend>
            <RadioCards
              aria-labelledby="progress-label"
              aria-invalid={!!result.errors.objectiveProgress || undefined}
              value={progress ?? ''}
              onValueChange={(value) => setProgress(value as ObjectiveProgress)}
              className="post-form__progress"
            >
              {OBJECTIVE_PROGRESS.map((option) => (
                <RadioCard key={option.value} value={option.value} label={option.label} />
              ))}
            </RadioCards>
            <FormMessage tone="error">{result.errors.objectiveProgress}</FormMessage>
          </fieldset>

          <fieldset className="post-form__field">
            <legend>
              Trilhas <span className="post-form__objective">· opcional</span>
            </legend>
            <CollectionPicker userId={account.id} value={collectionIds} onChange={setCollectionIds} disabled={pending} />
          </fieldset>

          <div className="post-form__visibility">
            <div className="post-form__check">
              <Checkbox
                id="shared-on-feed"
                checked={sharedOnFeed}
                onCheckedChange={(checked) => setSharedOnFeed(checked === true)}
              />
              <Label htmlFor="shared-on-feed">Compartilhar no Feed da comunidade</Label>
            </div>
            <div className="post-form__check">
              <Checkbox
                id="shown-on-profile"
                checked={shownOnProfile}
                onCheckedChange={(checked) => setShownOnProfile(checked === true)}
              />
              <Label htmlFor="shown-on-profile">Mostrar no meu perfil público</Label>
            </div>
            <p className="post-form__hint">
              {!sharedOnFeed && !shownOnProfile
                ? 'Só você vai ver esta publicação. Ela fica na sua trajetória.'
                : shownOnProfile && !account.published
                  ? 'Seu perfil público está desligado: a publicação só aparece nele quando você o publicar.'
                  : 'Você pode mudar isso depois, no menu da publicação.'}
            </p>
          </div>

          <FormMessage tone="error">{result.message}</FormMessage>
          <div className="post-form__actions">
            {dirty ? (
              <Button type="button" variant="secondary" disabled={pending} onClick={() => setConfirmingDiscard(true)}>
                Cancelar
              </Button>
            ) : (
              <Button asChild variant="secondary">
                <Link to="/app">Cancelar</Link>
              </Button>
            )}
            <Button type="submit" loading={pending}>
              Publicar
            </Button>
          </div>
        </form>
      </Card>

      <Dialog open={confirmingDiscard} onOpenChange={setConfirmingDiscard}>
        <DialogContent
          title="Descartar publicação?"
          description="O que você escreveu não será salvo."
          footer={
            <>
              <DialogClose asChild>
                <Button variant="secondary">Continuar escrevendo</Button>
              </DialogClose>
              <Button variant="danger" onClick={() => navigate('/app')}>
                Descartar
              </Button>
            </>
          }
        />
      </Dialog>
    </>
  )
}

function TextField({
  id,
  label,
  value,
  onChange,
  error,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  error: string | undefined
}) {
  const over = value.trim().length > POST_TEXT_MAX
  return (
    <div className="post-form__field">
      <div className="post-form__label-row">
        <Label htmlFor={id}>{label}</Label>
        <span className="post-form__counter" data-over={over || undefined}>
          {value.trim().length}/{POST_TEXT_MAX}
        </span>
      </div>
      <Textarea
        id={id}
        rows={4}
        value={value}
        aria-invalid={!!error || undefined}
        aria-describedby={`${id}-error`}
        onChange={(e) => onChange(e.target.value)}
      />
      <div id={`${id}-error`}>
        <FormMessage tone="error">{error}</FormMessage>
      </div>
    </div>
  )
}
