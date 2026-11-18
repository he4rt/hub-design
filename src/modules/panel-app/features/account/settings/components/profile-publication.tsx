import { useState, useTransition } from 'react'
import { Link } from 'react-router'
import { FormMessage } from '@/components/form-message'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import type { User } from '@/mocks/db'
import { errorMessage } from '@/mocks/mock-action'
import { setProfilePublished } from '../actions'
import './profile-publication.css'

/** "Publicar meu perfil": off by default, with the profile link and a copy button. */
export function ProfilePublication({ account }: { account: User }) {
  const [saving, startSaving] = useTransition()
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null)
  const path = `/members/${account.username}`

  return (
    <Card>
      <div className="profile-publication__switch">
        <Switch
          id="publish-profile"
          checked={account.published}
          disabled={saving}
          onCheckedChange={(published) =>
            startSaving(async () => {
              try {
                await setProfilePublished(account.id, published)
                setMessage(null)
              } catch (e) {
                setMessage({ tone: 'error', text: errorMessage(e) })
              }
            })
          }
        />
        <Label htmlFor="publish-profile">Publicar meu perfil</Label>
      </div>
      <p className="profile-publication__hint">
        {account.published
          ? 'Qualquer pessoa com o link vê seu perfil. Ponto de partida e data de nascimento nunca aparecem.'
          : 'Seu perfil é privado: quem abrir o link vê só "Este perfil é privado".'}
      </p>
      <div className="profile-publication__link">
        <Link to={path} className="profile-publication__url" title={path}>
          {path}
        </Link>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={async () => {
            await navigator.clipboard?.writeText(`${window.location.origin}${path}`).catch(() => undefined)
            setMessage({ tone: 'success', text: 'Link copiado.' })
          }}
        >
          Copiar link
        </Button>
      </div>
      <FormMessage tone={message?.tone ?? 'success'}>{message?.text}</FormMessage>
    </Card>
  )
}
