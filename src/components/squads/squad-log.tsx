import { TrailLog, TrailLogItem } from '@/components/ui/trail-log'
import type { SquadLogEntry, Project, User } from '@/mocks/db'
import { formatDate, LOG_LABELS } from '@/mocks/squads'
import './squad-log.css'

/** Dot color of each event family: joined or started move, accepted succeeds, the rest is past. */
const TONES: Record<SquadLogEntry['kind'], 'success' | 'move' | 'warning' | 'past'> = {
  'project-started': 'move',
  'project-ended': 'past',
  'member-joined': 'move',
  'member-left': 'past',
  'member-removed': 'past',
  'member-reassigned': 'past',
  'captain-changed': 'past',
  'delivery-accepted': 'success',
}

/** Permanent log of a squad, newest first: what happened, who did it and why. */
export function SquadLog({
  entries,
  projects,
  users,
}: {
  entries: SquadLogEntry[]
  projects: Project[]
  users: User[]
}) {
  if (entries.length === 0) return <p className="squad-log__empty">Nada registrado ainda.</p>

  const name = (id: string | null) => users.find((u) => u.id === id)?.name ?? 'Membro removido'
  const sorted = [...entries].sort((a, b) => b.at.localeCompare(a.at))

  return (
    <TrailLog className="squad-log">
      {sorted.map((entry) => {
        const about = [entry.subjectId && name(entry.subjectId), entry.detail].filter(Boolean).join(', ')
        return (
          <TrailLogItem
            key={entry.id}
            tone={TONES[entry.kind]}
            title={about ? `${LOG_LABELS[entry.kind]}: ${about}` : LOG_LABELS[entry.kind]}
            meta={
              <>
                {projects.find((p) => p.id === entry.projectId)?.name ?? 'Squad'}, por {name(entry.actorId)}, em{' '}
                <time className="squad-log__date" dateTime={entry.at}>
                  {formatDate(entry.at)}
                </time>
              </>
            }
          >
            {entry.reason && <p className="squad-log__reason">Motivo: {entry.reason}</p>}
          </TrailLogItem>
        )
      })}
    </TrailLog>
  )
}
