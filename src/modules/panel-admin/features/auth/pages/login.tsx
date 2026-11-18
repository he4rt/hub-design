import { useActionState, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router'
import { FormMessage } from '@/components/form-message'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useDebugActions } from '@/debug/use-debug-actions'
import { DEMO_PASSWORD } from '@/mocks/db'
import { errorMessage } from '@/mocks/mock-action'
import { useAdmin } from '@/modules/panel-admin/hooks/use-admin'
import { login } from '../actions'

export default function Login() {
  const admin = useAdmin()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const redirect = params.get('redirect')
  const redirectTo = redirect?.startsWith('/admin') ? redirect : '/admin'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [error, submit, pending] = useActionState(async () => {
    try {
      await login({ email, password })
      navigate(redirectTo)
      return null
    } catch (e) {
      return errorMessage(e)
    }
  }, null)

  useDebugActions('Login admin', [
    {
      label: 'Preencher admin',
      run: () => {
        setEmail('daniel@he4rt.dev')
        setPassword(DEMO_PASSWORD)
      },
    },
    {
      label: 'Preencher membro (erro esperado)',
      run: () => {
        setEmail('ana@he4rt.dev')
        setPassword(DEMO_PASSWORD)
      },
    },
  ])

  if (admin) return <Navigate to={redirectTo} replace />

  return (
    <form action={submit} className="auth-form">
      <h1>Administração</h1>
      <p className="auth-form__hint">Entrada só para quem administra o Hub.</p>
      <div className="auth-form__field">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="auth-form__field">
        <Label htmlFor="password">Senha</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          aria-invalid={error ? true : undefined}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <FormMessage tone="error">{error}</FormMessage>
      <Button type="submit" loading={pending}>
        Entrar
      </Button>
      <p className="auth-form__footer">
        É membro? <Link to="/app/login">Entre pelo Hub</Link>
      </p>
    </form>
  )
}
