import { Link } from 'react-router'
import { ChartColumn, Code, FileText, MessageSquare, PenTool, Shapes, Target, type LucideIcon } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import type { ShowcaseArea, ShowcaseHelpRequest } from '@/mocks/db'
import { AREA_LABELS, type ShowcaseCard as Card } from '../lib/showcase-filters'
import './showcase-card.css'

const AREA_ICONS: Record<ShowcaseArea, LucideIcon> = {
  development: Code,
  design: PenTool,
  content: FileText,
  data: ChartColumn,
  other: Shapes,
}

// Seed dates are calendar dates, so format them in UTC: "21 nov".
const dayMonth = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const formatDayMonth = (iso: string) => dayMonth.format(new Date(iso)).replace(' de ', ' ').replace('.', '')

function feedbackLabel(count: number) {
  return count === 0 ? 'Nenhum retorno' : count === 1 ? '1 retorno' : `${count} retornos`
}

/**
 * What the author asked for, at the end of the body: the first question with its topic, or an
 * invitation to general feedback. The question's context is for the project page, never the card.
 */
function HelpRequest({ requests }: { requests: ShowcaseHelpRequest[] }) {
  const [first] = requests
  if (!first) {
    return (
      <div className="showcase-card__help" data-kind="general">
        <p className="showcase-card__help-label">
          <MessageSquare size={14} aria-hidden />
          Aberto a feedback geral
        </p>
        <p className="showcase-card__help-text">Qualquer retorno é bem-vindo</p>
      </div>
    )
  }
  return (
    <div className="showcase-card__help" data-kind="ask">
      <p className="showcase-card__help-label">
        <Target size={14} aria-hidden />
        Precisa de ajuda
        {first.topic && (
          <>
            {/* A vertical rule apart the topic, never a middle dot (docs/design-system/README.md). */}
            <span className="showcase-card__help-divider" aria-hidden />
            <span className="showcase-card__help-topic">{first.topic}</span>
          </>
        )}
      </p>
      <p className="showcase-card__help-text" title={first.question}>
        {first.question}
      </p>
      {requests.length > 1 && <p className="showcase-card__help-more">+1 pergunta</p>}
    </div>
  )
}

/** One project in the Showcase grid; the whole card opens the project. */
export function ShowcaseCard({ project }: { project: Card }) {
  const Icon = AREA_ICONS[project.area]
  return (
    <Link to={`/app/showcase/${project.slug}`} className="showcase-card">
      <div className="showcase-card__cover" data-empty={!project.coverUrl || undefined}>
        {project.coverUrl ? <img src={project.coverUrl} alt="" loading="lazy" /> : <Icon size={40} strokeWidth={1.75} aria-hidden />}
        <span className="showcase-card__area">{AREA_LABELS[project.area]}</span>
        {project.feedbackCount === 0 && (
          <Badge variant="warning" className="showcase-card__waiting">
            Sem retorno ainda
          </Badge>
        )}
      </div>
      <div className="showcase-card__body">
        <h2 className="showcase-card__title" title={project.title}>
          {project.title}
        </h2>
        <p className="showcase-card__author">
          <Avatar src={project.author.photoUrl} name={project.author.name} size="xs" />
          <span title={project.author.name}>{project.author.name}</span>
        </p>
        <p className="showcase-card__summary">{project.summary}</p>
        <HelpRequest requests={project.helpRequests} />
      </div>
      <footer className="showcase-card__footer">
        <span>
          <MessageSquare size={16} aria-hidden />
          {feedbackLabel(project.feedbackCount)}
        </span>
        <time dateTime={project.publishedAt}>{formatDayMonth(project.publishedAt)}</time>
      </footer>
    </Link>
  )
}
