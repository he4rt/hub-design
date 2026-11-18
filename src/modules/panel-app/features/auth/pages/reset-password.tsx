import { useActionState, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { FormMessage } from '@/components/form-message'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useDebugActions } from '@/debug/use-debug-actions'
import { errorMessage, MockError } from '@/mocks/mock-action'
import { PASSWORD_MIN_LENGTH, resetPassword } from '../actions'

type Result = { error: string; field?: string } | null

/** Opened from the link in the e-mail sent by the "forgot password" page. */
export default function ResetPassword() {
  const { token = '' } = useParams()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')

  const [result, submit, pending] = useActionState(async (): Promise<Result> => {
    try {
      await resetPassword({ token, password, confirmation })
      navigate('/app/login?reset=1')
      return null
    } catch (e) {
      return { error: errorMessage(e), field: e instanceof MockError ? e.field : undefined }
    }
  }, null)

  useDebugActions('Nova senha', [
    {
      label: 'Preencher senha válida',
      run: () => {
        setPassword('nova-senha-123')
        setConfirmation('nova-senha-123')
      },
    },
    {
      label: 'Preencher senhas diferentes (erro esperado)',
      run: () => {
        setPassword('nova-senha-123')
        setConfirmation('outra-senha-123')
      },
    },
    { label: 'Abrir link vencido (erro esperado)', run: () => navigate('/app/reset-password/vencido') },
  ])

  return (
    <form action={submit} className="auth-form">
      <h1>Nova senha</h1>
      <div className="auth-form__field">
        <Label htmlFor="password">Nova senha</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          aria-invalid={result?.field === 'password' ? true : undefined}
          aria-describedby="password-hint"
          onChange={(e) => setPassword(e.target.value)}
        />
        <p id="password-hint" className="auth-form__hint">
          Pelo menos {PASSWORD_MIN_LENGTH} caracteres.
        </p>
      </div>
      <div className="auth-form__field">
        <Label htmlFor="confirmation">Repita a senha</Label>
        <Input
          id="confirmation"
          type="password"
          autoComplete="new-password"
          required
          value={confirmation}
          aria-invalid={result?.field === 'confirmation' ? true : undefined}
          onChange={(e) => setConfirmation(e.target.value)}
        />
      </div>
      <FormMessage tone="error">{result?.error}</FormMessage>
      <Button type="submit" loading={pending}>
        Salvar senha
      </Button>
      <p className="auth-form__footer">
        <Link to="/app/forgot-password">Pedir outro link</Link>
      </p>
    </form>
  )
}
