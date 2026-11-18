import { Link, Outlet } from 'react-router'
import { Card } from '@/components/ui/card'
import './auth-layout.css'

export function AuthLayout() {
  return (
    <main className="auth-layout">
      <Link to="/" className="auth-layout__brand">
        He4rt Hub
      </Link>
      <Card className="auth-layout__card">
        <Outlet />
      </Card>
    </main>
  )
}
