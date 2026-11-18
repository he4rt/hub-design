import { useActionState, useState } from 'react'
import { FormMessage } from '@/components/form-message'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { SquadMembership } from '@/mocks/db'
import { errorMessage } from '@/mocks/mock-action'
import { updateResponsibilities } from '../actions'

export function ResponsibilitiesForm({ membership, actorId, label }: { membership: SquadMembership; actorId: string; label: string }) {
  const [value, setValue] = useState(membership.responsibilities)
  const [result, submit, pending] = useActionState(async () => {
    try {
      await updateResponsibilities(actorId, membership.id, value)
      return { tone: 'success' as const, text: 'Salvo.' }
    } catch (e) {
      return { tone: 'error' as const, text: errorMessage(e) }
    }
  }, null)

  return (
    <form action={submit} className="stack-page__row">
      <Input aria-label={`Responsabilidades de ${label}`} value={value} onChange={(e) => setValue(e.target.value)} className="stack-page__grow" />
      <Button type="submit" variant="secondary" size="sm" loading={pending}>
        Salvar
      </Button>
      <FormMessage tone={result?.tone ?? 'success'}>{result?.text}</FormMessage>
    </form>
  )
}
