import { useActionState, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { FormMessage } from '@/components/form-message'
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
import type { ObjectiveProgress, User } from '@/mocks/db'
import { MockError, errorMessage } from '@/mocks/mock-action'
import { CollectionPicker } from './collection-picker'
import { POST_TEXT_MAX, validatePost, type PostField, type PostInput } from '../actions'
import './post-form.css'

type Result = { errors: Partial<Record<PostField, string>>; message: string | null }

const NO_ERRORS: Result = { errors: {}, message: null }

const VALID_SAMPLE = {
  learned: 'Aprendi a usar transações no banco para que duas escritas aconteçam juntas ou nenhuma aconteça.',
  applied: 'Envolvi o cadastro de pedido e de itens numa transação no meu projeto da loja.',
}

/**
 * The diary form, for a new publication and for an edit. `onSave` runs the mock action and
 * returns where to go next; validation errors stay on their fields.
 */
export function PostForm({
  account,
  initial,
  title,
  submitLabel,
  onSave,
}: {
  account: User
  /** Empty for a new publication; the current text for an edit. */
  initial: PostInput
  /** Debug panel title. */
  title: string
  submitLabel: string
  onSave: (input: PostInput) => Promise<{ to: string; notice: string }>
}) {
  const navigate = useNavigate()
  const [learned, setLearned] = useState(initial.learned)
  const [applied, setApplied] = useState(initial.applied)
  const [progress, setProgress] = useState<ObjectiveProgress | null>(initial.objectiveProgress)
  const [sharedOnFeed, setSharedOnFeed] = useState(initial.sharedOnFeed)
  const [shownOnProfile, setShownOnProfile] = useState(initial.shownOnProfile)
  const [collectionIds, setCollectionIds] = useState<string[]>(initial.collectionIds)
  const [confirmingDiscard, setConfirmingDiscard] = useState(false)

  const input: PostInput = { learned, applied, objectiveProgress: progress, sharedOnFeed, shownOnProfile, collectionIds }

  const [result, submit, pending] = useActionState(async (): Promise<Result> => {
    const errors = validatePost(input)
    if (Object.keys(errors).length > 0) return { errors, message: null }
    try {
      const { to, notice } = await onSave(input)
      navigate(to, { state: { notice: { tone: 'success', text: notice } } })
      return NO_ERRORS
    } catch (e) {
      const field = e instanceof MockError ? (e.field as PostField | undefined) : undefined
      return field ? { errors: { [field]: errorMessage(e) }, message: null } : { errors: {}, message: errorMessage(e) }
    }
  }, NO_ERRORS)

  useDebugActions(title, [
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

  const dirty = learned.trim() !== initial.learned || applied.trim() !== initial.applied || progress !== initial.objectiveProgress
  const objective = labelOf(OBJECTIVES, account.objective)

  return (
    <>
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
                <Link to={initial.learned ? '/app?view=mine' : '/app'}>Cancelar</Link>
              </Button>
            )}
            <Button type="submit" loading={pending}>
              {submitLabel}
            </Button>
          </div>
        </form>
      </Card>

      <Dialog open={confirmingDiscard} onOpenChange={setConfirmingDiscard}>
        <DialogContent
          title={initial.learned ? 'Descartar alterações?' : 'Descartar publicação?'}
          description="O que você escreveu não será salvo."
          footer={
            <>
              <DialogClose asChild>
                <Button variant="secondary">Continuar escrevendo</Button>
              </DialogClose>
              <Button variant="danger" onClick={() => navigate(initial.learned ? '/app?view=mine' : '/app')}>
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
