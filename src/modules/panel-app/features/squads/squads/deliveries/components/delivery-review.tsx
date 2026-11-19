import { useActionState, useState } from 'react'
import { Field } from '@/components/field'
import { FormMessage } from '@/components/form-message'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { SquadDelivery, MockDb } from '@/mocks/db'
import { errorMessage } from '@/mocks/mock-action'
import { acceptDelivery, returnDelivery } from '../actions'
import './delivery-review.css'

/** One pending delivery: the captain checks the criterion and writes who did what. */
export function DeliveryReview({ state, delivery, actorId }: { state: MockDb; delivery: SquadDelivery; actorId: string }) {
  const project = state.projects.find((p) => p.id === delivery.projectId)
  const criterion = project?.acceptanceCriteria.find((c) => c.id === delivery.criterionId)
  const [credits, setCredits] = useState(delivery.credits)
  const [collaboration, setCollaboration] = useState(delivery.collaboration)
  const [context, setContext] = useState(delivery.context)
  const [reason, setReason] = useState('')
  const name = (id: string) => state.users.find((u) => u.id === id)?.name ?? '?'

  const [result, submit, pending] = useActionState(async (_: string | null, form: FormData) => {
    try {
      if (form.get('intent') === 'return') await returnDelivery(actorId, delivery.id, reason)
      else await acceptDelivery(actorId, delivery.id, { credits, collaboration, context })
      return null
    } catch (e) {
      return errorMessage(e)
    }
  }, null)

  return (
    <form action={submit} className="delivery-review">
      <div className="stack-page__row">
        <span className="stack-page__title">{delivery.title}</span>
        <Badge tone={delivery.kind === 'technical' ? 'neutral' : 'primary'}>
          {delivery.kind === 'technical' ? 'Técnica' : 'Não técnica'}
        </Badge>
      </div>
      <p className="stack-page__muted">
        Critério: {criterion?.text ?? 'nenhum critério ligado no board'}
        {delivery.evidence.length > 0 && ' · '}
        {delivery.evidence.map((e, i) => (
          <span key={e.ref}>
            {i > 0 && ', '}
            <a href={e.url} target="_blank" rel="noreferrer">
              {e.ref}
            </a>
          </span>
        ))}
      </p>
      {delivery.returnedReason && <p className="stack-page__quote">Devolvida antes: {delivery.returnedReason}</p>}

      <fieldset className="delivery-review__credits">
        <legend>Quem fez o quê</legend>
        <p className="stack-page__muted">Pré-preenchido pelo GitHub (autor, co-autores e responsáveis). Deixe em branco quem não participou.</p>
        {credits.map((c, i) => (
          <Field key={c.userId} id={`credit-${delivery.id}-${c.userId}`} label={name(c.userId)}>
            <Input
              id={`credit-${delivery.id}-${c.userId}`}
              value={c.part}
              placeholder="O que esta pessoa fez"
              onChange={(e) => setCredits(credits.map((x, j) => (j === i ? { ...x, part: e.target.value } : x)))}
            />
          </Field>
        ))}
      </fieldset>

      <ToggleGroup
        type="single"
        value={collaboration}
        aria-label="Como foi feito"
        onValueChange={(v) => v && setCollaboration(v as SquadDelivery['collaboration'])}
      >
        <ToggleGroupItem value="individual">Individual</ToggleGroupItem>
        <ToggleGroupItem value="pair">Em dupla</ToggleGroupItem>
        <ToggleGroupItem value="group">Em grupo</ToggleGroupItem>
      </ToggleGroup>

      <Field id={`context-${delivery.id}`} label="Contexto para o validador" hint="Separe o que foi de cada pessoa e o que foi do time.">
        <Textarea id={`context-${delivery.id}`} value={context} onChange={(e) => setContext(e.target.value)} />
      </Field>
      <Field id={`reason-${delivery.id}`} label="Motivo, se for devolver">
        <Input id={`reason-${delivery.id}`} value={reason} onChange={(e) => setReason(e.target.value)} />
      </Field>
      <FormMessage tone="error">{result}</FormMessage>
      <div className="stack-page__actions">
        <Button type="submit" name="intent" value="accept" loading={pending}>
          Aceitar entrega
        </Button>
        <Button type="submit" name="intent" value="return" variant="secondary" disabled={pending || reason.trim().length < 10}>
          Devolver
        </Button>
      </div>
    </form>
  )
}
