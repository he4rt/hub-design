import { useState, useTransition } from 'react'
import { FormMessage } from '@/components/form-message'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { User } from '@/mocks/db'
import { errorMessage } from '@/mocks/mock-action'
import { sendEmailVerification } from '../actions'
import './email-reminder.css'

/** Optional e-mail confirmation, beside the Feed until the member confirms it. */
export function EmailReminder({ account }: { account: User }) {
  const [sending, startSending] = useTransition()
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null)

  return (
    <Card className="email-reminder">
      <h2>Confirme seu e-mail</h2>
      <p>
        Para recuperar a conta com facilidade: <strong title={account.email}>{account.email}</strong>. É opcional.
      </p>
      <Button
        variant="secondary"
        size="sm"
        loading={sending}
        onClick={() =>
          startSending(async () => {
            try {
              await sendEmailVerification(account.id)
              setMessage({ tone: 'success', text: 'Enviamos um novo link.' })
            } catch (e) {
              setMessage({ tone: 'error', text: errorMessage(e) })
            }
          })
        }
      >
        Reenviar link
      </Button>
      <FormMessage tone={message?.tone ?? 'success'}>{message?.text}</FormMessage>
    </Card>
  )
}
