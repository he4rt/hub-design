import { useState, useTransition } from 'react'
import { Link } from 'react-router'
import { FormMessage } from '@/components/form-message'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useDebugActions } from '@/debug/use-debug-actions'
import { db, useDb } from '@/mocks/db'
import { inviteAccepted } from '@/mocks/github'
import { errorMessage } from '@/mocks/mock-action'
import { formatDate } from '@/mocks/squads'
import { useAccount } from '@/modules/panel-app/hooks/use-account'
import { canWithdraw, withdrawApplication } from '../actions'
import '@/components/stack-page.css'

const STATUS = {
  pending: { label: 'Aguardando o capitão', tone: 'warning' },
  accepted: { label: 'Aceita', tone: 'success' },
  declined: { label: 'Recusada com retorno', tone: 'neutral' },
  withdrawn: { label: 'Você desistiu', tone: 'neutral' },
} as const

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
    <div className="stack-page">
      <PageHeader title="Minhas candidaturas" description="Toda candidatura recebe resposta do capitão." />
      <FormMessage tone="error">{error}</FormMessage>
      <Card>
        {mine.length === 0 ? (
          <div className="stack-page__row">
            <p className="stack-page__muted">Você ainda não se candidatou a nenhum projeto.</p>
            <Button asChild variant="secondary">
              <Link to="/squads">Ver squads</Link>
            </Button>
          </div>
        ) : (
          <ul className="stack-page__list">
            {mine.map((app) => {
              const project = state.projects.find((p) => p.id === app.projectId)
              const squad = state.squads.find((s) => s.id === project?.squadId)
              return (
                <li key={app.id}>
                  <div className="stack-page__row">
                    <Link to={`/squads/${squad?.slug}`} className="stack-page__title">
                      {squad?.name} · {project?.name}
                    </Link>
                    <Badge tone={STATUS[app.status].tone}>{STATUS[app.status].label}</Badge>
                  </div>
                  <p className="stack-page__muted">Enviada em {formatDate(app.createdAt)}</p>
                  {app.status === 'accepted' && app.githubInvite === 'pending' && (
                    <p className="stack-page__quote">
                      Aceite o convite da organização He4rt no GitHub para ter acesso ao repositório e ao board.
                    </p>
                  )}
                  {app.decision && (
                    <>
                      <p className="stack-page__quote">
                        <strong>Por que agora não:</strong> {app.decision.reason}
                      </p>
                      <p className="stack-page__quote">
                        <strong>O que fortalecer para a próxima:</strong> {app.decision.nextSteps}
                      </p>
                    </>
                  )}
                  {app.notes && (
                    <p className="stack-page__quote">
                      <strong>Anotações do capitão.</strong> Pontos fortes: {app.notes.strengths} Pontos de melhoria:{' '}
                      {app.notes.improvements}
                    </p>
                  )}
                  {canWithdraw(app.status) && (
                    <div className="stack-page__actions">
                      <Button
                        variant="ghost"
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
    </div>
  )
}
