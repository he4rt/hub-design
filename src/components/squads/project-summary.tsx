import { Badge } from '@/components/ui/badge'
import type { Project } from '@/mocks/db'
import { LEVEL_LABELS } from '@/mocks/squads'
import './project-summary.css'

/** What every project carries from its creation: goal, acceptance and evaluation criteria, stack and level. */
export function ProjectSummary({ project }: { project: Project }) {
  return (
    <div className="project-summary">
      <p className="project-summary__goal">{project.goal}</p>
      <ul className="project-summary__tags">
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
          <ul>
            {project.acceptanceCriteria.map((c) => (
              <li key={c.id}>{c.text}</li>
            ))}
          </ul>
        </section>
        <section>
          <h3>Critérios de avaliação</h3>
          <ul>
            {project.evaluationCriteria.map((c) => (
              <li key={c.id}>
                <strong>{c.competency}:</strong> {c.description}
              </li>
            ))}
          </ul>
        </section>
      </div>
      {project.repository && (
        <p className="project-summary__repo">
          Repositório:{' '}
          <a href={project.repository.url} target="_blank" rel="noreferrer">
            {project.repository.fullName}
          </a>
          {project.board && (
            <>
              {' · '}
              <a href={project.board.url} target="_blank" rel="noreferrer">
                Board no GitHub
              </a>
            </>
          )}
        </p>
      )}
    </div>
  )
}
