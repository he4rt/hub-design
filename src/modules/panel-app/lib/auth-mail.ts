/** Shared by authentication and reminders; installed only by the API, never with browser tokens. */
export type AuthMailPurpose = 'password-reset' | 'email-verification'
export type AuthMailIdentity = { id: string; email: string }
export type AuthMailGateway = {
  ready: () => void
  request: (purpose: AuthMailPurpose, user: AuthMailIdentity) => void
  consume: (purpose: AuthMailPurpose, token: string, users: AuthMailIdentity[], apply: (user: AuthMailIdentity) => void) => void
}

let gateway: AuthMailGateway | undefined

export function installAuthMailGateway(next: AuthMailGateway) {
  gateway = next
}

export function authMailGateway(): AuthMailGateway {
  if (!gateway) throw new Error('O serviço de e-mail não está disponível.')
  gateway.ready()
  return gateway
}
