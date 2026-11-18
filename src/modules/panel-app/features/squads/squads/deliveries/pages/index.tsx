import { NotFound } from '@/components/not-found'
import { PageHeader } from '@/components/page-header'
import { Card } from '@/components/ui/card'
import { useDebugActions } from '@/debug/use-debug-actions'
import { useActionRunner } from '@/hooks/use-action-runner'
import { db } from '@/mocks/db'
import { boardItemMoved, pullRequestMerged } from '@/mocks/github'
import { FormMessage } from '@/components/form-message'
import { SquadTabs } from '../../components/squad-tabs'
import { useSquadPage } from '../../hooks/use-squad-page'
import { DeliveryReview } from '../components/delivery-review'
import '@/components/stack-page.css'

/** Captain's tab: board items that reached "Feito", waiting to be accepted or returned. */
export default function Index() {
  const { state, userId, squad, project, manager, counts } = useSquadPage()
  const { run, error } = useActionRunner()
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

  return (
    <div className="stack-page">
      <PageHeader title={squad.name} description="Confira o critério de aceite e registre o que cada pessoa fez." />
      <SquadTabs squad={squad} manager={manager} counts={counts} />
      <FormMessage tone="error">{error}</FormMessage>
      {pending.length === 0 ? (
        <Card>
          <p className="stack-page__muted">Nenhuma entrega esperando. Itens que chegam em Feito no board aparecem aqui.</p>
        </Card>
      ) : (
        pending.map((d) => (
          <Card key={d.id}>
            <DeliveryReview state={state} delivery={d} actorId={userId} />
          </Card>
        ))
      )}
    </div>
  )
}
