import { Fragment, useId, type CSSProperties, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Check, ChevronDown, CircleHelp, ExternalLink, FolderGit2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { evidenceIcons } from '@/lib/evidence'
import { recordTypeLabels, recordTypes, type BranchTone, type RecordType, type TrajectoryEntry, type TrajectoryGraph as Graph } from '@/lib/trajectory/graph'
import { RecordVisibility } from './record-visibility'
import './trajectory-graph.css'

/** Records shown at first, and how many more each "Carregar mais" adds. */
const PAGE = 8
const ROW = 48
const MID = ROW / 2
/** Lanes sit close together, so many squads at once still leave the text its room. */
const laneX = (lane: number) => 8 + lane * 10
/** Between two years: a title row the lanes run through, so the line never breaks. */
function YearRow({ year, next, width }: { year: string; next: TrajectoryEntry; width: number }) {
  return (
    <li className="trajectory-graph__year" aria-hidden>
      <span className="trajectory-graph__year-label">{year}</span>
      <span className="trajectory-graph__rail" style={{ width }}>
        {next.lines
          .filter((line) => line.part !== 'bottom')
          .map((line) => (
            <i key={line.lane} className="trajectory-graph__line" data-part="full" style={{ ...laneStyle(line.color, line.tone), left: laneX(line.lane) - 1.5 }} />
          ))}
      </span>
      <span />
    </li>
  )
}

/**
 * The member's line in purple; each squad branch in its own metro color, except green, which is the
 * validation's: the strongest proof, drawn with a ring.
 */
const SQUAD_LANES = ['var(--lane-1)', 'var(--lane-3)', 'var(--lane-4)', 'var(--lane-5)', 'var(--lane-6)', 'var(--lane-7)']
/** Colors follow the branch, not its lane: a squad that reuses an ended squad's lane keeps its own color. */
const laneColor = (color: number, tone: BranchTone) =>
  tone === 'validation' ? 'var(--success-text)' : color === 0 ? 'var(--brand)' : SQUAD_LANES[(color - 1) % SQUAD_LANES.length]
const laneStyle = (color: number, tone: BranchTone) => ({ '--lane': laneColor(color, tone) }) as CSSProperties

/** The marker's shape tells the kind of record: dashed, hollow, filled, filled with a ring. */
function Marker({ type, x, y, color, tone }: { type: RecordType | null; x: number; y: number; color: number; tone: BranchTone }) {
  return (
    <>
      {type === 'validated' && <circle className="trajectory-graph__ring" cx={x} cy={y} r={7.5} style={laneStyle(color, 'validation')} />}
      <circle className="trajectory-graph__marker" data-type={type ?? 'branch'} cx={x} cy={y} r={4.5} style={laneStyle(color, tone)} />
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

type Option = { value: string; label: string; lane?: { color: number; tone: BranchTone } }

/** A quiet menu that narrows the line to one value, such as a branch or a year; "Todos" clears it. */
function FilterMenu({ name, options, value, onChange, className }: { name: string; options: Option[]; value: string | null; onChange: (value: string | null) => void; className?: string }) {
  const current = options.find((option) => option.value === value)
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className={className ? `trajectory-graph__filter ${className}` : 'trajectory-graph__filter'} data-active={current ? '' : undefined} title={current?.label}>
          {current?.lane && <i className="trajectory-graph__swatch" style={laneStyle(current.lane.color, current.lane.tone)} aria-hidden />}
          <span className="trajectory-graph__filter-label">{current ? current.label : name}</span>
          <ChevronDown size={14} aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" aria-label={name}>
        {[{ value: '', label: 'Todos' } as Option, ...options].map((option) => (
          <DropdownMenuItem key={option.value} onSelect={() => onChange(option.value || null)}>
            <Check size={16} aria-hidden style={{ visibility: option.value === (value ?? '') ? 'visible' : 'hidden' }} />
            {option.lane && <i className="trajectory-graph__swatch" style={laneStyle(option.lane.color, option.lane.tone)} aria-hidden />}
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
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
  filters,
}: {
  types: RecordType[]
  filters: ReactNode
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
              <Marker type={t.value} x={7} y={7} color={0} tone={t.value === 'validated' ? 'validation' : 'main'} />
            </svg>
            {t.filter}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <div className="trajectory-graph__toolbar-end">
        {filters}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="trajectory-graph__legend-trigger" aria-label="Legenda">
              <CircleHelp size={16} aria-hidden />
              <span className="trajectory-graph__legend-text">Legenda</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" aria-label="Legenda da trajetória" className="trajectory-graph__legend">
            <ul aria-label="O que cada marcador significa">
              {present.map((t) => (
                <li key={t.value}>
                  <svg width={18} height={18} aria-hidden>
                    <Marker type={t.value} x={9} y={9} color={0} tone={t.value === 'validated' ? 'validation' : 'main'} />
                  </svg>
                  <span>
                    <strong>{t.label}</strong>: {MEANINGS[t.value]}
                  </span>
                </li>
              ))}
            </ul>
            {lanes.length > 0 && (
              <ul aria-label="Ramos">
                {lanes.map(({ id, color, label, tone }) => (
                  <li key={id} title={label}>
                    <i className="trajectory-graph__swatch" style={laneStyle(color, tone)} aria-hidden />
                    <span className="trajectory-graph__legend-label">{label}</span>
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
          style={{ ...laneStyle(line.color, line.tone), left: laneX(line.lane) - 1.5 }}
        />
      ))}
      <svg width={width} height={ROW} className="trajectory-graph__svg">
        {entry.fork && (
          <path className="trajectory-graph__curve" style={laneStyle(entry.color, entry.tone)} d={`M${x} ${MID} C${x} ${MID + 12} ${main} ${MID + 8} ${main} ${ROW}`} />
        )}
        {entry.merge && (
          <path className="trajectory-graph__curve" style={laneStyle(entry.color, entry.tone)} d={`M${x} ${MID} C${x} ${MID - 12} ${main} ${MID - 8} ${main} 0`} />
        )}
        <Marker type={entry.type} x={x} y={MID} color={entry.color} tone={entry.tone} />
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
              <Link to="/app/settings/profile?aba=trajetoria" className="trajectory-graph__link">
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
  const branches = graph.lanes.filter((lane) => graph.entries.some((entry) => entry.branch === lane.id))
  const branch = branches.find((b) => b.id === params.get('ramo'))?.id ?? null
  const years = [...new Set(graph.entries.map((entry) => entry.date.slice(0, 4)))]
  const year = years.find((y) => y === params.get('ano')) ?? null
  const setParam = (key: 'tipo' | 'ramo' | 'ano', next: string | null) =>
    setParams((current) => {
      const result = new URLSearchParams(current)
      if (next === null) result.delete(key)
      else result.set(key, next)
      // Another filter starts from its newest records again.
      result.delete('limit')
      return result
    }, { replace: true, preventScrollReset: true })
  const setFilter = (next: RecordType | 'all') => setParam('tipo', next === 'all' ? null : next)
  const clearFilters = () =>
    setParams((current) => {
      const result = new URLSearchParams(current)
      for (const key of ['tipo', 'ramo', 'ano', 'limit']) result.delete(key)
      return result
    }, { replace: true, preventScrollReset: true })
  const loadMore = () =>
    setParams((current) => {
      current.set('limit', String(limit + PAGE))
      return current
    }, { replace: true, preventScrollReset: true })
  // A filter shows only the records of that kind; squad joins and leaves go with the evidence.
  const entries = graph.entries
    .filter((entry) => filter === 'all' || entry.type === filter || (entry.type === null && filter === 'demonstrated'))
    .filter((entry) => branch === null || entry.branch === branch)
    .filter((entry) => year === null || entry.date.startsWith(year))
  const visible = entries.slice(0, limit)
  const hasMore = entries.length > visible.length
  const width = laneX(graph.laneCount) + 10

  return (
    <div className="trajectory-graph">
      <Toolbar
        types={types}
        lanes={graph.lanes}
        value={filter}
        onChange={setFilter}
        action={action}
        filters={
          <>
            {/* On a phone the kinds are a menu like Ramo and Ano: chips would need sideways scrolling. */}
            <FilterMenu
                className="trajectory-graph__type-menu"
                name="Tipo"
                options={recordTypes.filter((t) => types.includes(t.value)).map((t) => ({ value: t.value, label: t.filter }))}
                value={filter === 'all' ? null : filter}
                onChange={(next) => setParam('tipo', next)}
              />
            {branches.length > 0 && (
              <FilterMenu
                name="Ramo"
                options={branches.map((b) => ({ value: b.id, label: b.label, lane: { color: b.color, tone: b.tone } }))}
                value={branch}
                onChange={(next) => setParam('ramo', next)}
              />
            )}
            {years.length > 1 && (
              <FilterMenu name="Ano" options={years.map((y) => ({ value: y, label: y }))} value={year} onChange={(next) => setParam('ano', next)} />
            )}
          </>
        }
      />
      {entries.length === 0 && (
        <div className="trajectory-graph__none">
          <p>Nenhum registro com esses filtros.</p>
          <Button variant="secondary" size="sm" onClick={clearFilters}>
            Limpar filtros
          </Button>
        </div>
      )}
      {/* With more below, the last rows fade into the button that brings them. */}
      <ol className="trajectory-graph__list" id={listId} data-more={hasMore || undefined}>
        {visible.map((entry, i) => {
          const EvidenceIcon = entry.evidenceKind ? evidenceIcons[entry.evidenceKind] : null
          // The year is a title over its records; each record keeps its month, to follow the progress.
          const year = entry.date.slice(0, 4)
          const newYear = i === 0 || visible[i - 1].date.slice(0, 4) !== year
          return (
            <Fragment key={entry.id}>
            {newYear && <YearRow year={year} next={entry} width={width} />}
            <li className="trajectory-graph__row" data-type={entry.type ?? undefined}>
              <time dateTime={entry.date} className="trajectory-graph__date" title={entry.dateLabel}>
                {entry.dateLabel.split(' ')[0]}
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
            </Fragment>
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
