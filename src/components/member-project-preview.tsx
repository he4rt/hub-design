import { Code2, ExternalLink } from 'lucide-react'
import { StateChip } from '@/components/state-chip'
import type { MemberProject } from '@/mocks/db'
import './member-project-preview.css'

/** The same compact project preview in the Feed, profile and saved publications. */
export function MemberProjectPreview({ project }: { project: MemberProject }) {
  const content = (
    <>
      <Code2 className="member-project-preview__icon" size={22} aria-hidden />
      <div className="member-project-preview__body">
        <strong>{project.read.name}</strong>
        <div className="member-project-preview__metadata">
          <span title={project.repository.fullName}>{project.repository.fullName}</span>
          {project.read.language && <span>{project.read.language}</span>}
        </div>
      </div>
      <ExternalLink size={18} aria-hidden />
    </>
  )
  return (
    <div className="member-project-preview">
      {project.repositoryStatus === 'unavailable' && (
        <StateChip entity="member-repository" state="unavailable" />
      )}
      <a
        className="member-project-preview__link"
        href={project.repository.url}
        target="_blank"
        rel="noreferrer"
        aria-label={`Abrir ${project.read.name} no GitHub (nova aba)`}
      >
        {content}
      </a>
    </div>
  )
}
