import { useId, type CSSProperties, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import { ChevronDown, CircleHelp, ExternalLink, FolderGit2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { evidenceIcons } from '@/lib/evidence'
import { recordTypeLabels, recordTypes, type BranchTone, type RecordType, type TrajectoryEntry, type TrajectoryGraph as Graph } from '@/lib/trajectory/graph'
import { RecordVisibility } from './record-visibility'
import './trajectory-graph.css'

/** Records shown at first, and how many more each "Carregar mais" adds. */
const PAGE = 8
const ROW = 48
const MID = ROW / 2
const laneX = (lane: number) => 10 + lane * 16
/**
 * The member's line in purple and the first squad branch in a lighter purple; later squads in the
 * metro colors except green, which is the validation's: the strongest proof, drawn with a ring.
 */
const SQUAD_LANES = ['var(--trajectory-branch)', 'var(--lane-1)', 'var(--lane-3)', 'var(--lane-4)', 'var(--lane-5)']
const laneColor = (lane: number, tone: BranchTone) =>
  tone === 'validation' ? 'var(--success-text)' : lane === 0 ? 'var(--brand)' : SQUAD_LANES[(lane - 1) % SQUAD_LANES.length]
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

/** What each marker on the line means, for the legend over the graph. */
const MEANINGS: Record<RecordType, string> = {
  declared: 'o membro informou',
  learning: 'curso, estudo ou artigo',
  experience: 'trabalho fora do Hub',
  demonstrated: 'commit, PR ou entrega aceita',
  validated: 'avaliada por um validador',
}

/**
 * For the owner, a line on how the trajectory fills with "Novo registro" beside it. Then one quiet
 * bar: the kinds as filters, each with its marker; what each marker and branch means opens on
 * demand, so the line itself leads.
 */
function Toolbar({
  types,
  lanes,
  value,
  onChange,
  action,
}: {
  types: RecordType[]
  lanes: Graph['lanes']
  value: RecordType | 'all'
  onChange: (value: RecordType | 'all') => void
  action: ReactNode
}) {
  const present = recordTypes.filter((t) => types.includes(t.value))
  return (
    <>
    {action && (
      <div className="trajectory-graph__head">
        <p>Do mais recente ao mais antigo. Entregas e validações entram sozinhas.</p>
        {action}
      </div>
    )}
    <div className="trajectory-graph__toolbar">
      <ToggleGroup type="single" variant="chips" value={value} aria-label="Tipos de registro" onValueChange={(next) => next && onChange(next as RecordType | 'all')}>
        <ToggleGroupItem value="all">Tudo</ToggleGroupItem>
        {present.map((t) => (
          <ToggleGroupItem key={t.value} value={t.value} title={`${t.label}: ${MEANINGS[t.value]}`}>
            <svg width={14} height={14} aria-hidden className="trajectory-graph__chip-marker">
              <Marker type={t.value} x={7} y={7} lane={0} tone={t.value === 'validated' ? 'validation' : 'main'} />
            </svg>
            {t.filter}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <div className="trajectory-graph__toolbar-end">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="trajectory-graph__legend-trigger">
              <CircleHelp size={16} aria-hidden />
              Legenda
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" aria-label="Legenda da trajetória" className="trajectory-graph__legend">
            <ul aria-label="O que cada marcador significa">
              {present.map((t) => (
                <li key={t.value}>
                  <svg width={18} height={18} aria-hidden>
                    <Marker type={t.value} x={9} y={9} lane={0} tone={t.value === 'validated' ? 'validation' : 'main'} />
                  </svg>
                  <span>
                    <strong>{t.label}</strong>: {MEANINGS[t.value]}
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
          </PopoverContent>
        </Popover>
      </div>
    </div>
    </>
  )
}

function Rail({ entry, width }: { entry: TrajectoryEntry; width: number }) {
  const x = laneX(entry.lane)
  const main = laneX(0)
  return (
    <span className="trajectory-graph__rail" style={{ width }} aria-hidden>
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

/**
 * The open record: its text, then one line with its project, where it came from (the link, when it has one)
 * and, for the owner, "Editar" and who sees it. The title, kind, reference and date are already in the row.
 */
function EntryDetail({ entry, editorId }: { entry: TrajectoryEntry; editorId: string | null }) {
  // Records the member wrote are edited in the settings, where they were registered.
  const editable = editorId && entry.record && entry.origin !== 'Concluído na Basement'
  return (
    <div className="trajectory-graph__detail">
      {entry.detail && <p className="trajectory-graph__detail-text">{entry.detail}</p>}
      <div className="trajectory-graph__footer">
        <p className="trajectory-graph__origin">
          {entry.project && (
            <Link to={entry.project.path} className="trajectory-graph__project" title={entry.project.label}>
              <FolderGit2 size={14} aria-hidden />
              <span>{entry.project.label}</span>
            </Link>
          )}
          {entry.url ? (
            <a href={entry.url} target="_blank" rel="noreferrer" className="trajectory-graph__link">
              {entry.origin || 'Abrir o link'}
              <ExternalLink size={12} aria-hidden />
            </a>
          ) : (
            entry.origin && <span>{entry.origin}</span>
          )}
        </p>
        {editorId && entry.record && (
          <div className="trajectory-graph__footer-actions">
            {editable && (
              <Link to="/app/settings/profile#trajectory" className="trajectory-graph__link">
                Editar
              </Link>
            )}
            <RecordVisibility ownerId={editorId} record={entry.record} />
          </div>
        )}
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
export function TrajectoryGraph({ graph, editorId, action }: { graph: Graph; editorId: string | null; action?: ReactNode }) {
  const listId = useId()
  const [params, setParams] = useSearchParams()
  const limit = Math.max(PAGE, Number(params.get('limit')) || PAGE)
  const types = [...new Set(graph.entries.flatMap((entry) => (entry.type ? [entry.type] : [])))]
  const filter = types.find((t) => t === params.get('tipo')) ?? 'all'
  const setFilter = (next: RecordType | 'all') =>
    setParams((current) => {
      const result = new URLSearchParams(current)
      if (next === 'all') result.delete('tipo')
      else result.set('tipo', next)
      // Another kind starts from its newest records again.
      result.delete('limit')
      return result
    }, { replace: true, preventScrollReset: true })
  const loadMore = () =>
    setParams((current) => {
      current.set('limit', String(limit + PAGE))
      return current
    }, { replace: true, preventScrollReset: true })
  // A filter shows only the records of that kind; squad joins and leaves go with the evidence.
  const entries = filter === 'all' ? graph.entries : graph.entries.filter((entry) => entry.type === filter || (entry.type === null && filter === 'demonstrated'))
  const visible = entries.slice(0, limit)
  const hasMore = entries.length > visible.length
  const width = laneX(graph.laneCount) + 10

  return (
    <div className="trajectory-graph">
      <Toolbar types={types} lanes={graph.lanes} value={filter} onChange={setFilter} action={action} />
      {/* With more below, the last rows fade into the button that brings them. */}
      <ol className="trajectory-graph__list" id={listId} data-more={hasMore || undefined}>
        {visible.map((entry) => {
          const EvidenceIcon = entry.evidenceKind ? evidenceIcons[entry.evidenceKind] : null
          return (
            <li key={entry.id} className="trajectory-graph__row" data-type={entry.type ?? undefined}>
              <time dateTime={entry.date} className="trajectory-graph__date">
                {entry.dateLabel}
              </time>
              <Rail entry={entry} width={width} />
              <Collapsible className="trajectory-graph__body">
                <CollapsibleTrigger className="trajectory-graph__trigger">
                  <span className="trajectory-graph__text">
                    <span className="trajectory-graph__title">
                      {entry.title}
                    </span>
                    {/* The kind, then its reference: a GitHub reference in purple mono, anything else a tag. */}
                    <span className="trajectory-graph__type" data-type={entry.type ?? 'branch'}>
                      {entry.type ? recordTypeLabels[entry.type] : 'Squad'}
                      {entry.badge &&
                        (entry.badge.mono ? (
                          <span className="trajectory-graph__ref" title={entry.reference ?? entry.badge.text}>
                            {EvidenceIcon && <EvidenceIcon size={12} aria-hidden />}
                            {entry.badge.text}
                          </span>
                        ) : (
                          <Badge className="trajectory-graph__badge" title={entry.reference ?? entry.badge.text}>
                            {EvidenceIcon && <EvidenceIcon size={12} aria-hidden />}
                            {entry.badge.text}
                          </Badge>
                        ))}
                    </span>
                  </span>
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
        <Button variant="secondary" className="trajectory-graph__more" aria-controls={listId} onClick={loadMore}>
          Carregar mais
        </Button>
      )}
    </div>
  )
}
