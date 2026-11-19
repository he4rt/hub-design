import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/cn'
import './sidebar-nav.css'

/**
 * The ink sidebar of the design system, shared by /app and /admin. Items are `NavLink`s with the
 * `sidebar-nav__item` class inside a `SidebarGroup`; `collapsed` shows icons only on wide screens.
 * On a phone it stacks above the content and its navigation scrolls sideways.
 */
export function SidebarNav({ collapsed = false, className, ...props }: ComponentProps<'aside'> & { collapsed?: boolean }) {
  return <aside data-collapsed={collapsed || undefined} className={cn('sidebar-nav', className)} {...props} />
}

/** Top row: the brand mark and, optionally, a control beside it. */
export function SidebarTop({ children }: { children: ReactNode }) {
  return <div className="sidebar-nav__top">{children}</div>
}

/** The groups, between the top row and the footer. */
export function SidebarGroups({ children }: { children: ReactNode }) {
  return <nav className="sidebar-nav__groups">{children}</nav>
}

/** A group with its label in normal case; contextual groups (captain, validator) only render for the role. */
export function SidebarGroup({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <div className="sidebar-nav__group" role="group" aria-label={label}>
      {label && (
        <span className="sidebar-nav__label" title={label}>
          {label}
        </span>
      )}
      {children}
    </div>
  )
}

/** Bottom of the sidebar: the signed-in person and the account actions. */
export function SidebarFooter({ children }: { children: ReactNode }) {
  return <div className="sidebar-nav__footer">{children}</div>
}
