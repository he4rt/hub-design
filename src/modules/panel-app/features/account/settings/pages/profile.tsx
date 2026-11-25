import { useActionState, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router'
import { FormMessage } from '@/components/form-message'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useDebugActions } from '@/debug/use-debug-actions'
import type { User } from '@/mocks/db'
import { errorMessage } from '@/mocks/mock-action'
import { ProfileCompleteness } from '@/modules/panel-app/components/profile-completeness'
import { useAccount } from '@/modules/panel-app/hooks/use-account'
import { updateProfile } from '../actions'
import { LinkedAccounts } from '../components/linked-accounts'
import { MemberProfileForm } from '../components/member-profile-form'
import { ProfilePublication } from '../components/profile-publication'
import { TrajectorySettings } from '../components/trajectory-settings'
import './profile.css'

/** One page, three tabs: who the member is, the records of their trajectory, and who sees the profile. */
const TABS = { perfil: 'Perfil', trajetoria: 'Trajetória', publicacao: 'Publicação' } as const
type Tab = keyof typeof TABS

export default function Profile() {
  const account = useAccount()
  const [params, setParams] = useSearchParams()
  const { hash } = useLocation()
  // "Novo registro" and the old #trajectory links land on the Trajetória tab.
  const requested = params.get('aba') ?? (params.has('novo') || hash === '#trajectory' ? 'trajetoria' : null)
  const tab: Tab = requested && requested in TABS ? (requested as Tab) : 'perfil'
  const setTab = (next: string) =>
    setParams(
      (current) => {
        const result = new URLSearchParams(current)
        if (next === 'perfil') result.delete('aba')
        else result.set('aba', next)
        result.delete('novo')
        return result
      },
      { replace: true, preventScrollReset: true },
    )

  useDebugActions('Configurações do perfil', [
    { label: 'Abrir aba Perfil', run: () => setTab('perfil') },
    { label: 'Abrir aba Trajetória', run: () => setTab('trajetoria') },
    { label: 'Abrir aba Publicação', run: () => setTab('publicacao') },
    { label: 'Abrir "Novo registro" de aprendizagem', run: () => setParams({ aba: 'trajetoria', novo: 'learnings' }) },
  ])

  if (!account) return null
  return (
    <>
      <PageHeader title="Perfil" description="O que você preenche aqui é o que a comunidade vê no seu perfil, quando ele está publicado." />
      <Tabs value={tab} onValueChange={setTab} className="profile-page__tabs">
        <TabsList aria-label="Seções das configurações do perfil">
          {(Object.keys(TABS) as Tab[]).map((value) => (
            <TabsTrigger key={value} value={value}>
              {TABS[value]}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="perfil" className="profile-page">
          {/* Like the market's settings: the public data first, account and access last; what is missing shows only while something is. */}
          {account.completeness.missing.length > 0 && (
            <Card>
              <h2 className="profile-page__title">Complete seu perfil</h2>
              <ProfileCompleteness user={account} />
            </Card>
          )}
          <MemberProfileForm key={`profile-${account.id}`} account={account} />
          <LinkedAccounts account={account} />
          <AccountForm key={`account-${account.id}`} account={account} />
        </TabsContent>
        <TabsContent value="trajetoria" className="profile-page">
          <TrajectorySettings key={`trajectory-${account.id}`} userId={account.id} />
        </TabsContent>
        <TabsContent value="publicacao" className="profile-page">
          <ProfilePublication account={account} />
        </TabsContent>
      </Tabs>
    </>
  )
}

type Result = { ok: true } | { ok: false; error: string } | null

function AccountForm({ account }: { account: User }) {
  const [name, setName] = useState(account.name)
  const [email, setEmail] = useState(account.email)

  const [result, submit, pending] = useActionState(async (): Promise<Result> => {
    try {
      await updateProfile(account.id, { name, email })
      return { ok: true }
    } catch (e) {
      return { ok: false, error: errorMessage(e) }
    }
  }, null)

  useDebugActions('Conta', [
    { label: 'Preencher e-mail já usado', run: () => setEmail('bruno@he4rt.dev') },
    { label: 'Preencher nome inválido', run: () => setName('A') },
  ])

  return (
    <Card>
      <h2 className="profile-page__title">Conta</h2>
      <form action={submit} className="profile-form">
        <div className="profile-form__field">
          <Label htmlFor="name">Nome</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="profile-form__field">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <FormMessage tone={result?.ok === false ? 'error' : 'success'}>
          {result && (result.ok ? 'Conta salva.' : result.error)}
        </FormMessage>
        <Button type="submit" variant="secondary" loading={pending}>
          Salvar conta
        </Button>
      </form>
    </Card>
  )
}
