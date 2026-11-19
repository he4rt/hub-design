import { useActionState, useState } from 'react'
import { FormMessage } from '@/components/form-message'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useDebugActions } from '@/debug/use-debug-actions'
import type { User } from '@/mocks/db'
import { errorMessage } from '@/mocks/mock-action'
import { ProfileCompleteness } from '@/modules/panel-app/components/profile-completeness'
import { useAccount } from '@/modules/panel-app/hooks/use-account'
import { updateProfile } from '../actions'
import { LinkedAccounts } from '../components/linked-accounts'
import { MemberProfileForm } from '../components/member-profile-form'
import { ProfilePublication } from '../components/profile-publication'
import './profile.css'

export default function Profile() {
  const account = useAccount()
  if (!account) return null
  return (
    <>
      <PageHeader title="Perfil" description="O que você preenche aqui é o que a comunidade vê no seu perfil, quando ele está publicado." />
      <div className="profile-page">
        <ProfilePublication account={account} />
        <Card>
          <h2 className="profile-page__title">O que falta no perfil</h2>
          <ProfileCompleteness user={account} />
        </Card>
        <LinkedAccounts account={account} />
        <MemberProfileForm key={`profile-${account.id}`} account={account} />
        <AccountForm key={`account-${account.id}`} account={account} />
      </div>
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
