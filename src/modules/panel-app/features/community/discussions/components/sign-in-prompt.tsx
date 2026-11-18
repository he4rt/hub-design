import { Link, useLocation } from 'react-router'
import { LogIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import './sign-in-prompt.css'

/** Visitors read the forum; answering or opening a discussion needs an account, and comes back here after it. */
export function SignInPrompt({ children }: { children: string }) {
  const { pathname, search } = useLocation()
  const back = encodeURIComponent(pathname + search)

  return (
    <Card className="sign-in-prompt">
      <p>
        <LogIn size={16} aria-hidden />
        {children}
      </p>
      <div className="sign-in-prompt__actions">
        <Button asChild size="sm">
          <Link to={`/app/login?redirect=${back}`}>Entrar</Link>
        </Button>
        <Button asChild variant="secondary" size="sm">
          <Link to={`/app/register?redirect=${back}`}>Criar perfil</Link>
        </Button>
      </div>
    </Card>
  )
}
