import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardHeader } from '@/components/ui/card'
import { StateChip } from '@/components/state-chip'
import { useDebugActions } from '@/debug/use-debug-actions'
import { useActionRunner } from '@/hooks/use-action-runner'
import { useNow } from '@/hooks/use-now'
import { useDb } from '@/mocks/db'
import { entryTestClosed, entryTestOpened } from '@/mocks/github'
import { FormMessage } from '@/components/form-message'
import { formatDate } from '@/mocks/squads'
import './index.css'

const DAY = 86_400_000

/**
 * Entry test PRs waiting for someone from the staff, oldest first. The review
 * and the merge happen on GitHub; the merge approves the test.
 */
export default function Index() {
  const state = useDb((s) => s)
  const now = useNow()
  const { run, error } = useActionRunner()
  const open = state.entryTests.filter((t) => t.status === 'open').sort((a, b) => a.openedAt.localeCompare(b.openedAt))
  const recent = state.entryTests
    .filter((t) => t.status !== 'open')
    .sort((a, b) => (b.approvedAt ?? b.openedAt).localeCompare(a.approvedAt ?? a.openedAt))
    .slice(0, 10)
  const name = (id: string) => state.users.find((u) => u.id === id)?.name ?? '?'

  useDebugActions('Testes de entrada', [
    { label: 'Daniel abre um PR de teste', run: () => run(() => entryTestOpened('u1')) },
    { label: 'Staff faz merge do PR mais antigo', run: () => run(() => entryTestClosed(open[0]?.userId ?? 'nenhum', true)) },
  ])

  return (
    <div className="entry-tests">
      <div className="entry-tests__head">
        <PageHeader
          title="Testes de entrada"
          description="Qualquer pessoa da staff revisa, conversa nos comentários e faz o merge no GitHub. Nada é aprovado automaticamente."
        />
        <FormMessage tone="error">{error}</FormMessage>
      </div>
      <Card>
        <CardHeader>
          <h2>Esperando revisão ({open.length})</h2>
        </CardHeader>
        {open.length === 0 ? (
          <p className="entry-tests__muted">Nenhum PR esperando revisão.</p>
        ) : (
          <ul className="entry-tests__list">
            {open.map((t) => {
              const days = Math.floor((now - new Date(t.openedAt).getTime()) / DAY)
              return (
                <li key={t.userId} className="entry-tests__item">
                  <div className="entry-tests__text">
                    <div className="entry-tests__title">
                      <span className="entry-tests__name">{name(t.userId)}</span>
                      {days >= 7 && <Badge variant="warning">Há {days} dias</Badge>}
                    </div>
                    <p className="entry-tests__pr" title={t.pullRequest.title}>
                      <code>
                        {t.pullRequest.repository}#{t.pullRequest.number}
                      </code>{' '}
                      {t.pullRequest.title}
                    </p>
                    <p className="entry-tests__caption">Aberto em {formatDate(t.openedAt)}.</p>
                  </div>
                  <Button asChild size="sm" variant="secondary">
                    <a href={t.pullRequest.url} target="_blank" rel="noreferrer">
                      Revisar no GitHub
                    </a>
                  </Button>
                </li>
              )
            })}
          </ul>
        )}
      </Card>
      <Card>
        <CardHeader>
          <h2>Revisados recentemente</h2>
        </CardHeader>
        {recent.length === 0 ? (
          <p className="entry-tests__muted">Nenhum teste revisado ainda.</p>
        ) : (
          <ul className="entry-tests__list">
            {recent.map((t) => (
              <li key={t.userId} className="entry-tests__item">
                <div className="entry-tests__text">
                  <span className="entry-tests__name">{name(t.userId)}</span>
                  <p className="entry-tests__caption">
                    {t.status === 'approved' ? `Merge de @${t.reviewer} em ${formatDate(t.approvedAt)}.` : `Aberto em ${formatDate(t.openedAt)}.`}
                  </p>
                </div>
                <StateChip entity="entry-test" state={t.status} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
