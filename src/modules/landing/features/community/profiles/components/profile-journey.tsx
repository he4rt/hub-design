import type { JourneyStage } from '@/mocks/db'
import './profile-journey.css'

const STAGES: { value: JourneyStage; label: string }[] = [
  { value: 'member', label: 'Membro' },
  { value: 'prepared', label: 'Preparado' },
  { value: 'practicing', label: 'Praticante' },
  { value: 'delivered', label: 'Com entrega' },
  { value: 'validated', label: 'Validado' },
]

/**
 * The journey as a short purple line in the side column: the stages reached are filled, the
 * current one has a ring, the rest of the line is dashed ahead.
 */
export function ProfileJourney({ stage, own }: { stage: JourneyStage; own: boolean }) {
  const current = STAGES.findIndex((s) => s.value === stage)
  return (
    <section className="profile-journey" aria-labelledby="profile-journey-title">
      <h2 id="profile-journey-title">{own ? 'Sua jornada' : 'Jornada'}</h2>
      <ol aria-label={`Estágio atual: ${STAGES[current].label}, ${current + 1} de ${STAGES.length}`}>
        {STAGES.map((s, i) => (
          <li key={s.value} data-state={i < current ? 'done' : i === current ? 'current' : 'future'}>
            <span className="profile-journey__node" aria-hidden />
            {s.label}
          </li>
        ))}
      </ol>
    </section>
  )
}
