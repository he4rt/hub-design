import { useTransition } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { User } from '@/mocks/db'
import { ProfileCompleteness } from '@/modules/panel-app/components/profile-completeness'
import { dismissProfileReminder } from '../actions'
import './next-steps.css'

/** Things that do not exist yet in the Hub carry "Em breve" and no link. */
const NEXT_STEPS: { title: string; text: string; to?: string }[] = [
  { title: 'Completar o perfil', text: 'Cada campo mostra qual ação ele libera.', to: '/app/settings/profile' },
  { title: 'Registrar um aprendizado', text: 'O que aprendeu e como aplicou.', to: '/app?compose=1' },
  { title: 'Ler a preparação para o squad', text: 'O que cai no teste de entrada, publicado antes.' },
]

/** Shows while the profile is incomplete and the member has not dismissed it. */
export function NextSteps({ account }: { account: User }) {
  const [dismissing, startDismiss] = useTransition()

  return (
    <Card className="next-steps">
      <h2>Próximos passos</h2>
      <ol className="next-steps__list">
        {NEXT_STEPS.map((step) => (
          <li key={step.title}>
            <div>
              {step.to ? <Link to={step.to}>{step.title}</Link> : <span>{step.title}</span>}
              <p>{step.text}</p>
            </div>
            {!step.to && <span className="next-steps__soon">Em breve</span>}
          </li>
        ))}
      </ol>
      <ProfileCompleteness user={account} showMissing={false} />
      <Button
        variant="ghost"
        size="sm"
        loading={dismissing}
        onClick={() =>
          startDismiss(async () => {
            await dismissProfileReminder(account.id)
          })
        }
      >
        Agora não
      </Button>
    </Card>
  )
}
