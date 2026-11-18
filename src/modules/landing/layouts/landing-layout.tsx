import { Link, Outlet } from 'react-router'
import { Button } from '@/components/ui/button'
import { useDb } from '@/mocks/db'
import './landing-layout.css'

export function LandingLayout() {
  const signedIn = useDb((db) => db.session !== null)

  return (
    <div className="landing-layout">
      <header className="landing-layout__header">
        <Link to="/" className="landing-layout__brand">
          He4rt Hub
        </Link>
        <nav>
          <Button asChild variant="ghost">
            <Link to="/squads">Squads</Link>
          </Button>
          {signedIn ? (
            <Button asChild>
              <Link to="/app">Ir para o Hub</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost">
                <Link to="/app/login">Entrar</Link>
              </Button>
              <Button asChild>
                <Link to="/app/register">Criar conta</Link>
              </Button>
            </>
          )}
        </nav>
      </header>
      <div className="landing-layout__content">
        <Outlet />
      </div>
      <footer className="landing-layout__footer">
        <span>He4rt Developers · da comunidade para a comunidade</span>
        <Link to="/admin/login">Administração</Link>
      </footer>
    </div>
  )
}
