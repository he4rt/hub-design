import { useActionState, useState } from 'react'
import { useNavigate } from 'react-router'
import { Field } from '@/components/field'
import { FormMessage } from '@/components/form-message'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useDebugActions } from '@/debug/use-debug-actions'
import { errorMessage } from '@/mocks/mock-action'
import { useAdmin } from '@/modules/panel-admin/hooks/use-admin'
import { createSquad } from '../actions'
import { CaptainField } from '../components/captain-field'
import './create.css'

export default function Create() {
  const admin = useAdmin()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [captainId, setCaptainId] = useState<string | null>(null)

  const [result, submit, pending] = useActionState(async () => {
    try {
      const { slug } = await createSquad(admin?.id ?? '', { name, description, captainId: captainId ?? '' })
      navigate(`/admin/squads/${slug}`)
      return null
    } catch (e) {
      return errorMessage(e)
    }
  }, null)

  useDebugActions('Novo squad', [
    { label: 'Preencher válido', run: () => { setName('Portal de Eventos'); setDescription('Inscrições e check-in dos eventos presenciais.') } },
    { label: 'Nome repetido (erro esperado)', run: () => { setName('Loja Comunitária'); setDescription('Duplicado de propósito.') } },
    { label: 'Capitão sem GitHub (erro esperado)', run: () => { setName('Squad sem GitHub'); setDescription('Capitão sem GitHub vinculado.'); setCaptainId('u3') } },
  ])

  return (
    <div className="admin-squad-create">
      <PageHeader title="Novo squad" description="O squad nasce inativo e fica ativo quando recebe um projeto." />
      <Card>
        <form action={submit} className="admin-squad-create__form">
          <Field id="name" label="Nome">
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field id="description" label="Descrição">
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
          <CaptainField value={captainId} onChange={setCaptainId} hint="Opcional agora; sem capitão o squad é uma vacancy." />
          <FormMessage tone="error">{result}</FormMessage>
          <div>
            <Button type="submit" loading={pending}>
              Criar squad
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
