import { useActionState, useState } from 'react'
import { Field } from '@/components/field'
import { FormMessage } from '@/components/form-message'
import { PageHeader } from '@/components/page-header'
import { StateChip } from '@/components/state-chip'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useDebugActions } from '@/debug/use-debug-actions'
import { db, useDb } from '@/mocks/db'
import { errorMessage } from '@/mocks/mock-action'
import { formatDate } from '@/mocks/squads'
import { applyAsValidator, updateValidatorProfile } from '../actions'
import '@/components/stack-page.css'

/** "Quero validar": the request with technical proof, its state and the staff's feedback. */
export default function Show() {
  const state = useDb((s) => s)
  const userId = state.session?.userId ?? ''
  const validator = state.validators.find((v) => v.userId === userId)
  const history = state.validatorApplications.filter((a) => a.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const pendingRequest = history.find((a) => a.status === 'pending')
  const [form, setForm] = useState({
    summary: '',
    links: '',
    jobTitle: validator?.jobTitle ?? '',
    company: validator?.company ?? '',
    showEmployer: validator?.showEmployer ?? true,
  })
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }))

  const [result, submit, pending] = useActionState(async () => {
    try {
      if (validator) await updateValidatorProfile(userId, form)
      else await applyAsValidator(userId, form)
      return { tone: 'success' as const, text: validator ? 'Salvo.' : 'Pedido enviado à staff.' }
    } catch (e) {
      return { tone: 'error' as const, text: errorMessage(e) }
    }
  }, null)

  useDebugActions('Quero validar', [
    {
      label: 'Preencher prova técnica',
      run: () =>
        set({
          summary: 'Desenvolvedor back-end há 6 anos com Laravel e Go. Revisei PRs em projetos open source e orientei dois juniores no trabalho.',
          links: 'https://github.com/exemplo https://www.linkedin.com/in/exemplo',
          jobTitle: 'Desenvolvedor back-end',
          company: 'Empresa Exemplo',
        }),
    },
    { label: 'Entrar como Gustavo (sem pedido)', run: () => db.set((s) => ({ ...s, session: { userId: 'u11' } })) },
    { label: 'Entrar como Letícia (pedido pendente)', run: () => db.set((s) => ({ ...s, session: { userId: 'u10' } })) },
    { label: 'Entrar como Diego (validador)', run: () => db.set((s) => ({ ...s, session: { userId: 'u9' } })) },
  ])

  return (
    <div className="stack-page">
      <PageHeader
        title={validator ? 'Perfil de validador' : 'Quero validar'}
        description="Validadores são pessoas já no mercado que registram o que viram no trabalho de quem está nos squads."
      />
      {history.length > 0 && (
        <Card>
          <h2>Seus pedidos</h2>
          <ul className="stack-page__list">
            {history.map((a) => (
              <li key={a.id}>
                <div className="stack-page__row">
                  <span className="stack-page__muted">Enviado em {formatDate(a.createdAt)}</span>
                  <StateChip entity="validator-application" state={a.status} />
                </div>
                {a.decision && a.status === 'declined' && <p className="stack-page__quote">{a.decision.reason}</p>}
              </li>
            ))}
          </ul>
        </Card>
      )}
      {!pendingRequest && (
        <Card>
          <form action={submit} className="stack-page">
            {!validator && (
              <>
                <Field id="summary" label="Sua experiência" hint="O que você faz, há quanto tempo, e onde já revisou ou orientou o trabalho de outras pessoas.">
                  <Textarea id="summary" value={form.summary} onChange={(e) => set({ summary: e.target.value })} />
                </Field>
                <Field id="links" label="Links" hint="GitHub, LinkedIn, portfólio, certificações, contribuições. Separe por espaço.">
                  <Input id="links" value={form.links} onChange={(e) => set({ links: e.target.value })} />
                </Field>
              </>
            )}
            <Field id="job-title" label="Cargo atual">
              <Input id="job-title" value={form.jobTitle} onChange={(e) => set({ jobTitle: e.target.value })} />
            </Field>
            <Field id="company" label="Empresa atual">
              <Input id="company" value={form.company} onChange={(e) => set({ company: e.target.value })} />
            </Field>
            <label className="stack-page__actions">
              <Switch checked={form.showEmployer} onCheckedChange={(showEmployer) => set({ showEmployer })} />
              Mostrar cargo e empresa nas validações que eu registrar
            </label>
            <FormMessage tone={result?.tone ?? 'success'}>{result?.text}</FormMessage>
            <div className="stack-page__actions">
              <Button type="submit" loading={pending}>
                {validator ? 'Salvar' : 'Enviar pedido'}
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  )
}
