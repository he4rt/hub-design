import { useState, useTransition } from 'react'
import { Link } from 'react-router'
import { FormMessage } from '@/components/form-message'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useDebugActions } from '@/debug/use-debug-actions'
import { db, useDb } from '@/mocks/db'
import { entryTestClosed, entryTestOpened } from '@/mocks/github'
import { errorMessage } from '@/mocks/mock-action'
import { formatDate, githubHandle } from '@/mocks/squads'
import { useAccount } from '@/modules/panel-app/hooks/use-account'
import '@/components/stack-page.css'

const STATUS = {
  open: { label: 'Esperando revisão da staff', tone: 'warning' },
  approved: { label: 'Aprovado', tone: 'success' },
  closed: { label: 'Fechado sem merge', tone: 'danger' },
} as const

/**
 * Entry test: a pull request merged into a He4rt repository by someone from
 * the staff. The Hub finds the PR by webhook; the member never pastes a link.
 */
export default function Show() {
  const account = useAccount()
  const test = useDb((s) => s.entryTests.find((t) => t.userId === s.session?.userId) ?? null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const github = githubHandle(account)

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

  const userId = account?.id ?? ''
  useDebugActions('Teste de entrada', [
    { label: 'Abrir PR do teste (webhook)', run: () => run(() => entryTestOpened(userId)) },
    { label: 'Staff faz o merge', run: () => run(() => entryTestClosed(userId, true)) },
    { label: 'Staff fecha sem merge', run: () => run(() => entryTestClosed(userId, false)) },
    { label: 'Entrar como Gustavo (PR aberto)', run: () => db.set((s) => ({ ...s, session: { userId: 'u11' } })) },
    { label: 'Entrar como Bruno (sem GitHub)', run: () => db.set((s) => ({ ...s, session: { userId: 'u3' } })) },
  ])

  return (
    <div className="stack-page">
      <PageHeader
        title="Teste de entrada"
        description="O primeiro passo para participar de squads. Você faz uma vez e vale para todos."
      />

      <Card>
        <h2>Como funciona</h2>
        <ol className="stack-page__muted">
          <li>
            Faça um fork de{' '}
            <a href="https://github.com/he4rt/primeiro-commit" target="_blank" rel="noreferrer">
              he4rt/primeiro-commit
            </a>{' '}
            ou de qualquer repositório da organização He4rt.
          </li>
          <li>Faça um commit com a sua conta do GitHub vinculada e abra um pull request.</li>
          <li>Alguém da staff revisa, conversa com você nos comentários do PR e faz o merge.</li>
          <li>Com o PR merged, você pode se candidatar aos squads.</li>
        </ol>
        <p className="stack-page__muted">
          Não precisa colar link aqui: o Hub encontra o seu PR sozinho. O material de preparação explica o teste em
          detalhes.
        </p>
      </Card>

      <Card>
        <h2>Seu teste</h2>
        {!github ? (
          <div className="stack-page__row">
            <p>Vincule o GitHub para fazer o teste. Ele é obrigatório para participar do Hub.</p>
            <Button asChild variant="secondary">
              <Link to="/app/settings/profile">Vincular GitHub</Link>
            </Button>
          </div>
        ) : !test ? (
          <p className="stack-page__muted">
            Nenhum PR encontrado da conta <strong>@{github}</strong> em repositórios da He4rt ainda.
          </p>
        ) : (
          <div className="stack-page__row">
            <div>
              <p className="stack-page__title">
                <a href={test.pullRequest.url} target="_blank" rel="noreferrer">
                  {test.pullRequest.repository}#{test.pullRequest.number}
                </a>{' '}
                {test.pullRequest.title}
              </p>
              <p className="stack-page__muted">
                Aberto em {formatDate(test.openedAt)}
                {test.status === 'approved' && ` · merged por @${test.reviewer} em ${formatDate(test.approvedAt)}`}
                {test.status === 'closed' && ' · leia os comentários no PR e abra outro quando quiser'}
              </p>
            </div>
            <Badge tone={STATUS[test.status].tone}>{STATUS[test.status].label}</Badge>
          </div>
        )}
        {test?.status === 'approved' && (
          <Button asChild>
            <Link to="/squads">Ver squads com lugares abertos</Link>
          </Button>
        )}
        <FormMessage tone="error">{pending ? null : error}</FormMessage>
      </Card>
    </div>
  )
}
