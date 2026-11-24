import { useId, useState, type CSSProperties } from 'react'
import { Link, useSearchParams } from 'react-router'
import { ChevronDown, ExternalLink, FolderGit2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { evidenceIcons } from '@/lib/evidence'
import { recordTypeLabels, recordTypes, type BranchTone, type RecordType, type TrajectoryEntry, type TrajectoryGraph as Graph } from '@/lib/trajectory/graph'
import { RecordVisibility } from './record-visibility'
import './trajectory-graph.css'

/** Records shown before "Ver trajetória completa". */
const INITIAL = 8
const ROW = 48
const MID = ROW / 2
const laneX = (lane: number) => 10 + lane * 16
/**
 * The main line in the primary color; each squad in its own metro-line color. A validation draws in the
 * text color, the strongest stroke, with a ring: the strongest proof, without looking like a badge.
 */
const laneColor = (lane: number, tone: BranchTone) =>
  tone === 'validation'
    ? 'var(--text)'
    : lane === 0
      ? 'var(--brand)'
      : `var(--lane-${((lane - 1) % 5) + 1})`
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

/** The kinds of record present, as filters that carry their marker; then one line per branch with its color. */
function Filters({ types, lanes, value, onChange }: { types: RecordType[]; lanes: Graph['lanes']; value: RecordType | 'all'; onChange: (value: RecordType | 'all') => void }) {
  return (
    <div className="trajectory-graph__legend">
      <ToggleGroup type="single" variant="chips" value={value} aria-label="Tipos de registro" onValueChange={(next) => next && onChange(next as RecordType | 'all')}>
        <ToggleGroupItem value="all">Tudo</ToggleGroupItem>
        {recordTypes
          .filter((t) => types.includes(t.value))
          .map((t) => (
            <ToggleGroupItem key={t.value} value={t.value} title={t.label}>
              <svg width={18} height={18} aria-hidden className="trajectory-graph__filter-marker">
                <Marker type={t.value} x={9} y={9} lane={0} tone={t.value === 'validated' ? 'validation' : 'main'} />
              </svg>
              {t.filter}
            </ToggleGroupItem>
          ))}
      </ToggleGroup>
      {lanes.length > 0 && (
        <ul aria-label="Ramos">
          {lanes.map(({ lane, label, tone }) => (
            <li key={`${lane}-${label}`} title={label}>
              <i className="trajectory-graph__swatch" style={laneStyle(lane, tone)} aria-hidden />
              <span className="trajectory-graph__legend-label">{label}</span>
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

function EntryDetail({ entry, editorId }: { entry: TrajectoryEntry; editorId: string | null }) {
  const EvidenceIcon = entry.evidenceKind ? evidenceIcons[entry.evidenceKind] : null
  return (
    <div className="trajectory-graph__detail">
      {EvidenceIcon && entry.reference && (
        <Card variant="inset" className="trajectory-graph__reference">
          <p title={entry.reference}>
            <EvidenceIcon size={16} aria-hidden />
            <code>{entry.reference}</code>
          </p>
          {entry.url && (
            <a href={entry.url} target="_blank" rel="noreferrer">
              Abrir no GitHub
              <ExternalLink size={12} aria-hidden />
            </a>
          )}
        </Card>
      )}
      {entry.detail && <p className="trajectory-graph__detail-text">{entry.detail}</p>}
      {entry.project && (
        <p className="trajectory-graph__project">
          <FolderGit2 size={14} aria-hidden />
          <Link to={entry.project.path}>{entry.project.label}</Link>
        </p>
      )}
      {/* The kind is already under the title: the footer says where the record came from, its link and who sees it. */}
      <div className="trajectory-graph__footer">
        <p className="trajectory-graph__origin">{entry.origin}</p>
        <div className="trajectory-graph__footer-actions">
          {entry.url && !(EvidenceIcon && entry.reference) && (
            <a href={entry.url} target="_blank" rel="noreferrer" className="trajectory-graph__link">
              {entry.evidenceKind ? 'Abrir no GitHub' : 'Abrir o link'}
              <ExternalLink size={12} aria-hidden />
            </a>
          )}
          {/* Records the member wrote are edited in the settings, where they were registered. */}
          {editorId && entry.record && !['Concluído na Basement'].includes(entry.origin) && (
            <Link to="/app/settings/profile#trajectory" className="trajectory-graph__link">
              Editar
            </Link>
          )}
          {editorId && entry.record && <RecordVisibility ownerId={editorId} record={entry.record} />}
        </div>
      </div>
    </div>
  )
}

/**
 * The trajectory as a `git log --graph`: the member is the main line, each squad and each
 * validated competency is a branch that starts and ends in its own color, and each marker's shape tells the kind
 * of record. It opens with the newest records and never shows counts, streaks, or activity density.
 */
/** `editorId` is the owner's id while they read their own profile as themselves; it shows who sees each record. */
export function TrajectoryGraph({ graph, editorId }: { graph: Graph; editorId: string | null }) {
  const listId = useId()
  const [expanded, setExpanded] = useState(false)
  const [params, setParams] = useSearchParams()
  const types = [...new Set(graph.entries.flatMap((entry) => (entry.type ? [entry.type] : [])))]
  const filter = types.find((t) => t === params.get('tipo')) ?? 'all'
  const setFilter = (next: RecordType | 'all') =>
    setParams((current) => {
      const result = new URLSearchParams(current)
      if (next === 'all') result.delete('tipo')
      else result.set('tipo', next)
      return result
    }, { replace: true })
  // A filter shows only the records of that kind; squad joins and leaves go with the evidence.
  const entries = filter === 'all' ? graph.entries : graph.entries.filter((entry) => entry.type === filter || (entry.type === null && filter === 'demonstrated'))
  const visible = expanded ? entries : entries.slice(0, INITIAL)
  const hasMore = entries.length > INITIAL
  const width = laneX(graph.laneCount) + 10

  return (
    <div className="trajectory-graph">
      <Filters types={types} lanes={graph.lanes} value={filter} onChange={setFilter} />
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
                  <EntryDetail entry={entry} editorId={editorId} />
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
          <ChevronDown size={16} aria-hidden />
          {expanded ? 'Mostrar só os mais recentes' : 'Ver trajetória completa'}
        </Button>
      )}
    </div>
  )
}
