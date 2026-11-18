import { useActionState, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router'
import { FormMessage } from '@/components/form-message'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useDebugActions } from '@/debug/use-debug-actions'
import { DEMO_PASSWORD, useDb } from '@/mocks/db'
import { errorMessage } from '@/mocks/mock-action'
import { useAccount } from '@/modules/panel-app/hooks/use-account'
import { login, providerLabel } from '../actions'
import { SocialLogin } from '../components/social-login'
import { useRedirectTarget } from '../hooks/use-redirect-target'
import './login.css'

export default function Login() {
  const [params] = useSearchParams()
  // A social login that needs the password arrives with the e-mail filled; a new e-mail starts a new form.
  return <LoginForm key={params.get('email') ?? ''} />
}

function LoginForm() {
  const account = useAccount()
  const navigate = useNavigate()
  const redirectTo = useRedirectTarget()
  const [params] = useSearchParams()
  const { search } = useLocation()
  const pendingLink = useDb((state) => state.pendingSocialLink)
  const [email, setEmail] = useState(params.get('email') ?? '')
  const [password, setPassword] = useState('')

  const [error, submit, pending] = useActionState(async () => {
    try {
      const { needsOnboarding } = await login({ email, password })
      navigate(needsOnboarding ? '/app/onboarding' : redirectTo)
      return null
    } catch (e) {
      return errorMessage(e)
    }
  }, null)

  function fill(nextEmail: string, nextPassword = DEMO_PASSWORD) {
    setEmail(nextEmail)
    setPassword(nextPassword)
  }

  useDebugActions('Login', [
    { label: 'Preencher membro do Hub', run: () => fill('ana@he4rt.dev') },
    {
      label: 'Preencher conta da Basement',
      description: 'Mesma conta, sem perfil no Hub: segue para a primeira pergunta.',
      run: () => fill('carla@basement.dev'),
    },
    {
      label: 'Preencher conta do Job Finder',
      description: 'Já respondeu objetivo e áreas: segue para o ponto de partida.',
      run: () => fill('pedro@jobfinder.dev'),
    },
    { label: 'Preencher senha errada (erro esperado)', run: () => fill('ana@he4rt.dev', 'wrong') },
  ])

  if (account) return <Navigate to={account.onboardedAt ? redirectTo : '/app/onboarding'} replace />

  const resetDone = params.get('reset') === '1'

  return (
    <div className="auth-form">
      <h1>Entrar no Hub</h1>
      {pendingLink && (
        <p className="login__link-notice">
          O {providerLabel(pendingLink.provider)} não confirmou o e-mail desta conta. Entre com a senha para vinculá-lo.
        </p>
      )}
      <SocialLogin verb="Entrar" redirectTo={redirectTo} />
      <p className="auth-form__hint login__shared">Já tem conta na Basement ou no Job Finder? Entre com ela.</p>
      <p className="auth-form__divider">ou com e-mail</p>
      <form action={submit} className="auth-form">
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
          <div className="auth-form__label-row">
            <Label htmlFor="password">Senha</Label>
            <Link to="/app/forgot-password">Esqueci a senha</Link>
          </div>
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
        <FormMessage tone={error ? 'error' : 'success'}>
          {error ?? (resetDone ? 'Senha redefinida. Entre com a nova senha.' : null)}
        </FormMessage>
        <Button type="submit" loading={pending}>
          Entrar
        </Button>
      </form>
      <p className="auth-form__footer">
        Ainda não tem conta? <Link to={`/app/register${search}`}>Criar conta</Link>
      </p>
    </div>
  )
}
