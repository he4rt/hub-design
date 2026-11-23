import type { SquadDelivery, User } from '@/mocks/db'
import { formatDate } from '@/mocks/squads'
import './delivery-history.css'

/** Previous decisions remain visible to participants after work is resubmitted or accepted. */
export function DeliveryHistory({ delivery, users }: { delivery: SquadDelivery; users: User[] }) {
  if (!delivery.decisions?.length) return null
  return (
    <section className="delivery-history" aria-label="Histórico de decisões">
      <h3>Histórico de decisões</h3>
      <ul>
        {delivery.decisions.map((entry) => (
          <li key={entry.id}>
            <p className="delivery-history__decision">{entry.decision === 'accepted' ? 'Aceita' : 'Devolvida'} por {users.find((u) => u.id === entry.actorId)?.name ?? 'Staff'} em {formatDate(entry.at)}.</p>
            <p>{entry.reason}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
