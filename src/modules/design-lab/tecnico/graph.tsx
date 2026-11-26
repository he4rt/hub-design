import type { CSSProperties } from 'react'
import { recordTypeLabels, recordTypes, type BranchTone, type RecordType, type TrajectoryEntry, type TrajectoryGraph } from '@/lib/trajectory/graph'
import { Chip } from './parts'

/** What each marker on the line means, for the legend over the graph. */
const MEANINGS: Record<RecordType, string> = {
  declared: 'o membro informou',
  learning: 'curso, estudo ou artigo',
  experience: 'trabalho fora do Hub',
  demonstrated: 'commit, PR ou entrega aceita',
  validated: 'avaliada por um validador',
}

/*
 * The trajectory as a graph: the Traçado's line and node, the only place they branch. Read by the
 * profile's Trajetória tab and by the trajectory screen.
 */

const laneX = (lane: number) => 8 + lane * 16
const MID = 11
/**
 * The member's line in purple and the first squad branch in a lighter purple; validations in green,
 * the success of `estados.md`; later squad branches in blue, amber and gray, never green.
 */
const SQUAD_LANES = ['var(--ramo-roxo)', 'var(--info)', 'var(--aviso)', 'var(--ramal)']
const laneStyle = (lane: number, tone: BranchTone) =>
  ({
    '--lane': tone === 'validation' ? 'var(--sucesso)' : lane === 0 ? 'var(--linha-membro)' : SQUAD_LANES[(lane - 1) % SQUAD_LANES.length],
  }) as CSSProperties

/** The marker's shape tells the kind of proof: dashed, hollow, thick, filled, filled with a ring. */
export function Marker({ type, x, y, lane, tone }: { type: RecordType | null; x: number; y: number; lane: number; tone: BranchTone }) {
  return (
    <>
      {type === 'validated' && <circle className="txp-graph__ring" cx={x} cy={y} r={7.5} style={laneStyle(lane, 'validation')} />}
      <circle className="txp-graph__marker" data-type={type ?? 'branch'} cx={x} cy={y} r={4.5} style={laneStyle(lane, tone)} />
    </>
  )
}

/**
 * The trajectory as a `git log --graph`: the member is the main line, each squad and each validated
 * competency a branch in its own tone, and a legend saying what each marker and each branch is.
 */
export function Graph({ graph }: { graph: TrajectoryGraph }) {
  const width = laneX(graph.laneCount) + 10
  const types = recordTypes.filter((t) => graph.entries.some((e) => e.type === t.value))
  return (
    <div className="txp-graph" style={{ '--rail': `${width}px` } as CSSProperties}>
      <div className="txp-graph__legend">
        <ul aria-label="Tipos de registro">
          {types.map((t) => (
            <li key={t.value}>
              <svg width={18} height={18} aria-hidden>
                <Marker type={t.value} x={9} y={9} lane={0} tone={t.value === 'validated' ? 'validation' : 'main'} />
              </svg>
              <span>
                <b>{t.label}</b>: {MEANINGS[t.value]}
              </span>
            </li>
          ))}
        </ul>
        {graph.lanes.length > 0 && (
          <ul aria-label="Ramos">
            {graph.lanes.map(({ lane, label, tone }) => (
              <li key={`${lane}-${label}`} title={label}>
                <i className="txp-graph__swatch" style={laneStyle(lane, tone)} aria-hidden />
                <span className="txf-ellipsis">Ramo: {label}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <ol className="txp-graph__list">
        {graph.entries.map((entry) => (
          <GraphRow key={entry.id} entry={entry} width={width} />
        ))}
      </ol>
    </div>
  )
}

/** One record: the date, the rail with every line that passes this row, and the fact. */
function GraphRow({ entry, width }: { entry: TrajectoryEntry; width: number }) {
  const x = laneX(entry.lane)
  const main = laneX(0)
  return (
    <li className="txp-graph__row">
      <time dateTime={entry.date} className="txp-graph__date">
        {entry.dateLabel}
      </time>
      <span className="txp-graph__rail" aria-hidden>
        {entry.lines.map((line) => (
          <i
            key={line.lane}
            className="txp-graph__line"
            data-part={line.part}
            style={{ ...laneStyle(line.lane, line.tone), left: laneX(line.lane) - 1 }}
          />
        ))}
        <svg width={width} height={MID + 24} className="txp-graph__svg">
          {entry.fork && (
            <path className="txp-graph__curve" style={laneStyle(entry.lane, entry.tone)} d={`M${x} ${MID} C${x} ${MID + 14} ${main} ${MID + 10} ${main} ${MID + 24}`} />
          )}
          {entry.merge && (
            <path className="txp-graph__curve" style={laneStyle(entry.lane, entry.tone)} d={`M${x} ${MID} C${x} ${MID - 8} ${main} ${MID - 6} ${main} 0`} />
          )}
          <Marker type={entry.type} x={x} y={MID} lane={entry.lane} tone={entry.tone} />
        </svg>
      </span>
      <div className="txp-graph__body">
        <p className="tx-tl__title">{entry.title}</p>
        <p className="txp-tl__kind">
          {entry.type ? recordTypeLabels[entry.type] : 'Squad'}
          {entry.badge &&
            (entry.badge.mono ? <span className="tx-mono">{entry.badge.text}</span> : <Chip tone="neutral">{entry.badge.text}</Chip>)}
        </p>
        {entry.detail && <p className="tx-tl__text">{entry.detail}</p>}
      </div>
    </li>
  )
}
