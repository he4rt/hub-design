import { useActionState, useState, useTransition } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { FormMessage } from '@/components/form-message'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useDebugActions } from '@/debug/use-debug-actions'
import { slugify } from '@/lib/text'
import { newId, useDb, type PendingSocialSignUp } from '@/mocks/db'
import { errorMessage, MockError } from '@/mocks/mock-action'
import { useAccount } from '@/modules/panel-app/hooks/use-account'
import { cancelSocialSignUp, needsOnboarding, PASSWORD_MIN_LENGTH, providerLabel, register, UNDERAGE_FIELD } from '../actions'
import { SocialLogin } from '../components/social-login'
import { useRedirectTarget } from '../hooks/use-redirect-target'
import './register.css'

/** The account screen of the sign-up. Also finishes a social login of a new e-mail. */
export default function Register() {
  const account = useAccount()
  const redirectTo = useRedirectTarget()
  const pendingSocial = useDb((state) => state.pendingSocialSignUp)
  // Underage: the form unmounts, so nothing typed stays in memory.
  const [blocked, setBlocked] = useState(false)

  if (account) return <Navigate to={!needsOnboarding(account) ? redirectTo : '/app/onboarding'} replace />
  if (blocked) {
    return (
      <div className="auth-form">
        <h1>Ainda não dá</h1>
        <p>O He4rt Hub está disponível a partir dos 18 anos.</p>
        <p className="auth-form__hint">Nenhum dado foi guardado.</p>
        <Button asChild variant="secondary">
          <Link to="/">Voltar para o início</Link>
        </Button>
      </div>
    )
  }
  return (
    <RegisterForm
      key={pendingSocial?.email ?? 'email'}
      pendingSocial={pendingSocial}
      redirectTo={redirectTo}
      onBlocked={() => setBlocked(true)}
    />
  )
}

type Result = { error: string; field?: string } | null

function isoDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

const YEAR_MS = 365.25 * 24 * 60 * 60 * 1000

function RegisterForm({
  pendingSocial,
  redirectTo,
  onBlocked,
}: {
  pendingSocial: PendingSocialSignUp | null
  redirectTo: string
  onBlocked: () => void
}) {
  const navigate = useNavigate()
  const { search } = useLocation()
  const [name, setName] = useState(pendingSocial?.name ?? '')
  const [email, setEmail] = useState('')
  // null follows the name until the member types a username.
  const [usernameInput, setUsernameInput] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [accepted, setAccepted] = useState(false)
  const [cancelling, startCancel] = useTransition()
  const username = usernameInput ?? slugify(name)

  const [result, submit, pending] = useActionState(async (): Promise<Result> => {
    try {
      await register({ name, email, username, password, birthDate, acceptedUsageNotice: accepted })
      navigate(`/app/onboarding${search}`)
      return null
    } catch (e) {
      const field = e instanceof MockError ? e.field : undefined
      if (field === UNDERAGE_FIELD) {
        onBlocked()
        return null
      }
      return { error: errorMessage(e), field }
    }
  }, null)

  function fillValid() {
    const id = newId()
    setName('Nova Pessoa')
    setEmail(`nova.${id}@he4rt.dev`)
    setUsernameInput(`nova-pessoa-${id}`)
    setPassword('senha-segura')
    setBirthDate('2000-05-20')
    setAccepted(true)
  }

  useDebugActions('Criar conta', [
    { label: 'Preencher dados válidos', run: fillValid },
    {
      label: 'Menor de 18 (bloqueio esperado)',
      run: () => {
        fillValid()
        setBirthDate(isoDate(Date.now() - 16 * YEAR_MS))
      },
    },
    {
      label: 'Sem aceitar o aviso (erro esperado)',
      run: () => {
        fillValid()
        setAccepted(false)
      },
    },
    {
      label: 'Usuário já em uso (erro esperado)',
      run: () => {
        fillValid()
        setUsernameInput('ana-souza')
      },
    },
    {
      label: 'E-mail já cadastrado (erro esperado)',
      run: () => {
        fillValid()
        setEmail('carla@basement.dev')
      },
    },
  ])

  const invalid = (field: string) => (result?.field === field ? true : undefined)

  return (
    <div className="auth-form">
      <h1>Criar conta</h1>
      <p className="auth-form__hint">Uma conta só para o Hub, a Basement e o Job Finder.</p>

      {pendingSocial ? (
        <div className="register__social">
          <p>Continuando com o {providerLabel(pendingSocial.provider)}. Faltam alguns dados.</p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            loading={cancelling}
            onClick={() => startCancel(() => cancelSocialSignUp())}
          >
            Usar outro jeito
          </Button>
        </div>
      ) : (
        <>
          <SocialLogin verb="Cadastrar" redirectTo={redirectTo} />
          <p className="auth-form__divider">ou com e-mail e senha</p>
        </>
      )}

      <form action={submit} className="auth-form">
        <div className="auth-form__field">
          <Label htmlFor="name">Nome</Label>
          <Input
            id="name"
            autoComplete="name"
            required
            value={name}
            aria-invalid={invalid('name')}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="auth-form__field">
          <Label htmlFor="username">Usuário</Label>
          <Input
            id="username"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
            value={username}
            aria-invalid={invalid('username')}
            aria-describedby="username-hint"
            onChange={(e) => setUsernameInput(e.target.value.toLowerCase())}
          />
          <p id="username-hint" className="auth-form__hint register__readonly" title={`/members/${username}`}>
            Link do perfil: /members/{username || '…'}
          </p>
        </div>
        <div className="auth-form__field">
          <Label htmlFor="email">E-mail</Label>
          {pendingSocial ? (
            <p id="email" className="register__readonly" title={pendingSocial.email}>
              {pendingSocial.email}
            </p>
          ) : (
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              aria-invalid={invalid('email')}
              onChange={(e) => setEmail(e.target.value)}
            />
          )}
        </div>
        {!pendingSocial && (
          <div className="auth-form__field">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              aria-invalid={invalid('password')}
              aria-describedby="password-hint"
              onChange={(e) => setPassword(e.target.value)}
            />
            <p id="password-hint" className="auth-form__hint">
              Pelo menos {PASSWORD_MIN_LENGTH} caracteres.
            </p>
          </div>
        )}
        <div className="auth-form__field">
          <Label htmlFor="birth-date">Data de nascimento</Label>
          <Input
            id="birth-date"
            type="date"
            autoComplete="bday"
            required
            value={birthDate}
            aria-invalid={invalid('birthDate')}
            aria-describedby="birth-date-hint"
            onChange={(e) => setBirthDate(e.target.value)}
          />
          <p id="birth-date-hint" className="auth-form__hint">
            O Hub é para maiores de 18 anos. A data nunca aparece no seu perfil.
          </p>
        </div>
        <div className="register__consent">
          <Checkbox
            id="usage-notice"
            checked={accepted}
            aria-invalid={invalid('acceptedUsageNotice')}
            onCheckedChange={(checked) => setAccepted(checked === true)}
          />
          <p>
            <Label htmlFor="usage-notice">Li e aceito</Label> o{' '}
            <Link to="/app/usage-data" target="_blank" rel="noopener">
              aviso de coleta de dados de uso
            </Link>
            .
          </p>
        </div>
        <FormMessage tone="error">{result?.error}</FormMessage>
        <Button type="submit" loading={pending}>
          Criar conta
        </Button>
      </form>
      <p className="auth-form__footer">
        Já tem conta? <Link to={`/app/login${search}`}>Entrar</Link>
      </p>
    </div>
  )
}
