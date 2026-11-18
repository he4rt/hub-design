import { Link } from 'react-router'
import { ArrowRight, ExternalLink, Users } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { evidenceIcons } from '@/modules/panel-app/lib/evidence'
import type { TrajectoryEntry } from '../lib/trajectory'
import './contributions-showcase.css'

/**
 * Squad projects and the contributions the member shows, as cards above the trajectory, like
 * pinned repositories: what they built weighs more than what they declared. Never a count.
 */
export function ContributionsShowcase({ entries }: { entries: TrajectoryEntry[] }) {
  return (
    <section className="contributions-showcase" aria-labelledby="contributions-showcase-title">
      <h2 id="contributions-showcase-title" className="contributions-showcase__heading">
        Projetos e contribuições
      </h2>
      <ul className="contributions-showcase__list">
        {entries.map((entry) => {
          const isProject = entry.kind === 'project'
          const Icon = isProject ? Users : entry.evidenceKind ? evidenceIcons[entry.evidenceKind] : null
          return (
            <li key={entry.id}>
              <Card className="contributions-showcase__card" data-kind={entry.kind}>
                <p className="contributions-showcase__ref" title={entry.reference ?? entry.badge.text}>
                  {Icon && <Icon size={14} aria-hidden />}
                  {isProject ? <span>{entry.badge.text}</span> : <code>{entry.badge.text}</code>}
                  <time dateTime={entry.date}>{entry.dateLabel}</time>
                  {isProject ? (
                    <ArrowRight size={12} className="contributions-showcase__go" aria-hidden />
                  ) : (
                    <ExternalLink size={12} className="contributions-showcase__go" aria-hidden />
                  )}
                </p>
                <h3 className="contributions-showcase__title">
                  {/* The title's link covers the whole card. */}
                  {isProject && entry.project ? (
                    <Link to={entry.project.path} title={entry.title}>
                      {entry.title}
                    </Link>
                  ) : (
                    <a href={entry.url ?? undefined} target="_blank" rel="noreferrer" title={entry.title}>
                      {entry.title}
                      <span className="contributions-showcase__sr"> (abre no GitHub)</span>
                    </a>
                  )}
                </h3>
                {entry.detail && <p className="contributions-showcase__detail">{entry.detail}</p>}
                {/* Only a contribution to a squad project links to it, like a commit to its repository. */}
                {!isProject && entry.project && (
                  <p className="contributions-showcase__relation" title={entry.project.label}>
                    Ligado a: <Link to={entry.project.path}>{entry.project.label}</Link>
                  </p>
                )}
              </Card>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
