import type { ReactNode } from 'react'
import { Outlet } from 'react-router'
import { BrandMark } from '@/components/brand-mark'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import './auth-layout.css'

/** Centered card for guest screens of /app and /admin: login, sign-up, password reset. */
export function AuthLayout({ badge, wide = false }: { badge?: ReactNode; wide?: boolean }) {
  return (
    <main className="auth-layout" data-width={wide ? 'wide' : undefined}>
      <div className="auth-layout__brand">
        <BrandMark to="/" />
        {badge && <Badge variant="neutral">{badge}</Badge>}
      </div>
      <Card className="auth-layout__card">
        <Outlet />
      </Card>
    </main>
  )
}
