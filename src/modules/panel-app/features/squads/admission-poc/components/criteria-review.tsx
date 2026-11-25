import { useState } from 'react'
import { FormMessage } from '@/components/form-message'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import './criteria-review.css'

export type Verdict = 'meets' | 'not-yet'
export type Check = { criterion: string; verdict: Verdict | null; source: string | null; note: string }

/** Where the captain saw the evidence. GitHub references use the mono font. */
const SOURCES = [
  { id: 'answer', label: 'Resposta da candidatura', github: false },
  { id: 'entry-test', label: 'he4rt/teste-entrada#12', github: true },
  { id: 'repository', label: 'ana-souza/loja-basement', github: true },
] as const

const sourceLabel = (id: string | null) => SOURCES.find((s) => s.id === id)?.label ?? ''

const blank = (criteria: string[]): Check[] => criteria.map((criterion) => ({ criterion, verdict: null, source: null, note: '' }))

/**
 * The captain checks the application criterion by criterion. "Atende" only unlocks when every criterion meets,
 * with where it was seen; "Ainda não atende" needs every criterion marked and what to strengthen on each miss.
 */
export function CriteriaReview({
  roles,
  criteria,
  onDecide,
}: {
  roles: string[]
  criteria: Record<string, string[]>
  onDecide: (role: string, verdict: Verdict, checks: Check[]) => void
}) {
  const [role, setRole] = useState(roles[0])
  const [byRole, setByRole] = useState<Record<string, Check[]>>(() => Object.fromEntries(roles.map((r) => [r, blank(criteria[r])])))
  const checks = byRole[role]
  const update = (i: number, patch: Partial<Check>) => setByRole((prev) => ({ ...prev, [role]: prev[role].map((c, j) => (j === i ? { ...c, ...patch } : c)) }))

  const unmarked = checks.filter((c) => !c.verdict).length
  const noSource = checks.filter((c) => c.verdict === 'meets' && !c.source).length
  const misses = checks.filter((c) => c.verdict === 'not-yet')
  const noNote = misses.filter((c) => !c.note.trim()).length
  const canMeet = unmarked === 0 && noSource === 0 && misses.length === 0
  const canDecline = unmarked === 0 && misses.length > 0 && noNote === 0
  const hint = [
    unmarked && `conferir ${unmarked === 1 ? '1 critério' : `${unmarked} critérios`}`,
    noSource && `dizer onde viu ${noSource === 1 ? '1 critério' : `${noSource} critérios`}`,
    noNote && `escrever o que fortalecer em ${noNote === 1 ? '1 critério' : `${noNote} critérios`}`,
  ].filter(Boolean) as string[]

  return (
    <div className="criteria-review">
      {roles.length > 1 && (
        <ToggleGroup type="single" aria-label="Conferir para a função" value={role} onValueChange={(v) => v && setRole(v)}>
          {roles.map((r, i) => (
            <ToggleGroupItem key={r} value={r}>
              {i === 0 ? r : `${r}, segunda opção`}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      )}
      <ol className="criteria-review__list" aria-label={`Critérios de ${role}`}>
        {checks.map((c, i) => (
          <li key={c.criterion} className="criteria-review__item" data-verdict={c.verdict ?? undefined}>
            <div className="criteria-review__head">
              <span className="criteria-review__criterion">{c.criterion}</span>
              <ToggleGroup
                type="single"
                aria-label={`Conferência de ${c.criterion}`}
                value={c.verdict ?? ''}
                onValueChange={(v) => update(i, { verdict: (v || null) as Verdict | null })}
              >
                <ToggleGroupItem value="meets">Atende</ToggleGroupItem>
                <ToggleGroupItem value="not-yet">Ainda não</ToggleGroupItem>
              </ToggleGroup>
            </div>
            {c.verdict === 'meets' && (
              <div className="criteria-review__detail">
                <span className="squad-page__muted">Onde você viu</span>
                <ToggleGroup variant="chips" type="single" aria-label={`Onde viu: ${c.criterion}`} value={c.source ?? ''} onValueChange={(v) => update(i, { source: v || null })}>
                  {SOURCES.map((s) => (
                    <ToggleGroupItem key={s.id} value={s.id} data-github={s.github || undefined}>
                      {s.label}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>
            )}
            {c.verdict === 'not-yet' && (
              <div className="criteria-review__detail">
                <Input
                  aria-label={`O que fortalecer: ${c.criterion}`}
                  placeholder="O que fortalecer para a próxima"
                  value={c.note}
                  onChange={(e) => update(i, { note: e.target.value })}
                />
              </div>
            )}
          </li>
        ))}
      </ol>
      <FormMessage tone="error">{hint.length ? `Falta ${hint.join(', ')}.` : ''}</FormMessage>
      <div className="squad-page__actions">
        <Button disabled={!canMeet} onClick={() => onDecide(role, 'meets', checks)}>
          Atende
        </Button>
        <Button variant="danger" disabled={!canDecline} onClick={() => onDecide(role, 'not-yet', checks)}>
          Ainda não atende
        </Button>
        <Badge variant="neutral">A staff vê esta conferência</Badge>
      </div>
    </div>
  )
}

/** What the person reads after "Ainda não atende": each criterion, and what to strengthen on each miss. */
export function CriteriaFeedback({ checks }: { checks: Check[] }) {
  return (
    <ol className="criteria-review__list" aria-label="Conferência dos critérios">
      {checks.map((c) => (
        <li key={c.criterion} className="criteria-review__item" data-verdict={c.verdict ?? undefined}>
          <div className="criteria-review__head">
            <span className="criteria-review__criterion">{c.criterion}</span>
            {c.verdict === 'meets' ? <Badge variant="success">Atende</Badge> : <Badge variant="neutral">Ainda não</Badge>}
          </div>
          {c.verdict === 'meets' && c.source && <span className="squad-page__muted">Visto em {sourceLabel(c.source)}</span>}
          {c.verdict === 'not-yet' && <p className="criteria-review__note">{c.note}</p>}
        </li>
      ))}
    </ol>
  )
}
