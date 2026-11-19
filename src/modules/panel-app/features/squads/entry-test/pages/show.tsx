import { GitMerge } from 'lucide-react'
import { useState, useTransition } from 'react'
import { Link } from 'react-router'
import { FormMessage } from '@/components/form-message'
import { PageHeader } from '@/components/page-header'
import { StateChip } from '@/components/state-chip'
import { Button } from '@/components/ui/button'
import { Callout } from '@/components/ui/callout'
import { Card, CardHeader } from '@/components/ui/card'
import { TrailLog, TrailLogItem } from '@/components/ui/trail-log'
import { useDebugActions } from '@/debug/use-debug-actions'
import { db, useDb } from '@/mocks/db'
import { entryTestClosed, entryTestOpened } from '@/mocks/github'
import { errorMessage } from '@/mocks/mock-action'
import { formatDate, githubHandle } from '@/mocks/squads'
import { useAccount } from '@/modules/panel-app/hooks/use-account'
import './show.css'

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
  ])

  const opened = !!test
  const approved = test?.status === 'approved'
  const step = (done: boolean, current: boolean) => (done ? 'success' : current ? 'move' : 'past')

  return (
    <div className="entry-test">
      <PageHeader title="Teste de entrada" description="Você faz uma vez e vale para qualquer squad." />

      {approved && test && (
        <Callout
          variant="banner"
          icon={<GitMerge size={22} aria-hidden />}
          title="Teste de entrada aprovado"
          action={
            <Button asChild variant="dark">
              <a href={test.pullRequest.url} target="_blank" rel="noreferrer">
                Ver PR no GitHub
              </a>
            </Button>
          }
        >
          PR <span className="entry-test__mono">#{test.pullRequest.number}</span> em{' '}
          <span className="entry-test__mono">{test.pullRequest.repository}</span>, merged por @{test.reviewer} em{' '}
          {formatDate(test.approvedAt)}. Vale para qualquer squad, para sempre.
        </Callout>
      )}

      <div className="entry-test__grid">
        <Card>
          <CardHeader>
            <h2>Como funciona</h2>
          </CardHeader>
          <TrailLog>
            <TrailLogItem
              tone={step(opened, !opened)}
              title="Faça um fork de um repositório da He4rt"
              meta={
                <>
                  Por exemplo{' '}
                  <a href="https://github.com/he4rt/primeiro-commit" target="_blank" rel="noreferrer" className="entry-test__mono">
                    he4rt/primeiro-commit
                  </a>
                  .
                </>
              }
            />
            <TrailLogItem
              tone={step(opened, false)}
              title="Faça um commit e abra um pull request"
              meta="Com a conta do GitHub vinculada ao Hub."
            />
            <TrailLogItem
              tone={test?.status === 'closed' ? 'warning' : step(approved, test?.status === 'open')}
              title="Alguém da staff revisa e faz o merge"
              meta={
                test?.status === 'closed'
                  ? 'O PR foi fechado sem merge. Leia os comentários no PR e abra outro quando quiser.'
                  : 'A conversa acontece nos comentários do PR.'
              }
            />
            <TrailLogItem tone={step(false, approved)} title="Candidate-se a um projeto" meta="Com o PR merged, os squads ficam abertos para você." />
          </TrailLog>
          <p className="entry-test__muted">
            Não precisa colar link aqui: o Hub encontra o seu PR sozinho. O material de preparação explica o teste em detalhes.
          </p>
        </Card>

        <Card>
          <CardHeader>
            <h2>Seu teste</h2>
            {test && <StateChip entity="entry-test" state={test.status} />}
          </CardHeader>
          {!test ? (
            <p className="entry-test__muted">
              Nenhum PR encontrado da conta <strong>@{github}</strong> em repositórios da He4rt ainda.
            </p>
          ) : (
            <Card variant="inset">
              <a href={test.pullRequest.url} target="_blank" rel="noreferrer" className="entry-test__mono">
                {test.pullRequest.repository}#{test.pullRequest.number}
              </a>
              <p className="entry-test__title" title={test.pullRequest.title}>
                {test.pullRequest.title}
              </p>
              <p className="entry-test__muted">
                Aberto em {formatDate(test.openedAt)}.
                {approved && ` Merged por @${test.reviewer} em ${formatDate(test.approvedAt)}.`}
              </p>
            </Card>
          )}
          {approved && (
            <div>
              <Button asChild>
                <Link to="/squads">Ver squads com lugares abertos</Link>
              </Button>
            </div>
          )}
          <FormMessage tone="error">{pending ? null : error}</FormMessage>
        </Card>
      </div>
    </div>
  )
}
