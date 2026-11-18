import { Field } from '@/components/field'
import { Combobox } from '@/components/ui/combobox'
import { useDb } from '@/mocks/db'
import { githubHandle } from '@/mocks/squads'

/** Picks a captain among accounts with the GitHub linked; it's required to give access to the repository. */
export function CaptainField({ value, onChange, hint }: { value: string | null; onChange: (id: string | null) => void; hint?: string }) {
  const users = useDb((s) => s.users)
  const options = users
    .filter((u) => githubHandle(u) && u.onboardedAt)
    .map((u) => ({ value: u.id, label: `${u.name} (@${githubHandle(u)})` }))
  return (
    <Field id="captain" label="Capitão" hint={hint ?? 'Só aparecem contas com o GitHub vinculado.'}>
      <Combobox id="captain" options={options} value={value} onValueChange={onChange} placeholder="Busque pelo nome" />
    </Field>
  )
}
