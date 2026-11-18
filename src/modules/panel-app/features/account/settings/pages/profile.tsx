import { useActionState, useState } from 'react'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useDebugActions } from '@/debug/use-debug-actions'
import type { User } from '@/mocks/db'
import { errorMessage } from '@/mocks/mock-action'
import { useAccount } from '@/modules/panel-app/hooks/use-account'
import { updateProfile } from '../actions'
import './profile.css'

export default function Profile() {
  const account = useAccount()
  if (!account) return null
  return <ProfileForm key={account.id} account={account} />
}

type Result = { ok: true } | { ok: false; error: string } | null

function ProfileForm({ account }: { account: User }) {
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

  useDebugActions('Perfil', [
    { label: 'Preencher e-mail já usado', run: () => setEmail('bruno@he4rt.dev') },
    { label: 'Preencher nome inválido', run: () => setName('A') },
  ])

  return (
    <>
      <PageHeader title="Perfil" description="Seu nome e e-mail." />
      <Card>
        <form action={submit} className="profile-form">
          <div className="profile-form__field">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="profile-form__field">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {result && (
            <p role="status" data-ok={result.ok} className="profile-form__result">
              {result.ok ? 'Perfil salvo.' : result.error}
            </p>
          )}
          <Button type="submit" disabled={pending}>
            {pending ? 'Salvando…' : 'Salvar'}
          </Button>
        </form>
      </Card>
    </>
  )
}
