import type { ReactNode } from 'react'
import { Link, Outlet } from 'react-router'
import { Card } from '@/components/ui/card'
import './auth-layout.css'

/** Centered card for guest screens of /app and /admin: login, sign-up, password reset. */
export function AuthLayout({ badge, wide = false }: { badge?: ReactNode; wide?: boolean }) {
  return (
    <main className="auth-layout" data-width={wide ? 'wide' : undefined}>
      <Link to="/" className="auth-layout__brand">
        He4rt Hub
        {badge && <span className="auth-layout__badge">{badge}</span>}
      </Link>
      <Card className="auth-layout__card">
        <Outlet />
      </Card>
    </main>
  )
}
