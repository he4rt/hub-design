import { Card } from '@/components/ui/card'
import { ValidationRecord } from '@/components/validation/validation-record'
import type { Contestation, Project, Validation } from '@/mocks/db'
import './validations-card.css'

/**
 * Validations the member published, each one whole. A correction replaces the record it
 * corrects here; the old one stays reachable from the new one.
 */
export function ValidationsCard({
  validations,
  projects,
  contestations,
}: {
  validations: Validation[]
  projects: Project[]
  contestations: Contestation[]
}) {
  return (
    <Card className="validations-card" aria-labelledby="validations-card-title">
      <h2 id="validations-card-title">Validações</h2>
      <p className="validations-card__muted">
        Registradas por validadores de fora do squad. Cada uma aparece inteira, com pontos fortes e de melhoria.
      </p>
      {validations.map((v) => (
        <div key={v.id} className="validations-card__item">
          {contestations.some((c) => c.validationId === v.id && c.status === 'open') && (
            <p className="validations-card__muted">Revisão em andamento.</p>
          )}
          <ValidationRecord validation={v} projectName={projects.find((p) => p.id === v.projectId)?.name} />
        </div>
      ))}
    </Card>
  )
}
