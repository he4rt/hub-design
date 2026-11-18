import { Link, Outlet } from 'react-router'
import { Button } from '@/components/ui/button'
import './landing-layout.css'

export function LandingLayout() {
  return (
    <div className="landing-layout">
      <header className="landing-layout__header">
        <Link to="/" className="landing-layout__brand">
          He4rt Hub
        </Link>
        <nav>
          <Button asChild variant="ghost">
            <Link to="/admin">Admin</Link>
          </Button>
          <Button asChild>
            <Link to="/app">Entrar</Link>
          </Button>
        </nav>
      </header>
      <Outlet />
    </div>
  )
}
