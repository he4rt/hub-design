import { useSearchParams } from 'react-router'
import { NotFound } from '@/components/not-found'
import { PageHeader } from '@/components/page-header'
import { StateChip } from '@/components/state-chip'
import { Card } from '@/components/ui/card'
import { useDebugActions } from '@/debug/use-debug-actions'
import { useActionRunner } from '@/hooks/use-action-runner'
import { db } from '@/mocks/db'
import { formatDate } from '@/mocks/squads'
import { boardItemMoved, pullRequestMerged } from '@/mocks/github'
import { FormMessage } from '@/components/form-message'
import { SquadTabs } from '../../components/squad-tabs'
import { useSquadPage } from '../../hooks/use-squad-page'
import { DeliveryReview } from '../components/delivery-review'
import '../../components/squad-page.css'

/** Captain's tab: board items that reached "Feito", waiting to be accepted or returned. */
export default function Index() {
  const { state, userId, squad, project, manager, counts } = useSquadPage()
  const { run, error } = useActionRunner()
  const [params, setParams] = useSearchParams()
  const pending = state.deliveries.filter((d) => d.projectId === project?.id && d.status === 'pending')

  useDebugActions('Entregas para aceitar', [
    {
      label: 'PR merged em "Testes do cupom" e item vai para Feito',
      run: () => run(async () => {
        await pullRequestMerged('b3', 'u7', ['u2'])
        await boardItemMoved('b3', 'done')
      }),
    },
    { label: '"Documentar o fluxo" vai para Feito (não técnica)', run: () => run(() => boardItemMoved('b4', 'done')) },
    {
      label: 'Item técnico sem PR vai para Feito (não vira entrega)',
      run: () => run(() => boardItemMoved('b5', 'done')),
    },
    { label: 'Entrar como Rafael (capitão)', run: () => db.set((s) => ({ ...s, session: { userId: 'u6' } })) },
  ])

  if (!squad || !manager) return <NotFound />

  const selected = pending.find((d) => d.id === params.get('delivery')) ?? pending[0]

  return (
    <div className="squad-page">
      <div className="squad-page__head">
        <PageHeader title={squad.name} description="Confira o critério de aceite e registre o que cada pessoa fez." />
        <SquadTabs squad={squad} manager={manager} counts={counts} />
      </div>
      {pending.length === 0 ? (
        <Card>
          <p className="squad-page__muted">Nenhuma entrega esperando. Itens que chegam em Feito no board aparecem aqui.</p>
        </Card>
      ) : (
        <div className="squad-page__split">
          <Card className="squad-page__picker" aria-label="Entregas para aceitar">
            <ul>
              {pending.map((d) => (
                <li key={d.id}>
                  <button
                    type="button"
                    aria-current={d.id === selected?.id || undefined}
                    onClick={() => setParams({ delivery: d.id }, { replace: true })}
                  >
                    <span className="squad-page__name" title={d.title}>
                      {d.title}
                    </span>
                    <span className="squad-page__row">
                      <span className="squad-page__muted squad-page__num">Chegou em {formatDate(d.createdAt)}</span>
                      <StateChip entity="delivery" state={d.status} />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>
          <Card>{selected && <DeliveryReview key={selected.id} state={state} delivery={selected} actorId={userId} />}</Card>
        </div>
      )}
      <FormMessage tone="error">{error}</FormMessage>
    </div>
  )
}
