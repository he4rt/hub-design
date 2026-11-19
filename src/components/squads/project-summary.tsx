import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import type { Project } from '@/mocks/db'
import { LEVEL_LABELS } from '@/mocks/squads'
import './project-summary.css'

/** What every project carries from its creation: goal, acceptance and evaluation criteria, stack and level. */
export function ProjectSummary({ project }: { project: Project }) {
  return (
    <div className="project-summary">
      <p className="project-summary__goal">{project.goal}</p>
      <ul className="project-summary__tags" aria-label="Stack e nível esperado">
        {project.stack.map((tech) => (
          <li key={tech}>
            <Badge>{tech}</Badge>
          </li>
        ))}
        {project.expectedLevel.map((level) => (
          <li key={level}>
            <Badge>{LEVEL_LABELS[level]}</Badge>
          </li>
        ))}
      </ul>
      <div className="project-summary__criteria">
        <section>
          <h3>Critérios de aceite</h3>
          <ul className="project-summary__acceptance">
            {project.acceptanceCriteria.map((c) => (
              <li key={c.id}>{c.text}</li>
            ))}
          </ul>
        </section>
        <section>
          <h3>Critérios de avaliação</h3>
          <ul className="project-summary__evaluation">
            {project.evaluationCriteria.map((c) => (
              <li key={c.id}>
                <Badge variant="comp">{c.competency}</Badge>
                <p>{c.description}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
      {project.repository && (
        <Card variant="inset" className="project-summary__github">
          <p className="project-summary__ref" title={project.repository.fullName}>
            {project.repository.fullName}
          </p>
          <p className="project-summary__links">
            <a href={project.repository.url} target="_blank" rel="noreferrer">
              Abrir no GitHub
            </a>
            {project.board && (
              <a href={project.board.url} target="_blank" rel="noreferrer">
                Abrir o board no GitHub
              </a>
            )}
          </p>
        </Card>
      )}
    </div>
  )
}
