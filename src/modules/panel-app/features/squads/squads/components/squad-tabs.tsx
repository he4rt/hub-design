import { NavLink, useLocation } from 'react-router'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Squad } from '@/mocks/db'
import './squad-tabs.css'

/** Sections of "Meu squad"; the captain's ones show only to whoever can manage the squad. */
export function SquadTabs({
  squad,
  manager,
  counts,
}: {
  squad: Squad
  manager: boolean
  counts: { applications: number; deliveries: number; members: number }
}) {
  const { pathname } = useLocation()
  const base = `/app/squads/${squad.slug}`
  const section = pathname.slice(base.length + 1).split('/')[0] || 'board'
  return (
    <Tabs value={section} activationMode="manual" className="squad-tabs">
      <TabsList variant="line" aria-label="Seções do squad">
        <TabsTrigger value="board" asChild>
          <NavLink to={base} end>
            Meu squad
          </NavLink>
        </TabsTrigger>
        {manager && (
          <>
            <TabsTrigger value="applications" asChild>
              <NavLink to={`${base}/applications`}>Candidaturas ({counts.applications})</NavLink>
            </TabsTrigger>
            <TabsTrigger value="deliveries" asChild>
              <NavLink to={`${base}/deliveries`}>Entregas ({counts.deliveries})</NavLink>
            </TabsTrigger>
            <TabsTrigger value="members" asChild>
              <NavLink to={`${base}/members`}>Membros ({counts.members})</NavLink>
            </TabsTrigger>
          </>
        )}
      </TabsList>
    </Tabs>
  )
}
