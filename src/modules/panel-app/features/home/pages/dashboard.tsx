import { useState, useTransition } from 'react'
import { Link, useNavigate } from 'react-router'
import { FormMessage } from '@/components/form-message'
import { PageHeader } from '@/components/page-header'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useDebugActions } from '@/debug/use-debug-actions'
import { useNow } from '@/hooks/use-now'
import { areaLabels } from '@/lib/member-profile'
import { db, updateUser, type User } from '@/mocks/db'
import { errorMessage } from '@/mocks/mock-action'
import { ProfileCompleteness } from '@/modules/panel-app/components/profile-completeness'
import { useAccount } from '@/modules/panel-app/hooks/use-account'
import { dismissProfileReminder, isProfileReminderVisible, sendEmailVerification, verifyEmail } from '../actions'
import './dashboard.css'

export default function Dashboard() {
  const account = useAccount()
  const navigate = useNavigate()
  const now = useNow()

  useDebugActions('Dashboard', [
    {
      label: 'Simular 7 dias depois',
      description: 'Os próximos passos dispensados voltam, se ainda tiverem retornos.',
      run: () =>
        account &&
        updateUser(account.id, (u) => ({ ...u, profileReminder: { ...u.profileReminder, hiddenUntil: null } })),
    },
    {
      label: 'Zerar dispensas dos próximos passos',
      run: () =>
        account && updateUser(account.id, (u) => ({ ...u, profileReminder: { dismissals: 0, hiddenUntil: null } })),
    },
    {
      label: 'Abrir o link de confirmação do e-mail',
      run: () => account && verifyEmail(account.id),
    },
    {
      label: 'Desconfirmar e-mail',
      run: () => account && updateUser(account.id, (u) => ({ ...u, emailVerifiedAt: null })),
    },
    { label: 'Ir para o perfil', run: () => navigate('/app/settings/profile') },
    {
      label: 'Expirar sessão',
      description: 'Remove a sessão sem passar pelo logout.',
      run: () => db.set((state) => ({ ...state, session: null })),
    },
  ])

  if (!account) return null

  return (
    <>
      <PageHeader title={`Olá, ${account.name.split(' ')[0]}!`} description="Este é o seu painel." />
      <div className="dashboard">
        {!account.emailVerifiedAt && <EmailReminder account={account} />}
        {isProfileReminderVisible(account, now) && <NextSteps account={account} />}
        <Card>
          <div className="dashboard__profile">
            <Avatar src={account.photoUrl} name={account.name} />
            <div className="dashboard__identity">
              <h2 title={account.name}>{account.name}</h2>
              <p title={account.email}>
                @{account.username} · {areaLabels(account.areas)} ·{' '}
                {account.published ? 'Perfil publicado' : 'Perfil privado'}
              </p>
            </div>
          </div>
          <p>
            <Link to={`/members/${account.username}`}>Ver perfil</Link> ·{' '}
            <Link to="/app/settings/profile">Editar perfil</Link>
          </p>
        </Card>
        <Card>
          <h2 className="dashboard__title">Feed</h2>
          <p className="dashboard__hint">O que você aprendeu, como aplicou e quanto isso aproximou você do objetivo.</p>
          <div className="dashboard__actions">
            <Button asChild>
              <Link to="/app/feed/new">Nova publicação</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/app/feed">Abrir o Feed</Link>
            </Button>
          </div>
        </Card>
      </div>
    </>
  )
}

function EmailReminder({ account }: { account: User }) {
  const [sending, startSending] = useTransition()
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null)

  return (
    <Card className="dashboard__email">
      <div className="dashboard__email-row">
        <p>
          Confirme seu e-mail <strong title={account.email}>{account.email}</strong> para recuperar a conta com
          facilidade. É opcional.
        </p>
        <Button
          variant="secondary"
          size="sm"
          loading={sending}
          onClick={() =>
            startSending(async () => {
              try {
                await sendEmailVerification(account.id)
                setMessage({ tone: 'success', text: 'Enviamos um novo link de confirmação.' })
              } catch (e) {
                setMessage({ tone: 'error', text: errorMessage(e) })
              }
            })
          }
        >
          Reenviar link
        </Button>
      </div>
      <FormMessage tone={message?.tone ?? 'success'}>{message?.text}</FormMessage>
    </Card>
  )
}

/** Things that do not exist yet in the Hub carry "Em breve" and no link. */
const NEXT_STEPS: { title: string; text: string; to?: string }[] = [
  { title: 'Completar o perfil', text: 'Cada campo mostra qual ação ele libera.', to: '/app/settings/profile' },
  { title: 'Registrar a trajetória', text: 'O que você aprendeu, praticou e entregou.' },
  { title: 'Ler a preparação para o squad', text: 'O que cai no teste de entrada, publicado antes.' },
]

function NextSteps({ account }: { account: User }) {
  const [dismissing, startDismiss] = useTransition()

  return (
    <Card className="dashboard__next">
      <h2>Próximos passos</h2>
      <ol className="dashboard__steps">
        {NEXT_STEPS.map((step) => (
          <li key={step.title}>
            <div>
              {step.to ? <Link to={step.to}>{step.title}</Link> : <span>{step.title}</span>}
              <p className="dashboard__hint">{step.text}</p>
            </div>
            {!step.to && <span className="dashboard__soon">Em breve</span>}
          </li>
        ))}
      </ol>
      <ProfileCompleteness user={account} showMissing={false} />
      <div className="dashboard__actions">
        <Button
          variant="ghost"
          loading={dismissing}
          onClick={() =>
            startDismiss(async () => {
              await dismissProfileReminder(account.id)
            })
          }
        >
          Agora não
        </Button>
      </div>
    </Card>
  )
}
