import { useState } from 'react'
import { Check, Copy, Share2 } from 'lucide-react'
import { FormMessage } from '@/components/form-message'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import './share-profile-button.css'

type Result = { ok: boolean; message: string } | null

/** Shares the profile link: the address in an inset block and a copy button. */
export function ShareProfileButton({ handle }: { handle: string }) {
  const [result, setResult] = useState<Result>(null)
  const [url, setUrl] = useState('')

  function onOpenChange(open: boolean) {
    setResult(null)
    if (open) setUrl(`${window.location.origin}/members/${handle}`)
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url)
      setResult({ ok: true, message: 'Link copiado.' })
    } catch {
      setResult({ ok: false, message: 'Não deu para copiar. Selecione o link e copie.' })
    }
  }

  return (
    <Popover onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="profile-header__icon-button" aria-label="Compartilhar" title="Compartilhar">
          <Share2 size={16} aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" aria-label="Compartilhar perfil" className="share-profile">
        <p className="share-profile__title">Compartilhar perfil</p>
        <div className="share-profile__url">
          <code title={url}>{url}</code>
          <Button variant="ghost" size="sm" onClick={copyLink} aria-label="Copiar link">
            {result?.ok ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
          </Button>
        </div>
        {/* The check on the button confirms the copy; only a failure needs words. */}
        {result?.ok === false && <FormMessage tone="error">{result.message}</FormMessage>}
      </PopoverContent>
    </Popover>
  )
}
