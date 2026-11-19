import { Badge } from '@/components/ui/badge'
import type { Validation } from '@/mocks/db'
import { formatDate } from '@/mocks/squads'
import './validation-record.css'

/** A validation shown whole: strengths and points to improve always together, never a grade. */
export function ValidationRecord({ validation, projectName }: { validation: Validation; projectName?: string }) {
  const employer = [validation.validator.jobTitle, validation.validator.company].filter(Boolean).join(' na ')
  return (
    <article className="validation-record">
      <header className="validation-record__header">
        <div>
          <p className="validation-record__competency">{validation.competency}</p>
          <p className="validation-record__muted">
            {projectName && `${projectName} · `}
            {validation.validator.name}
            {employer && `, ${employer}`} · {formatDate(validation.recordedAt)}
          </p>
        </div>
        {validation.insufficientEvidence && <Badge variant="warning">Evidência insuficiente</Badge>}
      </header>
      <dl className="validation-record__body">
        <dt>Contexto</dt>
        <dd>{validation.context}</dd>
        <dt>Contribuição observada</dt>
        <dd>{validation.contribution}</dd>
        <dt>Pontos fortes</dt>
        <dd>
          <ul>
            {validation.strengths.map((p, i) => (
              <li key={i}>
                {p.text} <span className="validation-record__muted">({p.evidenceRef})</span>
              </li>
            ))}
          </ul>
        </dd>
        <dt>Pontos de melhoria</dt>
        <dd>
          <ul>
            {validation.improvements.map((p, i) => (
              <li key={i}>
                {p.text} <span className="validation-record__muted">({p.evidenceRef})</span>
                <br />
                <span className="validation-record__muted">Sugestão: {p.suggestion}</span>
              </li>
            ))}
          </ul>
        </dd>
        <dt>Conflito de interesse</dt>
        <dd>{validation.conflictOfInterest.declared ? validation.conflictOfInterest.description : 'Declarado: nenhum.'}</dd>
      </dl>
    </article>
  )
}
