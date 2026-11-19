import { useState, useTransition } from 'react'
import { FormMessage } from '@/components/form-message'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { areaLabels, LINKED_PROVIDERS } from '@/lib/member-profile'
import type { LinkedProvider, User } from '@/mocks/db'
import { errorMessage } from '@/mocks/mock-action'
import { canUnlink } from '@/modules/panel-app/lib/linked-accounts'
import { connectAccount, disconnectAccount, resolveGithubSuggestion } from '../actions'
import './linked-accounts.css'

/** GitHub, Discord, Google and LinkedIn: connect and disconnect, never the only login. */
export function LinkedAccounts({ account }: { account: User }) {
  const [busy, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function run(task: () => Promise<unknown>) {
    startTransition(async () => {
      try {
        await task()
        setError(null)
      } catch (e) {
        setError(errorMessage(e))
      }
    })
  }

  const suggestion = account.githubSuggestion

  return (
    <Card>
      <h2 className="linked-accounts__title">Contas vinculadas</h2>
      <ul className="linked-accounts">
        {LINKED_PROVIDERS.map(({ value, label }) => {
          const linked = account.linkedAccounts.find((a) => a.provider === value)
          return (
            <li key={value} className="linked-accounts__row">
              <div className="linked-accounts__info">
                <strong>{label}</strong>
                <span title={linked?.handle}>{linked ? `@${linked.handle}` : 'Não vinculado'}</span>
              </div>
              {linked ? (
                canUnlink(account, value) ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    onClick={() => run(() => disconnectAccount(account.id, value))}
                  >
                    Desconectar
                  </Button>
                ) : (
                  <span className="linked-accounts__only">Único login</span>
                )
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={busy}
                  onClick={() => run(() => connectAccount(account.id, value as LinkedProvider, account.username))}
                >
                  Conectar
                </Button>
              )}
            </li>
          )
        })}
      </ul>
      {suggestion && (
        <Card variant="inset" className="linked-accounts__suggestion">
          <p>
            Pelos seus repositórios no GitHub, sugerimos
            {suggestion.areas.length > 0 && <> as áreas <strong>{areaLabels(suggestion.areas)}</strong></>}
            {suggestion.areas.length > 0 && suggestion.languages.length > 0 && ' e'}
            {suggestion.languages.length > 0 && <> as linguagens <strong>{suggestion.languages.join(', ')}</strong></>}.
          </p>
          <div className="linked-accounts__suggestion-actions">
            <Button
              variant="secondary"
              size="sm"
              disabled={busy}
              onClick={() => run(() => resolveGithubSuggestion(account.id, true))}
            >
              Adicionar ao perfil
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => run(() => resolveGithubSuggestion(account.id, false))}
            >
              Descartar
            </Button>
          </div>
        </Card>
      )}
      <FormMessage tone="error">{error}</FormMessage>
    </Card>
  )
}
