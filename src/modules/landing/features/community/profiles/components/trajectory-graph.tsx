import { useId, useState, type CSSProperties } from 'react'
import { Link } from 'react-router'
import { ArrowRight, ChevronDown, ExternalLink, MessageSquareText, MessagesSquare } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import type { Discussion } from '@/mocks/db'
import { formatDay } from '@/lib/dates'
import { evidenceIcons } from '@/lib/evidence'
import { recordTypeLabels, recordTypes, type BranchTone, type RecordType, type TrajectoryEntry, type TrajectoryGraph as Graph } from '../lib/trajectory'
import { RecordVisibility } from './record-visibility'
import './trajectory-graph.css'

/** Records shown before "Ver trajetória completa". */
const INITIAL = 8
const ROW = 48
const MID = ROW / 2
const laneX = (lane: number) => 10 + lane * 16
/** The main line in the primary color; each branch in its own color, like the branches of `git log --graph`. */
const laneColor = (lane: number, tone: BranchTone) =>
  tone === 'validation'
    ? 'var(--color-validator)'
    : lane === 0
      ? 'var(--color-primary)'
      : `var(--color-lane-${((lane - 1) % 4) + 1})`
const laneStyle = (lane: number, tone: BranchTone) => ({ '--lane': laneColor(lane, tone) }) as CSSProperties

/** The marker's shape tells the kind of record: dashed, hollow, filled, filled with a ring. */
function Marker({ type, x, y, lane, tone }: { type: RecordType | null; x: number; y: number; lane: number; tone: BranchTone }) {
  return (
    <>
      {type === 'validated' && <circle className="trajectory-graph__ring" cx={x} cy={y} r={7.5} style={laneStyle(lane, 'validation')} />}
      <circle className="trajectory-graph__marker" data-type={type ?? 'branch'} cx={x} cy={y} r={4.5} style={laneStyle(lane, tone)} />
    </>
  )
}

/** The five kinds of record, then one line per branch with its color. */
function Legend({ types, lanes }: { types: RecordType[]; lanes: Graph['lanes'] }) {
  return (
    <div className="trajectory-graph__legend">
      <ul aria-label="Tipos de registro">
        {recordTypes
          .filter((t) => types.includes(t.value))
          .map((t) => (
            <li key={t.value}>
              <svg width={18} height={18} aria-hidden>
                <Marker type={t.value} x={9} y={9} lane={0} tone={t.value === 'validated' ? 'validation' : 'main'} />
              </svg>
              <span>
                <strong>{t.label}</strong>: {t.meaning}
              </span>
            </li>
          ))}
      </ul>
      {lanes.length > 0 && (
        <ul aria-label="Ramos">
          {lanes.map(({ lane, label, tone }) => (
            <li key={`${lane}-${label}`} title={label}>
              <i className="trajectory-graph__swatch" style={laneStyle(lane, tone)} aria-hidden />
              <span className="trajectory-graph__legend-label">Ramo: {label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Rail({ entry, width, cut }: { entry: TrajectoryEntry; width: number; cut: boolean }) {
  const x = laneX(entry.lane)
  const main = laneX(0)
  return (
    <span className="trajectory-graph__rail" style={{ width }} data-cut={cut || undefined} aria-hidden>
      {entry.lines.map((line) => (
        <i
          key={line.lane}
          className="trajectory-graph__line"
          data-part={line.part}
          style={{ ...laneStyle(line.lane, line.tone), left: laneX(line.lane) - 1.5 }}
        />
      ))}
      <svg width={width} height={ROW} className="trajectory-graph__svg">
        {entry.fork && (
          <path className="trajectory-graph__curve" style={laneStyle(entry.lane, entry.tone)} d={`M${x} ${MID} C${x} ${MID + 12} ${main} ${MID + 8} ${main} ${ROW}`} />
        )}
        {entry.merge && (
          <path className="trajectory-graph__curve" style={laneStyle(entry.lane, entry.tone)} d={`M${x} ${MID} C${x} ${MID - 12} ${main} ${MID - 8} ${main} 0`} />
        )}
        <Marker type={entry.type} x={x} y={MID} lane={entry.lane} tone={entry.tone} />
      </svg>
    </span>
  )
}

/** Forum discussions opened from one of these notes, and, for the owner, a way to open one. */
type NoteForum = { discussions: Discussion[]; isOwner: boolean }

function EntryDetail({ entry, forum, editorId }: { entry: TrajectoryEntry; forum: NoteForum; editorId: string | null }) {
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
      {editorId && entry.record && <RecordVisibility ownerId={editorId} record={entry.record} />}
      {entry.type !== null && entry.project && (
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
        {entry.type ? `${recordTypeLabels[entry.type]} · ` : ''}
        {entry.origin}
        {entry.type === null && entry.project && (
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
              {entry.evidenceKind ? 'Abrir no GitHub' : 'Abrir o link'}
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

/**
 * The trajectory as a `git log --graph`: the member is the main line, each squad and each
 * validated competency is a branch that starts and ends in its own color, and each marker's shape tells the kind
 * of record. It opens with the newest records and never shows counts, streaks, or activity density.
 */
/** `editorId` is the owner's id while they read their own profile as themselves; it shows who sees each record. */
export function TrajectoryGraph({ graph, forum, editorId }: { graph: Graph; forum: NoteForum; editorId: string | null }) {
  const listId = useId()
  const [expanded, setExpanded] = useState(false)
  const { entries } = graph
  const visible = expanded ? entries : entries.slice(0, INITIAL)
  const hasMore = entries.length > INITIAL
  const width = laneX(graph.laneCount) + 10
  const types = [...new Set(entries.flatMap((entry) => (entry.type ? [entry.type] : [])))]

  return (
    <div className="trajectory-graph">
      <Legend types={types} lanes={graph.lanes} />
      <ol className="trajectory-graph__list" id={listId}>
        {visible.map((entry, i) => {
          const EvidenceIcon = entry.evidenceKind ? evidenceIcons[entry.evidenceKind] : null
          return (
            <li key={entry.id} className="trajectory-graph__row" data-type={entry.type ?? undefined}>
              <time dateTime={entry.date} className="trajectory-graph__date">
                {entry.dateLabel}
              </time>
              {/* Older records are hidden below: the lines fade out instead of ending. */}
              <Rail entry={entry} width={width} cut={!expanded && hasMore && i === visible.length - 1} />
              <Collapsible className="trajectory-graph__body">
                <CollapsibleTrigger className="trajectory-graph__trigger">
                  <span className="trajectory-graph__text">
                    <span className="trajectory-graph__title">
                      {entry.title}
                      {entry.notes.length > 0 && (
                        <MessageSquareText size={14} className="trajectory-graph__note-icon" aria-label="Tem nota do diário" />
                      )}
                    </span>
                    <span className="trajectory-graph__type" data-type={entry.type ?? 'branch'}>
                      {entry.type ? recordTypeLabels[entry.type] : 'Squad'}
                    </span>
                  </span>
                  {entry.badge && (
                    <Badge mono={entry.badge.mono} className="trajectory-graph__badge" title={entry.badge.text}>
                      {EvidenceIcon && <EvidenceIcon size={12} aria-hidden />}
                      {entry.badge.text}
                    </Badge>
                  )}
                  <ChevronDown size={16} className="trajectory-graph__chevron" aria-hidden />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <EntryDetail entry={entry} forum={forum} editorId={editorId} />
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
