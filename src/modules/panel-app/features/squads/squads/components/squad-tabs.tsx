import { NavLink } from 'react-router'
import type { SquadTeam } from '@/mocks/db'
import './squad-tabs.css'

/** Sections of "Meu squad"; the captain's ones show only to whoever can manage the squad. */
export function SquadTabs({ squad, manager, counts }: { squad: SquadTeam; manager: boolean; counts: { applications: number; deliveries: number } }) {
  const base = `/app/squads/${squad.slug}`
  return (
    <nav className="squad-tabs" aria-label="Seções do squad">
      <NavLink to={base} end>
        Meu squad
      </NavLink>
      {manager && (
        <>
          <NavLink to={`${base}/applications`}>
            Candidaturas <span className="squad-tabs__count">{counts.applications}</span>
          </NavLink>
          <NavLink to={`${base}/deliveries`}>
            Entregas para aceitar <span className="squad-tabs__count">{counts.deliveries}</span>
          </NavLink>
          <NavLink to={`${base}/members`}>Membros</NavLink>
        </>
      )}
    </nav>
  )
}
