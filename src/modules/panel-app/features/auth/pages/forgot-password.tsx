import { useActionState, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { FormMessage } from '@/components/form-message'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useDebugActions } from '@/debug/use-debug-actions'
import { db } from '@/mocks/db'
import { errorMessage } from '@/mocks/mock-action'
import { sendPasswordResetLink } from '../actions'

type Result = { ok: true } | { ok: false; error: string } | null

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')

  const [result, submit, pending] = useActionState(async (): Promise<Result> => {
    try {
      await sendPasswordResetLink({ email })
      return { ok: true }
    } catch (e) {
      return { ok: false, error: errorMessage(e) }
    }
  }, null)

  useDebugActions('Recuperar senha', [
    { label: 'Preencher e-mail cadastrado', run: () => setEmail('ana@he4rt.dev') },
    { label: 'Preencher e-mail sem conta', description: 'A resposta é a mesma.', run: () => setEmail('ninguem@he4rt.dev') },
    {
      label: 'Abrir o último link enviado',
      description: 'Simula o clique no e-mail.',
      run: () => {
        const reset = db.get().passwordResets.at(-1)
        navigate(`/app/reset-password/${reset?.token ?? 'sem-link'}`)
      },
    },
  ])

  return (
    <form action={submit} className="auth-form">
      <h1>Recuperar senha</h1>
      <p className="auth-form__hint">
        Informe o e-mail da sua conta He4rt para solicitar um link de nova senha. Neste ambiente exploratório,
        a mensagem fica na caixa de saída local; o envio externo depende de um provedor configurado.
        O link também permite criar uma senha para uma conta social.
      </p>
      <div className="auth-form__field">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          aria-invalid={result?.ok === false ? true : undefined}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <FormMessage tone={result?.ok === false ? 'error' : 'success'}>
        {result && (result.ok ? 'Solicitação registrada.' : result.error)}
      </FormMessage>
      <Button type="submit" loading={pending}>
        Enviar link
      </Button>
      <p className="auth-form__footer">
        <Link to="/app/login">Voltar para o login</Link>
      </p>
    </form>
  )
}
