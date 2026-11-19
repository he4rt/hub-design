import { PageHeader } from '@/components/page-header'
import { FormMessage } from '@/components/form-message'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardHeader } from '@/components/ui/card'
import { useDebugActions } from '@/debug/use-debug-actions'
import { useActionRunner } from '@/hooks/use-action-runner'
import { db, useDb } from '@/mocks/db'
import { accessDiverged } from '@/mocks/github'
import { useAdmin } from '@/modules/panel-admin/hooks/use-admin'
import { syncGithub } from '../actions'
import './show.css'

function formatDateTime(iso: string | null) {
  return iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'nunca'
}

/** State of the He4rt GitHub App: last webhook, last sweep and access changed by hand on GitHub. */
export default function Show() {
  const admin = useAdmin()
  const sync = useDb((s) => s.githubSync)
  const { run, pending, error, success } = useActionRunner()

  useDebugActions('Integração GitHub', [
    {
      label: 'Gerar divergência de acesso',
      run: () => run(() => accessDiverged('Júlia Martins foi removida à mão do time squad-loja-comunitaria no GitHub.')),
    },
    {
      label: 'Webhook atrasado 2 dias',
      run: () =>
        db.set((s) => ({
          ...s,
          githubSync: { ...s.githubSync, lastWebhookAt: new Date(Date.now() - 2 * 86_400_000).toISOString() },
        })),
    },
  ])

  const stale = !sync.lastWebhookAt || Date.parse(sync.lastWebhookAt) < Date.parse(sync.lastSweepAt ?? '') - 86_400_000

  return (
    <div className="admin-github">
      <div className="admin-github__head">
        <PageHeader
          title="Integração GitHub"
          description="O GitHub App da He4rt cria repositórios e boards e avisa o Hub por webhook. Uma varredura periódica pega o que o webhook perdeu."
          actions={
            <Button loading={pending} onClick={() => run(() => syncGithub(admin?.id ?? ''), 'Sincronizado.')}>
              Sincronizar agora
            </Button>
          }
        />
        <FormMessage tone={error ? 'error' : 'success'}>{error ?? success}</FormMessage>
      </div>
      <Card>
        <CardHeader>
          <h2>GitHub App</h2>
          <Badge variant="success">Ativo</Badge>
        </CardHeader>
        <ul className="admin-github__list">
          <li>
            <span>Instalado na organização</span>
            <code className="admin-github__ref">he4rt</code>
          </li>
          <li>
            <span>Último webhook</span>
            <span className="admin-github__value">
              {formatDateTime(sync.lastWebhookAt)}
              {stale && <Badge variant="warning">Atrasado</Badge>}
            </span>
          </li>
          <li>
            <span>Última varredura</span>
            <span className="admin-github__value">{formatDateTime(sync.lastSweepAt)}</span>
          </li>
        </ul>
      </Card>
      <Card>
        <CardHeader>
          <h2>Divergências ({sync.divergences.length})</h2>
        </CardHeader>
        <p className="admin-github__muted">Mudanças feitas à mão no GitHub que o Hub não pediu. Sincronizar reaplica o que o Hub decidiu.</p>
        {sync.divergences.length === 0 ? (
          <p className="admin-github__muted">Nenhuma divergência.</p>
        ) : (
          <ul className="admin-github__list">
            {sync.divergences.map((d) => (
              <li key={d.id} className="admin-github__divergence">
                <span>{d.description}</span>
                <span className="admin-github__caption">Detectada em {formatDateTime(d.detectedAt)}.</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
