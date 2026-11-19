import { Link, useSearchParams } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useDebugActions } from '@/debug/use-debug-actions'
import { db, newId, useDb } from '@/mocks/db'
import { activeMemberships } from '@/mocks/squads'
import './index.css'

type Filter = 'all' | 'active' | 'inactive'

/** Public list of squads, active and inactive. A squad is never deleted. */
export default function Index() {
  const [params, setParams] = useSearchParams()
  const filter = (params.get('status') as Filter | null) ?? 'all'
  const state = useDb((s) => s)
  const squads = state.squads.filter((squad) => filter === 'all' || squad.status === filter)

  useDebugActions('Squads', [
    {
      label: 'Criar 20 squads inativos',
      run: () =>
        db.set((s) => ({
          ...s,
          squads: [
            ...s.squads,
            ...Array.from({ length: 20 }, (_, i) => {
              const id = newId()
              return {
                id,
                slug: `squad-${id}`,
                name: `Squad de teste ${i + 1} com um nome bem comprido para testar o corte`,
                description: 'Gerado pelo painel de debug.',
                captainId: null,
                status: 'inactive' as const,
                createdAt: new Date().toISOString(),
              }
            }),
          ],
        })),
    },
    {
      label: 'Deixar todos inativos',
      run: () => db.set((s) => ({ ...s, squads: s.squads.map((sq) => ({ ...sq, status: 'inactive' as const })) })),
    },
    {
      label: 'Tirar o capitão da Loja (vacancy)',
      run: () =>
        db.set((s) => ({ ...s, squads: s.squads.map((sq) => (sq.id === 's1' ? { ...sq, captainId: null } : sq)) })),
    },
  ])

  return (
    <main className="squads-index">
      <header className="squads-index__header">
        <div>
          <h1>Squads</h1>
          <p>Times de projeto em repositórios da He4rt, conduzidos por um capitão.</p>
        </div>
        <ToggleGroup
          type="single"
          value={filter}
          aria-label="Filtrar squads"
          onValueChange={(value) => {
            if (!value) return
            setParams(value === 'all' ? {} : { status: value }, { replace: true })
          }}
        >
          <ToggleGroupItem value="all">Todos</ToggleGroupItem>
          <ToggleGroupItem value="active">Ativos</ToggleGroupItem>
          <ToggleGroupItem value="inactive">Inativos</ToggleGroupItem>
        </ToggleGroup>
      </header>

      {squads.length === 0 ? (
        <Card>
          <p className="squads-index__muted">Nenhum squad {filter === 'active' ? 'ativo' : 'inativo'} agora.</p>
        </Card>
      ) : (
        <ul className="squads-index__list">
          {squads.map((squad) => {
            const project = state.projects.find((p) => p.squadId === squad.id && p.status !== 'ended')
            const captain = state.users.find((u) => u.id === squad.captainId)
            const free = project ? project.seats - activeMemberships(state, project.id).length : 0
            return (
              <li key={squad.id}>
                <Link to={`/squads/${squad.slug}`} className="squads-index__item">
                  <div className="squads-index__title">
                    <h2 title={squad.name}>{squad.name}</h2>
                    <Badge tone={squad.status === 'active' ? 'success' : 'neutral'}>
                      {squad.status === 'active' ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                  <p className="squads-index__goal">{project?.goal ?? squad.description}</p>
                  <p className="squads-index__meta">
                    {captain ? `Capitão: ${captain.name}` : 'Vacancy: sem capitão'}
                    {project && (
                      <>
                        {' · '}
                        {project.stack.join(', ')}
                        {' · '}
                        <span className="squads-index__num">{free}</span> {free === 1 ? 'lugar livre' : 'lugares livres'}
                      </>
                    )}
                  </p>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}
