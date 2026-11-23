import { useActionState, useId, useState } from 'react'
import { useNavigate } from 'react-router'
import { FormMessage } from '@/components/form-message'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { RadioCard, RadioCards } from '@/components/ui/radio-cards'
import { ORIGIN_IN, PROVIDERS } from '@/lib/member-profile'
import { slugify } from '@/lib/text'
import { newId, useDb, type SocialProvider } from '@/mocks/db'
import { errorMessage } from '@/mocks/mock-action'
import { githubOAuthUrl } from '@/modules/panel-app/lib/github-oauth'
import { providerLabel, socialLogin, type SocialIdentity } from '../actions'
import { ProviderIcon } from './provider-icon'
import './social-login.css'

/**
 * Discord, GitHub and Google buttons. GitHub goes to GitHub for real; Discord and Google open a dialog
 * that stands in for the provider's consent screen.
 */
export function SocialLogin({ verb, redirectTo }: { verb: 'Entrar' | 'Cadastrar'; redirectTo: string }) {
  return (
    <div className="social-login">
      {PROVIDERS.map(({ value, label }) =>
        value === 'github' ? (
          <Button key={value} asChild variant="secondary" className="social-login__button">
            <a href={githubOAuthUrl('login', redirectTo)}>
              <ProviderIcon provider={value} />
              {verb} com {label}
            </a>
          </Button>
        ) : (
          <Dialog key={value}>
            <DialogTrigger asChild>
              <Button type="button" variant="secondary" className="social-login__button">
                <ProviderIcon provider={value} />
                {verb} com {label}
              </Button>
            </DialogTrigger>
            <ProviderDialog provider={value} redirectTo={redirectTo} />
          </Dialog>
        ),
      )}
    </div>
  )
}

const NEW_IDENTITY_NAMES: Record<SocialProvider, string> = {
  discord: 'Lia Ferreira',
  github: 'Rafa Prado',
  google: 'Marina Duarte',
}

type Identity = SocialIdentity & { key: string; hint: string }

/** Mounted only while the dialog is open, so its choice resets on every open. */
function ProviderDialog({ provider, redirectTo }: { provider: SocialProvider; redirectTo: string }) {
  const navigate = useNavigate()
  const formId = useId()
  const label = providerLabel(provider)
  const users = useDb((state) => state.users)
  const [newEmail] = useState(() => `${slugify(NEW_IDENTITY_NAMES[provider])}.${newId()}@${provider}.mock`)
  const [choice, setChoice] = useState('new')

  const identities: Identity[] = [
    {
      key: 'new',
      name: NEW_IDENTITY_NAMES[provider],
      email: newEmail,
      emailVerified: true,
      handle: slugify(NEW_IDENTITY_NAMES[provider]),
      hint: 'E-mail sem conta He4rt: segue para o cadastro.',
    },
    ...users.map((user) => ({
      key: user.id,
      name: user.name,
      email: user.email,
      emailVerified: true,
      handle: user.username,
      hint: user.linkedAccounts.some((account) => account.provider === provider)
        ? `${label} já vinculado a esta conta.`
        : `E-mail confirmado de uma conta criada ${ORIGIN_IN[user.origin]}: o ${label} é vinculado a ela.`,
    })),
    ...users
      .filter((user) => !user.linkedAccounts.some((account) => account.provider === provider))
      .slice(0, 1)
      .map((user) => ({
        key: `unverified-${user.id}`,
        name: user.name,
        email: user.email,
        emailVerified: false,
        handle: user.username,
        hint: `O ${label} não confirmou este e-mail: pede a senha da conta antes de vincular.`,
      })),
  ]

  const [error, submit, pending] = useActionState(async () => {
    const { key: _key, hint: _hint, ...identity } = identities.find((item) => item.key === choice) ?? identities[0]
    try {
      const result = await socialLogin(provider, identity)
      const redirect = redirectTo === '/app' ? '' : `redirect=${encodeURIComponent(redirectTo)}`
      if (result.status === 'needs-sign-up') navigate(`/app/register${redirect && `?${redirect}`}`)
      else if (result.status === 'needs-password') {
        navigate(`/app/login?email=${encodeURIComponent(result.email)}${redirect && `&${redirect}`}`)
      } else navigate(result.needsOnboarding ? '/app/onboarding' : redirectTo)
      return null
    } catch (e) {
      return errorMessage(e)
    }
  }, null)

  return (
    <DialogContent
      title={`${label} (simulado)`}
      description={`Este protótipo não fala com o ${label} de verdade. Escolha a conta que ele devolve.`}
      footer={
        <>
          <DialogClose asChild>
            <Button type="button" variant="ghost" disabled={pending}>
              Cancelar
            </Button>
          </DialogClose>
          <Button type="submit" form={formId} loading={pending}>
            Autorizar
          </Button>
        </>
      }
    >
      <form id={formId} action={submit} className="social-login__form">
        {/* React resets the form after a submit; Radix answers with an empty value, which is never a real choice. */}
        <RadioCards value={choice} onValueChange={(value) => value && setChoice(value)} aria-label={`Conta do ${label}`}>
          {identities.map((identity) => (
            <RadioCard
              key={identity.key}
              value={identity.key}
              label={`${identity.name} (${identity.email})`}
              description={identity.hint}
              title={identity.email}
            />
          ))}
        </RadioCards>
        <FormMessage tone="error">{error}</FormMessage>
      </form>
    </DialogContent>
  )
}
