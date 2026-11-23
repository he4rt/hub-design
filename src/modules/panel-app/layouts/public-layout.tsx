import { Link, NavLink, Outlet, useLocation } from 'react-router'
import { BrandMark } from '@/components/brand-mark'
import { Button } from '@/components/ui/button'
import { useAccount } from '@/modules/panel-app/hooks/use-account'
import { ThemeToggle } from '@/modules/panel-app/components/theme-toggle'
import './public-layout.css'

/**
 * Pages of /app that visitors read without signing in, such as a member's public profile.
 * The page is the focus, so the account actions stay quiet.
 */
export function PublicLayout() {
  const account = useAccount()
  const { pathname, search } = useLocation()

  return (
    <div className="public-layout">
      <header className="public-layout__header">
        <BrandMark to="/" />
        <nav className="public-layout__nav" aria-label="Seções">
          <NavLink to="/app/discussions">Fórum</NavLink>
        </nav>
        <nav className="public-layout__actions" aria-label="Conta">
          <ThemeToggle />
          {account ? (
            <Button asChild variant="ghost" size="sm">
              <Link to="/app">Ir para o painel</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to={`/app/login?redirect=${encodeURIComponent(pathname + search)}`}>Entrar</Link>
              </Button>
              <Button asChild variant="secondary" size="sm">
                <Link to="/app/register">Criar perfil</Link>
              </Button>
            </>
          )}
        </nav>
      </header>
      <main className="public-layout__content">
        <Outlet />
      </main>
    </div>
  )
}
