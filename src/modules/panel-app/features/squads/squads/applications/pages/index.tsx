import { useSearchParams } from 'react-router'
import { NotFound } from '@/components/not-found'
import { PageHeader } from '@/components/page-header'
import { StateChip } from '@/components/state-chip'
import { Card } from '@/components/ui/card'
import { useDebugActions } from '@/debug/use-debug-actions'
import { db, newId } from '@/mocks/db'
import { formatDate, freeSeats } from '@/mocks/squads'
import { SquadTabs } from '../../components/squad-tabs'
import { useSquadPage } from '../../hooks/use-squad-page'
import { ApplicationReview } from '../components/application-review'
import './index.css'
import '@/components/stack-page.css'

/** Captain's tab: pick applicants by hand, reading each one's profile and answers. */
export default function Index() {
  const { state, userId, squad, project, manager, counts } = useSquadPage()
  const [params, setParams] = useSearchParams()

  useDebugActions('Candidaturas', [
    {
      label: 'Gerar 30 candidaturas',
      run: () =>
        db.set((s) => ({
          ...s,
          applications: [
            ...s.applications,
            ...Array.from({ length: 30 }, (_, i) => ({
              id: newId(),
              projectId: project?.id ?? 'p1',
              userId: i % 2 ? 'u11' : 'u3',
              answers: [{ questionId: 'q1', answer: 'Quero praticar trabalho em time e revisão de código com gente experiente.' }],
              status: 'pending' as const,
              notes: null,
              decision: null,
              githubInvite: 'not-needed' as const,
              createdAt: new Date(Date.now() - i * 3_600_000).toISOString(),
            })),
          ],
        })),
    },
    { label: 'Entrar como Rafael (capitão)', run: () => db.set((s) => ({ ...s, session: { userId: 'u6' } })) },
    { label: 'Entrar como Ana (não é capitã)', run: () => db.set((s) => ({ ...s, session: { userId: 'u2' } })) },
  ])

  if (!squad || !manager) return <NotFound />

  const apps = state.applications
    .filter((a) => a.projectId === project?.id)
    .sort((a, b) => Number(b.status === 'pending') - Number(a.status === 'pending') || a.createdAt.localeCompare(b.createdAt))
  const selected = apps.find((a) => a.id === params.get('application')) ?? apps.find((a) => a.status === 'pending') ?? apps[0]

  return (
    <div className="stack-page">
      <PageHeader
        title={squad.name}
        description={project ? `${project.name}: ${freeSeats(state, project)} de ${project.seats} lugares livres` : 'Sem projeto ativo.'}
      />
      <SquadTabs squad={squad} manager={manager} counts={counts} />
      {apps.length === 0 ? (
        <Card>
          <p className="stack-page__muted">Nenhuma candidatura para este projeto ainda.</p>
        </Card>
      ) : (
        <div className="captain-applications">
          <Card className="captain-applications__list">
            <ul>
              {apps.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    aria-current={a.id === selected?.id || undefined}
                    onClick={() => setParams({ application: a.id }, { replace: true })}
                  >
                    <span className="stack-page__title">{state.users.find((u) => u.id === a.userId)?.name}</span>
                    <span className="captain-applications__meta">
                      <span className="stack-page__muted stack-page__num">{formatDate(a.createdAt)}</span>
                      <StateChip entity="application" state={a.status} />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>
          {/* Pins the selection in the URL, so a decision does not jump to another applicant. */}
          <Card onSubmitCapture={() => selected && setParams({ application: selected.id }, { replace: true })}>
            {selected && <ApplicationReview key={selected.id} state={state} application={selected} actorId={userId} />}
          </Card>
        </div>
      )}
    </div>
  )
}
