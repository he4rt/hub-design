import { useActionState, useState } from 'react'
import { Field } from '@/components/field'
import { FormMessage } from '@/components/form-message'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
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
      <header className="delivery-review__head">
        <h2 className="delivery-review__title">{delivery.title}</h2>
        <Badge variant={delivery.kind === 'technical' ? 'comp' : 'neutral'}>
          {delivery.kind === 'technical' ? 'Técnica' : 'Não técnica'}
        </Badge>
      </header>

      <Card variant="inset">
        <p>Critério de aceite: {criterion?.text ?? 'nenhum critério ligado no board.'}</p>
        {delivery.evidence.length > 0 && (
          <ul className="delivery-review__evidence" aria-label="Evidências no GitHub">
            {delivery.evidence.map((e) => (
              <li key={e.ref}>
                <a href={e.url} target="_blank" rel="noreferrer" className="squad-page__mono">
                  {e.ref}
                </a>
              </li>
            ))}
          </ul>
        )}
      </Card>
      {delivery.returnedReason && <p className="squad-page__text">Devolvida antes: {delivery.returnedReason}</p>}

      <fieldset className="delivery-review__credits">
        <legend>Quem fez o quê</legend>
        <p className="squad-page__muted">Pré-preenchido pelo GitHub (autor, co-autores e responsáveis). Deixe em branco quem não participou.</p>
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

      <div className="delivery-review__group">
        <span className="delivery-review__label" id={`collaboration-${delivery.id}`}>
          Como foi feito
        </span>
        <ToggleGroup
          type="single"
          value={collaboration}
          aria-labelledby={`collaboration-${delivery.id}`}
          onValueChange={(v) => v && setCollaboration(v as SquadDelivery['collaboration'])}
        >
          <ToggleGroupItem value="individual">Individual</ToggleGroupItem>
          <ToggleGroupItem value="pair">Em dupla</ToggleGroupItem>
          <ToggleGroupItem value="group">Em grupo</ToggleGroupItem>
        </ToggleGroup>
      </div>

      <Field id={`context-${delivery.id}`} label="Contexto para o validador" hint="Separe o que foi de cada pessoa e o que foi do time.">
        <Textarea id={`context-${delivery.id}`} value={context} onChange={(e) => setContext(e.target.value)} />
      </Field>
      <div className="squad-page__actions">
        <Button type="submit" name="intent" value="accept" loading={pending}>
          Aceitar entrega
        </Button>
      </div>

      <div className="delivery-review__return">
        <Field
          id={`reason-${delivery.id}`}
          label="O que falta para aceitar"
          required
          hint="Só se for devolver. A pessoa lê e a entrega volta para o board."
        >
          <Textarea
            id={`reason-${delivery.id}`}
            value={reason}
            placeholder="Aponte o que falta no critério de aceite"
            onChange={(e) => setReason(e.target.value)}
          />
        </Field>
        <div className="squad-page__actions">
          <Button type="submit" name="intent" value="return" variant="danger" disabled={pending || reason.trim().length < 10}>
            Devolver
          </Button>
        </div>
      </div>
      <FormMessage tone="error">{result}</FormMessage>
    </form>
  )
}
