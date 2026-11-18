import { useActionState, useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useDebugActions } from '@/debug/use-debug-actions'
import { DEMO_PASSWORD } from '@/mocks/db'
import { errorMessage } from '@/mocks/mock-action'
import { useAccount } from '@/modules/panel-app/hooks/use-account'
import { login } from '../actions'

export default function Login() {
  const account = useAccount()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [error, submit, pending] = useActionState(async () => {
    try {
      await login({ email, password })
      navigate('/app')
      return null
    } catch (e) {
      return errorMessage(e)
    }
  }, null)

  useDebugActions('Login', [
    {
      label: 'Preencher credenciais demo',
      run: () => {
        setEmail('ana@he4rt.dev')
        setPassword(DEMO_PASSWORD)
      },
    },
    {
      label: 'Preencher credenciais inválidas',
      run: () => {
        setEmail('ana@he4rt.dev')
        setPassword('wrong')
      },
    },
  ])

  if (account) return <Navigate to="/app" replace />

  return (
    <form action={submit} className="auth-form">
      <h1>Entrar</h1>
      <p className="auth-form__hint">Use qualquer usuário mockado com a senha “{DEMO_PASSWORD}”.</p>
      <div className="auth-form__field">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="auth-form__field">
        <Label htmlFor="password">Senha</Label>
        <Input
          id="password"
          type="password"
          required
          value={password}
          aria-invalid={error ? true : undefined}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {error && <p role="alert" className="auth-form__error">{error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? 'Entrando…' : 'Entrar'}
      </Button>
    </form>
  )
}
