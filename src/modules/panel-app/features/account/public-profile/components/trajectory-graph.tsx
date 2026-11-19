import { useId, useState } from 'react'
import { Link } from 'react-router'
import { ArrowRight, ChevronDown, ExternalLink, MessageSquareText, MessagesSquare } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import type { Discussion } from '@/mocks/db'
import { formatDay } from '@/modules/panel-app/lib/dates'
import { evidenceIcons } from '@/modules/panel-app/lib/evidence'
import { kindLabels, type EvidenceStrength, type TrajectoryEntry } from '../lib/trajectory'
import './trajectory-graph.css'

/** Records shown before "Ver trajetória completa". */
const INITIAL = 6
const RAIL = 20

/** Which part of the rail a row draws; `more` fades out where hidden records continue. */
type RailPart = 'full' | 'top' | 'bottom' | 'more'

function Marker({ strength, x, y }: { strength: EvidenceStrength; x: number; y: number }) {
  return <circle className="trajectory-graph__marker" data-strength={strength} cx={x} cy={y} r={4.5} />
}

/** What each marker means, in plain words: the strength of the record's evidence, never an amount. */
function Legend() {
  const strengths: [EvidenceStrength, string, string][] = [
    ['declared', 'Declarado', 'informado pelo membro'],
    ['registered', 'Registrado', 'estudo, artigo, experiência ou squad'],
    ['evidence', 'Com evidência', 'commit, PR ou repositório'],
  ]
  return (
    <ul className="trajectory-graph__legend" aria-label="Como ler a trajetória">
      {strengths.map(([strength, label, meaning]) => (
        <li key={strength}>
          <svg width={12} height={12} aria-hidden>
            <Marker strength={strength} x={6} y={6} />
          </svg>
          <span>
            <strong>{label}</strong>: {meaning}
          </span>
        </li>
      ))}
    </ul>
  )
}

function Rail({ strength, part }: { strength: EvidenceStrength; part: RailPart | null }) {
  return (
    <span className="trajectory-graph__rail" aria-hidden>
      {part && <i className="trajectory-graph__line" data-part={part} />}
      <svg width={RAIL} height={40} className="trajectory-graph__svg">
        <Marker strength={strength} x={RAIL / 2} y={20} />
      </svg>
    </span>
  )
}

/** Forum discussions opened from one of these notes, and, for the owner, a way to open one. */
type NoteForum = { discussions: Discussion[]; isOwner: boolean }

function EntryDetail({ entry, forum }: { entry: TrajectoryEntry; forum: NoteForum }) {
  const EvidenceIcon = entry.evidenceKind ? evidenceIcons[entry.evidenceKind] : null
  return (
    <div className="trajectory-graph__detail">
      {EvidenceIcon && entry.reference && (
        <p className="trajectory-graph__reference" title={entry.reference}>
          <EvidenceIcon size={14} aria-hidden />
          <code>{entry.reference}</code>
        </p>
      )}
      {entry.detail && <p>{entry.detail}</p>}
      {entry.kind === 'evidence' && entry.project && (
        <p className="trajectory-graph__muted">
          Ligado a: <Link to={entry.project.path}>{entry.project.label}</Link>
        </p>
      )}
      {entry.notes.map((note) => (
        <article key={note.id} className="trajectory-graph__note" aria-label="Publicação do diário">
          <p className="trajectory-graph__note-meta">
            <MessageSquareText size={14} aria-hidden />
            Publicação do diário · <time dateTime={note.createdAt}>{formatDay(note.createdAt)}</time>
            {note.editedAt && <> · editada em {formatDay(note.editedAt)}</>}
          </p>
          <dl>
            <dt>O que aprendi</dt>
            <dd>{note.learned}</dd>
            <dt>Como apliquei</dt>
            <dd>{note.applied}</dd>
          </dl>
          <NoteDiscussions noteId={note.id} forum={forum} />
        </article>
      ))}
      <p className="trajectory-graph__origin">
        {kindLabels[entry.kind]} · {entry.origin}
        {entry.kind === 'project' && entry.project && (
          <>
            {' · '}
            <Link to={entry.project.path}>
              Ver o projeto
              <ArrowRight size={12} aria-hidden />
            </Link>
          </>
        )}
        {entry.url && (
          <>
            {' · '}
            <a href={entry.url} target="_blank" rel="noreferrer">
              {entry.kind === 'article' ? 'Ler o artigo' : 'Abrir no GitHub'}
              <ExternalLink size={12} aria-hidden />
            </a>
          </>
        )}
      </p>
    </div>
  )
}

