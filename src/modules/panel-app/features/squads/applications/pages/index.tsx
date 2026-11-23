import { ShieldCheck } from 'lucide-react'
import { useState, useTransition } from 'react'
import { Link } from 'react-router'
import { FormMessage } from '@/components/form-message'
import { PageHeader } from '@/components/page-header'
import { StateChip } from '@/components/state-chip'
import { Button } from '@/components/ui/button'
import { Callout } from '@/components/ui/callout'
import { Card } from '@/components/ui/card'
import { useDebugActions } from '@/debug/use-debug-actions'
import { GITHUB_ORG } from '@/lib/github'
import { db, useDb } from '@/mocks/db'
import { inviteAccepted } from '@/mocks/github'
import { errorMessage } from '@/mocks/mock-action'
import { formatDate } from '@/mocks/squads'
import { useAccount } from '@/modules/panel-app/hooks/use-account'
import { canWithdraw, withdrawApplication } from '../actions'
import './index.css'

/** The member's applications, the captain's notes and the feedback of a decline. */
export default function Index() {
  const account = useAccount()
  const state = useDb((s) => s)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const mine = state.applications
    .filter((a) => a.userId === account?.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  function run(action: () => Promise<unknown>) {
    setError(null)
    startTransition(async () => {
      try {
        await action()
      } catch (e) {
        setError(errorMessage(e))
      }
    })
  }

  useDebugActions('Minhas candidaturas', [
    { label: 'Entrar como Gustavo (sem candidatura)', run: () => db.set((s) => ({ ...s, session: { userId: 'u11' } })) },
    { label: 'Entrar como Letícia (recusada)', run: () => db.set((s) => ({ ...s, session: { userId: 'u10' } })) },
    {
      label: 'Convite do GitHub aceito',
      run: () => {
        const app = mine.find((a) => a.githubInvite === 'pending')
        run(() => inviteAccepted(app?.id ?? 'nenhuma'))
      },
    },
  ])

  return (
    <div className="my-applications">
      <PageHeader title="Minhas candidaturas" description="Toda candidatura recebe resposta do capitão, e toda recusa vem com retorno." />
      <Callout icon={<ShieldCheck size={16} aria-hidden />}>
        Uma candidatura pendente por projeto. Você pode desistir enquanto ela estiver pendente.
      </Callout>
      <Card>
        {mine.length === 0 ? (
          <div className="my-applications__row">
            <p className="my-applications__muted">Você ainda não se candidatou a nenhum projeto.</p>
            <Button asChild variant="secondary">
              <Link to="/squads">Ver squads</Link>
            </Button>
          </div>
        ) : (
          <ul className="my-applications__list">
            {mine.map((app) => {
              const project = state.projects.find((p) => p.id === app.projectId)
              const squad = state.squads.find((s) => s.id === project?.squadId)
              return (
                <li key={app.id}>
                  <div className="my-applications__row">
                    <Link to={`/squads/${squad?.slug}`} className="my-applications__name" title={`${project?.name}, squad ${squad?.name}`}>
                      {project?.name}
                    </Link>
                    <StateChip entity="application" state={app.status} />
                  </div>
                  <p className="my-applications__muted">
                    Squad {squad?.name}. Enviada em {formatDate(app.createdAt)}.
                  </p>
                  {app.status === 'accepted' && app.githubInvite === 'pending' && (
                    <div className="my-applications__feedback">
                      <p className="my-applications__text">
                        Aceite o convite da organização {GITHUB_ORG} no GitHub. Sua participação será confirmada após a sincronização do convite.
                      </p>
                      <Button asChild variant="secondary" size="sm">
                        <a href={`https://github.com/orgs/${GITHUB_ORG}/invitation`} target="_blank" rel="noreferrer">Ver convite no GitHub</a>
                      </Button>
                    </div>
                  )}
                  {app.status === 'accepted' && app.githubInvite === 'accepted' && squad && (
                    <div className="my-applications__actions">
                      <Button asChild variant="secondary" size="sm">
                        <Link to={`/app/squads/${squad.slug}`}>Abrir meu squad</Link>
                      </Button>
                    </div>
                  )}
                  {app.decision && (
                    <div className="my-applications__feedback">
                      <div>
                        <h3>Por que agora não</h3>
                        <p className="my-applications__text">{app.decision.reason}</p>
                      </div>
                      <div>
                        <h3>O que fortalecer para a próxima</h3>
                        <p className="my-applications__text">{app.decision.nextSteps}</p>
                      </div>
                    </div>
                  )}
                  {app.notes && (
                    <div className="my-applications__feedback">
                      <div>
                        <h3 className="my-applications__strengths">Pontos fortes, nas anotações do capitão</h3>
                        <p className="my-applications__text">{app.notes.strengths}</p>
                      </div>
                      <div>
                        <h3 className="my-applications__improvements">Pontos de melhoria</h3>
                        <p className="my-applications__text">{app.notes.improvements}</p>
                      </div>
                    </div>
                  )}
                  {canWithdraw(app.status) && (
                    <div className="my-applications__actions">
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={pending}
                        onClick={() => run(() => withdrawApplication(account?.id ?? '', app.id))}
                      >
                        Desistir
                      </Button>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Card>
      <FormMessage tone="error">{error}</FormMessage>
    </div>
  )
}
