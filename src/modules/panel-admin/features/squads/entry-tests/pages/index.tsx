import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useDebugActions } from '@/debug/use-debug-actions'
import { useActionRunner } from '@/hooks/use-action-runner'
import { useNow } from '@/hooks/use-now'
import { useDb } from '@/mocks/db'
import { entryTestClosed, entryTestOpened } from '@/mocks/github'
import { FormMessage } from '@/components/form-message'
import { formatDate } from '@/mocks/squads'
import '@/components/stack-page.css'

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
    <div className="stack-page">
      <PageHeader
        title="Testes de entrada"
        description="Qualquer pessoa da staff revisa, conversa nos comentários e faz o merge no GitHub. Nada é aprovado automaticamente."
      />
      <FormMessage tone="error">{error}</FormMessage>
      <Card>
        <h2>
          Esperando revisão <span className="stack-page__num">{open.length}</span>
        </h2>
        {open.length === 0 ? (
          <p className="stack-page__muted">Nenhum PR esperando. Bom trabalho.</p>
        ) : (
          <ul className="stack-page__list">
            {open.map((t) => {
              const days = Math.floor((now - new Date(t.openedAt).getTime()) / DAY)
              return (
                <li key={t.userId}>
                  <div className="stack-page__row">
                    <span className="stack-page__title">{name(t.userId)}</span>
                    {days >= 7 && <Badge tone="warning">Há {days} dias</Badge>}
                  </div>
                  <div className="stack-page__row">
                    <span className="stack-page__muted">
                      {t.pullRequest.repository}#{t.pullRequest.number} · {t.pullRequest.title} · aberto em {formatDate(t.openedAt)}
                    </span>
                    <Button asChild size="sm" variant="secondary">
                      <a href={t.pullRequest.url} target="_blank" rel="noreferrer">
                        Revisar no GitHub
                      </a>
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Card>
      <Card>
        <h2>Revisados recentemente</h2>
        <ul className="stack-page__list">
          {recent.map((t) => (
            <li key={t.userId} className="stack-page__row">
              <span className="stack-page__title">{name(t.userId)}</span>
              <span className="stack-page__muted">
                {t.status === 'approved' ? `merged por @${t.reviewer} em ${formatDate(t.approvedAt)}` : 'fechado sem merge'}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