/**
 * The trajectory as a `git log`: one line where every record, experiences included, is an
 * event, and each marker shows how strong a record's evidence is. It opens with the newest
 * records and never shows counts, streaks, or activity density.
 */
/**
 * The link from a diary note to the forum: the discussions it started, without a reply count,
 * and "Perguntar no fórum" for the owner. Only the author opens a discussion from their note.
 */
function NoteDiscussions({ noteId, forum }: { noteId: string; forum: NoteForum }) {
  const related = forum.discussions.filter(
    (discussion) => discussion.context?.type === 'post' && discussion.context.id === noteId,
  )
  if (related.length === 0 && !forum.isOwner) return null
  return (
    <ul className="trajectory-graph__forum" aria-label="No fórum">
      {related.map((discussion) => (
        <li key={discussion.id}>
          <MessagesSquare size={14} aria-hidden />
          <span>No fórum:</span>
          <Link to={`/app/discussions/${discussion.id}`} title={discussion.title}>
            {discussion.title}
          </Link>
        </li>
      ))}
      {forum.isOwner && (
        <li>
          <MessagesSquare size={14} aria-hidden />
          <Link to={`/app/discussions/new?post=${noteId}`}>Perguntar no fórum sobre esta nota</Link>
        </li>
      )}
    </ul>
  )
}

export function TrajectoryGraph({ entries, forum }: { entries: TrajectoryEntry[]; forum: NoteForum }) {
  const listId = useId()
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? entries : entries.slice(0, INITIAL)
  const hasMore = entries.length > INITIAL
  const last = visible.length - 1

  // The line starts at the newest record and ends at the oldest, like `git log --graph`.
  const railPart = (i: number): RailPart | null => {
    if (i === last && !expanded && hasMore) return i === 0 ? null : 'more'
    if (last === 0) return null
    return i === 0 ? 'bottom' : i === last ? 'top' : 'full'
  }

  return (
    <div className="trajectory-graph">
      <Legend />
      <ol className="trajectory-graph__list" id={listId}>
        {visible.map((entry, i) => {
          const EvidenceIcon = entry.evidenceKind ? evidenceIcons[entry.evidenceKind] : null
          return (
            <li key={entry.id} className="trajectory-graph__row">
              <time dateTime={entry.date} className="trajectory-graph__date">
                {entry.dateLabel}
              </time>
              <Rail strength={entry.strength} part={railPart(i)} />
              <Collapsible className="trajectory-graph__body">
                <CollapsibleTrigger className="trajectory-graph__trigger">
                  <span className="trajectory-graph__title">
                    <span className="trajectory-graph__sr">{kindLabels[entry.kind]}: </span>
                    {entry.title}
                    {entry.notes.length > 0 && (
                      <MessageSquareText size={14} className="trajectory-graph__note-icon" aria-label="Tem nota do diário" />
                    )}
                  </span>
                  <Badge mono={entry.badge.mono} className="trajectory-graph__badge" title={entry.badge.text}>
                    {EvidenceIcon && <EvidenceIcon size={12} aria-hidden />}
                    {entry.badge.text}
                  </Badge>
                  <ChevronDown size={16} className="trajectory-graph__chevron" aria-hidden />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <EntryDetail entry={entry} forum={forum} />
                </CollapsibleContent>
              </Collapsible>
            </li>
          )
        })}
      </ol>
      {hasMore && (
        <Button
          variant="ghost"
          size="sm"
          className="trajectory-graph__more"
          aria-expanded={expanded}
          aria-controls={listId}
          onClick={() => setExpanded(!expanded)}
        >
          <ChevronDown size={14} aria-hidden />
          {expanded ? 'Mostrar só os mais recentes' : 'Ver trajetória completa'}
        </Button>
      )}
    </div>
  )
}
