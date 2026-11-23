import { StateChip } from '@/components/state-chip'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useDb, type Validation } from '@/mocks/db'
import { formatDate } from '@/mocks/squads'
import { validationHistory } from '@/mocks/validation'
import './validation-record.css'

/** A validation shown whole: strengths and points to improve always together, never a grade. */
export function ValidationRecord({ validation, projectName, showHistory = true }: { validation: Validation; projectName?: string; showHistory?: boolean }) {
  const validations = useDb((s) => s.validations)
  const profilePublic = useDb((s) => s.users.find((u) => u.id === validation.memberId)?.published)
  const history = showHistory && profilePublic ? validationHistory(validations, validation) : []
  const employer = [validation.validator.jobTitle, validation.validator.company].filter(Boolean).join(' na ')
  return (
    <article className="validation-record">
      <header className="validation-record__header">
        <div className="validation-record__who">
          <h3 className="validation-record__competency">{validation.competency}</h3>
          <p className="validation-record__muted">
            Registrada por {validation.validator.name}
            {employer && `, ${employer}`}, em {formatDate(validation.recordedAt)}.
            {projectName && ` Projeto ${projectName}.`}
          </p>
        </div>
        {validation.insufficientEvidence && <StateChip entity="validation" state="insufficient-evidence" />}
      </header>

      <section className="validation-record__section">
        <h4>Contexto</h4>
        <p className="validation-record__text">{validation.context}</p>
      </section>
      <section className="validation-record__section">
        <h4>Contribuição observada</h4>
        <p className="validation-record__text">{validation.contribution}</p>
      </section>

      <div className="validation-record__points">
        <section className="validation-record__section">
          <h4 data-tone="success">Pontos fortes</h4>
          <ul>
            {validation.strengths.map((p, i) => (
              <li key={i}>
                <p className="validation-record__text">{p.text}</p>
                <p className="validation-record__muted">
                  Evidência: <span className="validation-record__mono">{p.evidenceRef}</span>
                </p>
              </li>
            ))}
          </ul>
        </section>
        <section className="validation-record__section">
          <h4 data-tone="warning">Pontos de melhoria</h4>
          <ul>
            {validation.improvements.map((p, i) => (
              <li key={i}>
                <p className="validation-record__text">{p.text}</p>
                <p className="validation-record__muted">
                  Evidência: <span className="validation-record__mono">{p.evidenceRef}</span>
                </p>
                <p className="validation-record__text">Sugestão: {p.suggestion}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <p className="validation-record__muted">
        Conflito de interesse:{' '}
        {validation.conflictOfInterest.declared ? validation.conflictOfInterest.description : 'nenhum declarado.'}
      </p>
      {history.length > 0 && (
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="secondary" size="sm">Ver registro anterior</Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="validation-record__history">
            {history.map((previous) => <ValidationRecord key={previous.id} validation={previous} projectName={projectName} showHistory={false} />)}
          </CollapsibleContent>
        </Collapsible>
      )}
    </article>
  )
}
